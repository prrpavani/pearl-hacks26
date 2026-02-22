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

LABEL_PROMPT = """Look at this image. Your task:
1. Give ONE short classification label for what is shown (e.g. "black ballpoint pen", "golden retriever", "red sports car"). Put it in "ground_truth".
2. Give exactly 3 other short labels that are WRONG for this image but sound plausible (same style). Put them in "wrong_options".

Reply with ONLY a single JSON object, no other text, no markdown, no code fences. Use double quotes. Example:
{"ground_truth": "black ballpoint pen", "wrong_options": ["wooden pencil", "blue marker", "keyboard"]}"""


def _extract_json_text(data: dict) -> tuple[str | None, str]:
    """
    Get raw text from Gemini generateContent response.
    Returns (text, debug_info). Iterates ALL parts (vision can put text in parts[1] etc.).
    """
    candidates = data.get("candidates") or []
    if not candidates:
        reason = data.get("promptFeedback", {}).get("blockReason") or "no candidates"
        return None, f"candidates empty ({reason})"
    c0 = candidates[0]
    content = c0.get("content")
    if not content:
        return None, "candidates[0].content missing"
    parts = content.get("parts") or []
    if not parts:
        finish = c0.get("finishReason")
        return None, f"parts empty (finishReason={finish})"
    for i, part in enumerate(parts):
        text = (part.get("text") or part.get("content") or "").strip()
        if text:
            return text, f"from parts[{i}]"
    # Some APIs return flattened text at top level
    flat = (data.get("text") or "").strip()
    if flat:
        return flat, "from top-level text"
    return None, "no part with text"


def _parse_gemini_label_response(data: dict) -> dict:
    """Extract JSON from Gemini response and return ground_truth + wrong_options."""
    import re
    import json as _json

    text, debug = _extract_json_text(data)
    if not text:
        # Log structure to diagnose API shape changes
        try:
            cand0 = (data.get("candidates") or [None])[0]
            parts = (cand0.get("content") or {}).get("parts", []) if isinstance(cand0, dict) else []
            part_keys = [list(p.keys()) for p in parts[:3]] if parts else []
            logging.warning(
                "Gemini label response: no text (%s). candidates[0].content.parts[*].keys=%s",
                debug,
                part_keys,
            )
        except Exception:
            pass
        return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}

    # Strip markdown code block if present (```json ... ``` or ``` ... ```)
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1).strip()
        else:
            text = text.replace("```", "").strip()

    # Find outermost {...} by brace matching
    start = text.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    text = text[start : i + 1]
                    break

    try:
        out = _json.loads(text)
    except _json.JSONDecodeError as e:
        # Retry after stripping trailing comma (common model mistake)
        text_clean = re.sub(r",\s*}", "}", text)
        text_clean = re.sub(r",\s*]", "]", text_clean)
        try:
            out = _json.loads(text_clean)
        except _json.JSONDecodeError:
            logging.warning(
                "Gemini label JSON decode error: %s at pos %s text=%r",
                e.msg,
                e.pos,
                text[:300] if text else "",
            )
            return {"ground_truth": "unknown", "wrong_options": ["Option A", "Option B", "Option C"]}

    # Accept multiple key names (API might return camelCase or variants)
    ground = (
        out.get("ground_truth")
        or out.get("groundTruth")
        or out.get("label")
        or out.get("correct_label")
        or "unknown"
    )
    if not isinstance(ground, str):
        ground = str(ground) if ground else "unknown"
    ground = ground.strip() or "unknown"

    wrong = (
        out.get("wrong_options")
        or out.get("wrongOptions")
        or out.get("incorrect_options")
        or out.get("options")
        or []
    )
    if not isinstance(wrong, list):
        wrong = []
    wrong = [str(x).strip() for x in wrong if x][:3]
    if len(wrong) < 3:
        wrong = wrong + ["Option A", "Option B", "Option C"]
    wrong = wrong[:3]

    return {"ground_truth": ground, "wrong_options": wrong}


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
            "maxOutputTokens": 512,
            # Note: responseMimeType "application/json" is intentionally omitted —
            # when set, Gemini returns empty parts on MAX_TOKENS instead of text.
            # The parser handles plain-text JSON robustly.
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ],
    }

    # Try 2.0-flash first (most reliable for vision+JSON), then 1.5-flash fallback.
    # Also fall through if the parsed result is the default "unknown" (model returned empty).
    for model in ("gemini-2.0-flash", "gemini-1.5-flash"):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{url}?key={api_key}", headers=headers, json=payload)
            if resp.status_code == 200:
                result = _parse_gemini_label_response(resp.json())
                if result["ground_truth"] != "unknown":
                    return result
                logging.warning(f"Gemini {model} returned unknown label, trying next model")
            else:
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
