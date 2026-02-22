"""
Pearl Hacks 2026 — Backend
"""

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------

import uuid
import io
import os
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

from database import (
    setup_indexes,
    close_client,
    create_task,
    get_and_delete_task,
    check_duplicate,
    store_submission,
    get_leaderboard,
    create_tenant,
    upload_image_to_tenant,
    vote_on_image,
    verify_image_if_threshold,
    get_tenants_col,
    get_verified_col,
)

from solana_service import send_devnet_sol, PAYOUT_LAMPORTS, LAMPORTS_PER_SOL
from ai_service import generate_image_task, get_tip_audio, get_financial_tip_text


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv()

print("SOLANA_PUBLIC_KEY:", os.getenv("SOLANA_PUBLIC_KEY"))

PAYOUT_SOL = PAYOUT_LAMPORTS / LAMPORTS_PER_SOL
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# App Lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await setup_indexes()
    except Exception as exc:
        import logging
        logging.warning(
            f"MongoDB index setup failed (will retry on first request): {exc}"
        )
    yield
    await close_client()


# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Pearl Hacks Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS FIXED FOR LOCAL DEV
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
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
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# SOL Balance (Hardened)
# ---------------------------------------------------------------------------

@app.get("/sol-balance")
async def sol_balance():
    from sol_balance_api import get_sol_balance

    pubkey = os.getenv("SOLANA_PUBLIC_KEY")
    if not pubkey:
        raise HTTPException(status_code=500, detail="SOLANA_PUBLIC_KEY not set")

    try:
        balance = get_sol_balance(pubkey)  # NO await
        return {"balance": balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Tenant APIs
# ---------------------------------------------------------------------------

@app.post("/tenant/create")
async def api_create_tenant(tenant_name: str = Form(...), threshold: int = Form(5)):
    await create_tenant(tenant_name, threshold)
    return {"status": "created", "tenant_name": tenant_name}


@app.post("/tenant/upload-image")
async def api_upload_image(tenant_name: str = Form(...), image_url: str = Form(...)):
    await upload_image_to_tenant(tenant_name, image_url)
    return {"status": "uploaded", "tenant_name": tenant_name, "image_url": image_url}


@app.get("/tenant/images")
async def api_get_images(tenant_name: str):
    tenant = await get_tenants_col().find_one({"tenant_name": tenant_name})
    return {"images": tenant["uploaded_images"] if tenant else []}


@app.get("/verified")
async def api_get_verified():
    cursor = get_verified_col().find()
    images = []
    async for doc in cursor:
        images.append(doc)
    return {"verified_images": images}


# ---------------------------------------------------------------------------
# Labeling Workflow
# ---------------------------------------------------------------------------

@app.get("/label/next-image")
async def api_next_image(tenant_name: str):
    tenant = await get_tenants_col().find_one({"tenant_name": tenant_name})
    if not tenant:
        return {"image_url": None}

    for img in tenant["uploaded_images"]:
        if not img.get("verified_label"):
            return {"image_url": img["image_url"]}
    return {"image_url": None}


@app.post("/label/submit")
async def api_submit_label(
    tenant_name: str = Form(...),
    image_url: str = Form(...),
    label: str = Form(...),
    wallet_address: str = Form(...),
):
    await vote_on_image(tenant_name, image_url, label)
    verified_label = await verify_image_if_threshold(tenant_name, image_url)

    tx_signature = await send_devnet_sol(wallet_address, PAYOUT_SOL)

    return {
        "status": "submitted",
        "image_url": image_url,
        "label": label,
        "verified_label": verified_label,
        "tx_signature": tx_signature,
    }


# ---------------------------------------------------------------------------
# Gemini Options
# ---------------------------------------------------------------------------

@app.post("/label/options")
async def api_generate_options(image_url: str = Form(...)):
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}
    gemini_url = (
        "https://generativelanguage.googleapis.com/v1/models/"
        "gemini-1.5-pro-latest:generateContent"
    )

    prompt = (
        f"Classify this image and provide the ground truth label, "
        f"plus 3 plausible but incorrect options. "
        f"Return as JSON: "
        f"{{'ground_truth': 'cat', "
        f"'options': ['cat', 'dog', 'frog', 'car']}}. "
        f"Image URL: {image_url}"
    )

    data = {"contents": [{"parts": [{"text": prompt}]}]}

    async with httpx.AsyncClient() as client:
        resp = await client.post(gemini_url, headers=headers, json=data)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=resp.text)

        result = resp.json()
        import json
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)


# ---------------------------------------------------------------------------
# Task Generation
# ---------------------------------------------------------------------------

@app.post("/generate-task", response_model=GenerateTaskResponse)
async def generate_task():
    task_data = await generate_image_task()

    task_id = str(uuid.uuid4())

    await create_task(
        task_id=task_id,
        image_url=task_data["image_url"],
        options=task_data["options"],
        correct_answer=task_data["correct_answer"],
    )

    return GenerateTaskResponse(
        task_id=task_id,
        image_url=task_data["image_url"],
        options=task_data["options"],
    )


@app.post("/submit-task", response_model=TaskResponse)
async def submit_task(body: TaskSubmission):
    if await check_duplicate(body.wallet_address, body.task_id):
        raise HTTPException(status_code=409, detail="Already submitted.")

    task = await get_and_delete_task(body.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task expired.")

    is_correct = body.label.strip().lower() == task["correct_answer"].strip().lower()

    tx_sig = None
    payout_sol = 0.0

    if is_correct:
        try:
            tx_sig = await send_devnet_sol(body.wallet_address)
            payout_sol = PAYOUT_SOL
        except Exception:
            pass

    submission_id = await store_submission(
        wallet_address=body.wallet_address,
        task_id=body.task_id,
        label=body.label,
        is_correct=is_correct,
        payout_sol=payout_sol,
        tx_signature=tx_sig,
    )

    return TaskResponse(
        success=True,
        submission_id=submission_id,
        is_correct=is_correct,
        payout_sol=payout_sol,
        tx_signature=tx_sig,
        message="Correct!" if is_correct else "Incorrect.",
    )


@app.get("/leaderboard")
async def leaderboard(limit: int = 10):
    entries = await get_leaderboard(limit=min(limit, 100))
    return {"leaderboard": entries}


@app.get("/get-tip")
async def get_tip():
    tip_text, audio_bytes = await get_tip_audio()

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
    tip_text = await get_financial_tip_text()
    return {"tip": tip_text}