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


async def get_tip_audio() -> tuple[str, bytes]:
    """
    Convenience wrapper used by the FastAPI route.
    Returns (tip_text, mp3_bytes).
    """
    tip_text = await get_financial_tip_text()
    audio_bytes = await text_to_speech_bytes(tip_text)
    return tip_text, audio_bytes
