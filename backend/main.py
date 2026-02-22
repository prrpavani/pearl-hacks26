"""
Pearl Hacks 2026 — Backend
"""

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------

import io
import os
from fastapi import UploadFile, File
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from dotenv import load_dotenv

from database import (
    setup_indexes,
    close_client,
    get_leaderboard,
    create_tenant,
    upload_image_to_tenant,
    vote_on_image,
    verify_image_if_threshold,
    get_tenants_col,
    get_verified_col,
    seed_static_images,
    remove_stale_images,
    reset_image_votes,
)

from solana_service import send_devnet_sol, PAYOUT_LAMPORTS, LAMPORTS_PER_SOL
from ai_service import get_tip_audio, get_financial_tip_text


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv()

print("SOLANA_PUBLIC_KEY:", os.getenv("SOLANA_PUBLIC_KEY"))

PAYOUT_SOL = PAYOUT_LAMPORTS / LAMPORTS_PER_SOL


# ---------------------------------------------------------------------------
# App Lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    try:
        await setup_indexes()
        # Ensure the 'Instagram' tenant exists
        tenants_col = get_tenants_col()
        existing = await tenants_col.find_one({"tenant_name": "Instagram"})
        if not existing:
            await create_tenant("Instagram", threshold=5)
        # Seed hardcoded images+labels into the tenant (idempotent)
        from static_labels import STATIC_IMAGE_LABELS
        added = await seed_static_images("Instagram", STATIC_IMAGE_LABELS)
        if added:
            logging.info(f"Seeded {added} static image(s) into 'Instagram' tenant")
        # Remove MongoDB entries for any images no longer physically on disk
        # (covers both static images deleted from uploads/ and admin-uploaded ones)
        _up = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(_up, exist_ok=True)
        disk_filenames = [f for f in os.listdir(_up) if os.path.isfile(os.path.join(_up, f))]
        removed = await remove_stale_images("Instagram", disk_filenames)
        if removed:
            logging.info(f"Removed {removed} stale image(s) from 'Instagram' tenant")
    except Exception as exc:
        logging.warning(f"Startup setup failed: {exc}")
    yield
    await close_client()


# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------

from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Pearl Hacks Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS: explicit origins (required when using credentials)
_CORS_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
]


async def _cors_force_middleware(request, call_next):
    """Ensure CORS headers are on every response (including 5xx and OPTIONS) so browser doesn't block."""
    origin = (request.headers.get("origin") or "").strip()
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": origin if origin in _CORS_ORIGINS else _CORS_ORIGINS[0],
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            },
        )
    response = await call_next(request)
    if origin in _CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


