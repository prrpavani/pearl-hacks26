"""
Pearl Hacks 2026 — Backend
FastAPI server exposing:
    POST /generate-task  – LLM generates an image-labeling task; stored server-side
    POST /submit-task    – validate label, record submission, pay out Devnet SOL if correct
    GET  /leaderboard    – top wallets by total SOL earned
    GET  /get-tip        – Gemini tip + ElevenLabs MP3 audio stream
    GET  /get-tip/text   – tip text only (no audio)
"""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
import io

from database import (
    setup_indexes,
    close_client,
    create_task,
    get_and_delete_task,
    check_duplicate,
    store_submission,
    get_leaderboard,
)
from solana_service import send_devnet_sol, PAYOUT_LAMPORTS, LAMPORTS_PER_SOL
from ai_service import generate_image_task, get_tip_audio, get_financial_tip_text

PAYOUT_SOL = PAYOUT_LAMPORTS / LAMPORTS_PER_SOL


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await setup_indexes()  # create indexes on startup (idempotent)
    except Exception as exc:
        # Log but don't crash — indexes will be created on first successful connection
        import logging
        logging.warning(f"MongoDB index setup failed (will retry on first request): {exc}")
    yield
    await close_client()   # clean up Mongo connection on shutdown


app = FastAPI(
    title="Pearl Hacks Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskSubmission(BaseModel):
    wallet_address: str
    task_id: str
    label: str

    @field_validator("wallet_address")
    @classmethod
    def wallet_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("wallet_address must not be empty")
        return v

    @field_validator("task_id", "label")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("field must not be empty")
        return v


class TaskResponse(BaseModel):
    success: bool
    submission_id: str
    is_correct: bool
    payout_sol: float
    tx_signature: str | None
    message: str


class GenerateTaskResponse(BaseModel):
    task_id: str
    image_url: str
    options: list[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/generate-task", response_model=GenerateTaskResponse)
async def generate_task():
    """
    Asks Gemini to produce an image-labeling task, persists it server-side
    (with TTL), and returns the task_id + image_url + options to the frontend.
    The correct_answer is NEVER sent to the client.
    """
    try:
        task_data = await generate_image_task()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}") from exc

    task_id = str(uuid.uuid4())

    try:
        await create_task(
            task_id=task_id,
            image_url=task_data["image_url"],
            options=task_data["options"],
            correct_answer=task_data["correct_answer"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

    return GenerateTaskResponse(
        task_id=task_id,
        image_url=task_data["image_url"],
        options=task_data["options"],
    )


@app.post("/submit-task", response_model=TaskResponse)
async def submit_task(body: TaskSubmission):
    """
    1. Check for duplicate submission (same wallet + task_id).
    2. Fetch and consume the task from DB; verify the submitted label.
    3. If correct, send a Devnet SOL micro-payout.
    4. Persist the submission record and return the result.
    """
    # 1. Duplicate check
    if await check_duplicate(body.wallet_address, body.task_id):
        raise HTTPException(
            status_code=409,
            detail="This wallet has already submitted this task.",
        )

    # 2. Fetch and consume task (atomic find-and-delete)
    task = await get_and_delete_task(body.task_id)
    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found or has expired. Please generate a new task.",
        )

    is_correct = body.label.strip().lower() == task["correct_answer"].strip().lower()

    # 3. Solana payout (only if correct)
    tx_sig: str | None = None
    payout_sol = 0.0
    if is_correct:
        try:
            tx_sig = await send_devnet_sol(body.wallet_address)
            payout_sol = PAYOUT_SOL
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Payout error: {exc}") from exc

    # 4. Persist submission
    try:
        submission_id = await store_submission(
            wallet_address=body.wallet_address,
            task_id=body.task_id,
            label=body.label,
            is_correct=is_correct,
            payout_sol=payout_sol,
            tx_signature=tx_sig,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

    message = (
        f"Correct! Earned {payout_sol} SOL. Tx: {tx_sig[:12]}…"
        if is_correct
        else "Incorrect — better luck next time!"
    )

    return TaskResponse(
        success=True,
        submission_id=submission_id,
        is_correct=is_correct,
        payout_sol=payout_sol,
        tx_signature=tx_sig,
        message=message,
    )


@app.get("/leaderboard")
async def leaderboard(limit: int = 10):
    """Returns the top wallets ranked by total SOL earned."""
    try:
        entries = await get_leaderboard(limit=min(limit, 100))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc
    return {"leaderboard": entries}


@app.get("/get-tip")
async def get_tip():
    """
    Generates a financial tip with Gemini, converts it to speech with
    ElevenLabs, and streams the MP3 audio back to the client.

    Response headers include:
        X-Tip-Text  – the plain-text tip so the frontend can show it as a caption
    """
    try:
        tip_text, audio_bytes = await get_tip_audio()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}") from exc

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={
            "X-Tip-Text": tip_text,
            "Cache-Control": "no-store",
        },
    )


@app.get("/get-tip/text")
async def get_tip_text_only():
    """Returns only the tip text (no audio)."""
    try:
        tip_text = await get_financial_tip_text()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc
    return {"tip": tip_text}
