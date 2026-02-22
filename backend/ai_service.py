"""
AI service: Gemini generates image tasks and financial tips; ElevenLabs voices the tips.

Environment variables:
    GEMINI_API_KEY       – Google AI Studio key
    ELEVENLABS_API_KEY   – ElevenLabs API key
    ELEVENLABS_VOICE_ID  – Voice ID to use (default: "onwK4e9ZLuTAKqWW03F9")
"""

import json
import logging
import os
import random

import httpx
from dotenv import load_dotenv
import google.generativeai as genai  # type: ignore

load_dotenv()

# ---------------------------------------------------------------------------
# Gemini setup
# ---------------------------------------------------------------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
_gemini_model = genai.GenerativeModel("gemini-2.0-flash")

# ---------------------------------------------------------------------------
# ElevenLabs setup
# ---------------------------------------------------------------------------
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")
ELEVENLABS_TTS_URL = (
    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
)

# ---------------------------------------------------------------------------
# Image labeling task pool — add your tasks here
# Each entry needs: image_url, options (list of 4), correct_answer
# ---------------------------------------------------------------------------

_TASK_POOL = [
    # ── ADD YOUR TASKS BELOW ──────────────────────────────────────────────
    {
        "image_url": "https://example.com/your-image.jpg",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
    },
    # ── ADD MORE TASKS ABOVE ──────────────────────────────────────────────
]


async def generate_image_task() -> dict:
    """Picks a random task from the hardcoded pool."""
    return dict(random.choice(_TASK_POOL))


# ---------------------------------------------------------------------------
# Financial tip generation
# ---------------------------------------------------------------------------

GEMINI_PROMPT = (
    "Give me exactly one short, punchy sentence (under 20 words) that teaches "
    "a beginner something surprising or valuable about earning, saving, or "
    "investing in crypto or Web3. Be specific — mention real numbers or "
    "protocol names when possible. Do not use quotation marks."
)


async def get_financial_tip_text() -> str:
    """Returns a single-sentence financial tip from Gemini."""
    response = _gemini_model.generate_content(GEMINI_PROMPT)
    return response.text.strip()


async def text_to_speech_bytes(text: str) -> bytes:
    """
    Calls ElevenLabs TTS and returns raw MP3 bytes.
    """
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.8,
            "style": 0.2,
            "use_speaker_boost": True,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream("POST", ELEVENLABS_TTS_URL, headers=headers, json=payload) as r:
            r.raise_for_status()
            return await r.aread()


# ---------------------------------------------------------------------------
# Image labeling: ground truth + 3 wrong options (Gemini 2.5 Flash vision)
# ---------------------------------------------------------------------------

LABEL_PROMPT = (
    "Look at this image and choose a single, clear classification label (one short phrase, e.g. 'red car', 'golden retriever'). "
    "Then invent 3 other labels that are clearly wrong but plausible-sounding (same style, wrong for this image). "
    "Return valid JSON only, no markdown, with this exact structure: "
    '{"ground_truth": "your one label", "wrong_options": ["wrong1", "wrong2", "wrong3"]}.'
)


def _parse_gemini_label_response(data: dict) -> dict:
    """Extract JSON text from Gemini response and return ground_truth + wrong_options."""
    import json as _json

    try:
        candidates = data.get("candidates") or []
        if not candidates:
            return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}
        parts = (candidates[0].get("content") or {}).get("parts") or []
        if not parts:
            return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}
        text = (parts[0].get("text") or "").strip()
        if not text:
            return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}
        # Strip markdown code fence if present
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        out = _json.loads(text)
        ground = out.get("ground_truth") or "unknown"
        wrong = out.get("wrong_options") or []
        if len(wrong) < 3:
            wrong = (wrong + ["Option A", "Option B", "Option C"])[:3]
        return {"ground_truth": ground, "wrong_options": wrong[:3]}
    except Exception as e:
        logging.warning(f"Gemini response parse error: {e}")
        return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}


async def get_label_and_wrong_options(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Uses Gemini to classify the image and return ground truth + 3 wrong options.
    Tries gemini-2.5-flash then gemini-2.0-flash. Returns: {"ground_truth": str, "wrong_options": [str, str, str]}
    """
    import base64

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": b64}},
                    {"text": LABEL_PROMPT},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
            "responseMimeType": "application/json",
        },
    }

    # Try 2.5 first, then 2.0 (2.5 may not be available for all keys)
    for model in ("gemini-2.5-flash", "gemini-2.0-flash"):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{url}?key={api_key}", headers=headers, json=payload)
            if resp.status_code == 200:
                return _parse_gemini_label_response(resp.json())
            logging.warning(f"Gemini {model} response: {resp.status_code} {resp.text[:500]}")

    raise ValueError("Gemini request failed for all models")


async def get_tip_audio() -> tuple[str, bytes]:
    """
    Convenience wrapper used by the FastAPI route.
    Returns (tip_text, mp3_bytes).
    """
    tip_text = await get_financial_tip_text()
    audio_bytes = await text_to_speech_bytes(tip_text)
    return tip_text, audio_bytes