app.add_middleware(CORSMiddleware, allow_origins=_CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"], expose_headers=["*"])
app.middleware("http")(_cors_force_middleware)

# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LabelTaskResponse(BaseModel):
    task_id: str
    image_url: str
    options: list[str]
    ground_truth: str


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



# New: Accept file upload, save to /uploads, store static URL

# Accept multiple files in a single request
from typing import List

@app.post("/tenant/upload-image")
async def api_upload_image(tenant_name: str = Form(...), files: List[UploadFile] = File(...)):
    uploaded = []
    for file in files:
        filename = file.filename
        save_path = os.path.join(UPLOAD_DIR, filename)
        # Ensure unique filename
        base, ext = os.path.splitext(filename)
        i = 1
        while os.path.exists(save_path):
            filename = f"{base}_{i}{ext}"
            save_path = os.path.join(UPLOAD_DIR, filename)
            i += 1
        with open(save_path, "wb") as f:
            content = await file.read()
            f.write(content)
        image_url = f"/uploads/{filename}"
        await upload_image_to_tenant(tenant_name, image_url)
        uploaded.append(image_url)
    return {"status": "uploaded", "tenant_name": tenant_name, "image_urls": uploaded}


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


@app.get("/label/next-task", response_model=LabelTaskResponse)
async def api_next_label_task(
    request: Request,
    tenant_name: str = "Instagram",
    exclude: str = "",
):
    """
    Returns the next unverified image for labeling (skipping any in exclude).
    exclude: comma-separated image_url paths already answered this session (e.g. /uploads/a.jpg,/uploads/b.jpg).
    """
    import logging
    import random

    exclude_set = {u.strip() for u in exclude.split(",") if u.strip()}

    try:
        tenant = await get_tenants_col().find_one({"tenant_name": tenant_name})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        for img in tenant["uploaded_images"]:
            if not img.get("verified_label") and img["image_url"] not in exclude_set:
                break
        else:
            raise HTTPException(status_code=404, detail="No unverified images left")

        rel_url = img["image_url"]  # e.g. /uploads/foo.jpg
        base = str(request.base_url).rstrip("/")
        absolute_url = f"{base}{rel_url}"

        filename = rel_url.replace("/uploads/", "").strip("/")
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {filename}")

        # Labels must be pre-stored via static_labels.py — no Gemini fallback.
        if not img.get("ground_truth") or not img.get("wrong_options"):
            raise HTTPException(
                status_code=500,
                detail=f"No labels configured for image: {filename}. Add it to static_labels.py and restart.",
            )
        ground_truth = img["ground_truth"]
        wrong = img["wrong_options"]

        options = [ground_truth] + wrong
        random.shuffle(options)

        return LabelTaskResponse(
            task_id=rel_url,
            image_url=absolute_url,
            options=options,
            ground_truth=ground_truth,
        )
    except HTTPException:
        raise
    except ValueError as e:
        logging.exception("Label task error")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logging.exception("Label task error")
        raise HTTPException(status_code=500, detail="Internal error loading task")


@app.post("/label/submit")
async def api_submit_label(
    tenant_name: str = Form(...),
    image_url: str = Form(...),
    label: str = Form(...),
    wallet_address: str = Form(...),
):
    import logging

    try:
        await vote_on_image(tenant_name, image_url, label)
        verified_label = await verify_image_if_threshold(tenant_name, image_url)
        tx_signature = await send_devnet_sol(wallet_address)
        return {
            "status": "submitted",
            "image_url": image_url,
            "label": label,
            "verified_label": verified_label,
            "tx_signature": tx_signature,
            "payout_sol": PAYOUT_SOL,
        }
    except Exception as e:
        logging.exception("label/submit error")
        raise HTTPException(status_code=502, detail=str(e))


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


# ---------------------------------------------------------------------------
# Admin APIs
# ---------------------------------------------------------------------------

@app.post("/admin/upload")
async def admin_upload_image(
    tenant_name: str = Form(...),
    file: UploadFile = File(...),
    ground_truth: str = Form(...),
    wrong_option_1: str = Form(...),
    wrong_option_2: str = Form(...),
    wrong_option_3: str = Form(...),
):
    """Upload a single labeled image for the labeling workflow."""
    filename = file.filename or "image"
    save_path = os.path.join(UPLOAD_DIR, filename)
    base, ext = os.path.splitext(filename)
    i = 1
    while os.path.exists(save_path):
        filename = f"{base}_{i}{ext}"
        save_path = os.path.join(UPLOAD_DIR, filename)
        i += 1
    with open(save_path, "wb") as f:
        f.write(await file.read())

    image_url = f"/uploads/{filename}"
    wrong_options = [wrong_option_1.strip(), wrong_option_2.strip(), wrong_option_3.strip()]
    await upload_image_to_tenant(
        tenant_name, image_url,
        ground_truth=ground_truth.strip(),
        wrong_options=wrong_options,
    )
    return {
        "status": "uploaded",
        "image_url": image_url,
        "ground_truth": ground_truth.strip(),
        "wrong_options": wrong_options,
    }


@app.get("/admin/images")
async def admin_get_images(tenant_name: str = "Instagram"):
    """Return all images for a tenant with full vote data."""
    tenant = await get_tenants_col().find_one({"tenant_name": tenant_name})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    threshold = tenant.get("threshold", 5)
    images = []
    for img in tenant.get("uploaded_images", []):
        images.append({
            "image_url": img["image_url"],
            "ground_truth": img.get("ground_truth"),
            "wrong_options": img.get("wrong_options", []),
            "votes": img.get("votes", {}),
            "verified_label": img.get("verified_label"),
            "total_votes": sum(img.get("votes", {}).values()),
            "threshold": threshold,
        })
    return {"images": images, "threshold": threshold}


@app.post("/admin/simulate-votes")
async def admin_simulate_votes(
    tenant_name: str = Form(...),
    image_url: str = Form(...),
    count: int = Form(5),
):
    """Add N simulated crowd votes to an image (60% weighted toward ground truth)."""
    import random

    tenant = await get_tenants_col().find_one({"tenant_name": tenant_name})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    img = next((i for i in tenant["uploaded_images"] if i["image_url"] == image_url), None)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found in tenant")

    ground_truth = img.get("ground_truth")
    wrong_options = img.get("wrong_options", [])
    all_options = ([ground_truth] if ground_truth else []) + wrong_options
    if not all_options:
        raise HTTPException(status_code=400, detail="Image has no labels configured")

    weights = [
        0.6 if opt == ground_truth else (0.4 / max(len(wrong_options), 1))
        for opt in all_options
    ]

    already_verified = img.get("verified_label") is not None
    for _ in range(count):
        chosen = random.choices(all_options, weights=weights, k=1)[0]
        await vote_on_image(tenant_name, image_url, chosen)

    verified_label = img.get("verified_label")
    if not already_verified:
        verified_label = await verify_image_if_threshold(tenant_name, image_url)

    return {"status": "simulated", "votes_added": count, "verified_label": verified_label}


@app.post("/admin/reset-votes")
async def admin_reset_votes(
    tenant_name: str = Form(...),
    image_url: str = Form(...),
):
    """Reset votes and verified status so an image re-appears in the Earn tab."""
    found = await reset_image_votes(tenant_name, image_url)
    if not found:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"status": "reset", "image_url": image_url}