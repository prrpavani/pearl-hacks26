"""
AI service: Gemini generates image tasks and financial tips; ElevenLabs voices the tips.

Environment variables:
    GEMINI_API_KEY       – Google AI Studio key
    ELEVENLABS_API_KEY   – ElevenLabs API key
    ELEVENLABS_VOICE_ID  – Voice ID to use (default: "onwK4e9ZLuTAKqWW03F9")
"""

import os
import json
import httpx
from dotenv import load_dotenv
import google.generativeai as genai  # type: ignore

load_dotenv()

# ---------------------------------------------------------------------------
# Gemini setup
# ---------------------------------------------------------------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
_gemini_model = genai.GenerativeModel("gemini-1.5-flash")

# ---------------------------------------------------------------------------
# ElevenLabs setup
# ---------------------------------------------------------------------------
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")
ELEVENLABS_TTS_URL = (
    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
)

# ---------------------------------------------------------------------------
# Image labeling task generation
# ---------------------------------------------------------------------------

_TASK_PROMPT = (
    "You are generating a single image-labeling task for a crowdsourcing platform. "
    "Pick a real, publicly accessible image URL (from Wikimedia Commons, Unsplash, or similar) "
    "and create a simple classification question around it. "
    "Return ONLY valid JSON with exactly these fields:\n"
    "{\n"
    '  "image_url": "<direct image URL>",\n'
    '  "options": ["<choice1>", "<choice2>", "<choice3>", "<choice4>"],\n'
    '  "correct_answer": "<one of the options>"\n'
    "}\n"
    "Rules:\n"
    "- image_url must be a direct link to a publicly viewable image (jpg/png/webp).\n"
    "- options must have exactly 4 choices.\n"
    "- correct_answer must exactly match one of the options.\n"
    "- Do not include any explanation or text outside the JSON."
)


async def generate_image_task() -> dict:
    """
    Asks Gemini to produce an image-labeling task.
    Returns a dict with keys: image_url, options, correct_answer.
    Raises ValueError if the response cannot be parsed.
    """
    response = _gemini_model.generate_content(_TASK_PROMPT)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    task = json.loads(raw)

    required = {"image_url", "options", "correct_answer"}
    if not required.issubset(task.keys()):
        raise ValueError(f"Gemini response missing required fields: {task}")
    if not isinstance(task["options"], list) or len(task["options"]) != 4:
        raise ValueError(f"options must be a list of 4 items, got: {task['options']}")
    if task["correct_answer"] not in task["options"]:
        raise ValueError(
            f"correct_answer '{task['correct_answer']}' not in options {task['options']}"
        )

    return {
        "image_url": task["image_url"],
        "options": task["options"],
        "correct_answer": task["correct_answer"],
    }


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
