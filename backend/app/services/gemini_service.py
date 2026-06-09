import logging
import time
from typing import Optional

import httpx

from app.config.settings import get_settings

logger = logging.getLogger("avana.gemini")

SYSTEM_PROMPT = """You are Avana AI — a women's safety assistant built into the Avana safety app.

Your role:
- Help women in unsafe situations with CLEAR, CALM, ACTIONABLE advice
- Give safety tips, emergency guidance, escape routes, and legal steps
- Assist with app navigation (SOS, map, community, profile)
- Keep responses SHORT (4-5 lines max) and practical

Rules:
- Never ask for personal information
- Never give medical or legal advice — direct to professionals
- Always prioritize immediate physical safety
- If someone is in danger, tell them to call 112 or use the SOS button
- Be empathetic but action-oriented
- Use Indian emergency numbers (112, 181 Women Helpline, 100 Police)"""


def _build_contents(message: str, history: Optional[list[dict]] = None) -> list[dict]:
    contents = [
        {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
        {
            "role": "model",
            "parts": [
                {
                    "text": "I understand. I am Avana AI, your safety assistant. How can I help you stay safe?"
                }
            ],
        },
    ]
    if history:
        recent = history[-10:]
        for msg in recent:
            role = "model" if msg.get("role") in ("assistant", "model") else "user"
            if msg.get("text"):
                contents.append({"role": role, "parts": [{"text": msg["text"]}]})
    contents.append({"role": "user", "parts": [{"text": message.strip()}]})
    return contents


def _safety_settings() -> list[dict]:
    return [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
    ]


def check_api_key() -> tuple[bool, str]:
    """Check if GEMINI_API_KEY is configured and not a placeholder."""
    settings = get_settings()
    key = settings.gemini_api_key
    if not key:
        return False, "NOT SET"
    if key == "your-gemini-api-key-here":
        return False, "PLACEHOLDER"
    return True, key[:10] + "..."


async def send_message(
    message: str, history: Optional[list[dict]] = None
) -> dict:
    """
    Send a message to Gemini API and return the response.

    Returns dict with keys: success (bool), reply (str), error (str, optional).
    """
    settings = get_settings()

    configured, preview = check_api_key()
    if not configured:
        logger.error("GEMINI_API_KEY is not configured (%s)", preview)
        return {
            "success": False,
            "reply": "AI assistant is not configured. For immediate safety, call emergency services (112) or a trusted person.",
            "error": "API key not configured",
        }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )

    contents = _build_contents(message, history)

    payload = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 500,
            "temperature": 0.7,
            "topP": 0.9,
            "topK": 40,
        },
        "safetySettings": _safety_settings(),
    }

    logger.info("Sending request to Gemini API (message length: %d)", len(message))

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            start = time.time()
            response = await client.post(url, json=payload)
            elapsed = time.time() - start
            logger.info("Gemini response received in %.2fms (status: %d)", elapsed * 1000, response.status_code)

        if not response.is_success:
            error_body = response.text
            logger.error("Gemini API error %d: %s", response.status_code, error_body[:200])
            return {
                "success": False,
                "reply": "Sorry, I couldn't respond right now. For immediate help, call 112 or use the SOS button.",
                "error": f"API error: {response.status_code}",
            }

        data = response.json()

        if "error" in data:
            logger.error("Gemini API returned error: %s", data["error"])
            return {
                "success": False,
                "reply": "Sorry, I couldn't respond right now. For immediate help, call 112.",
                "error": data["error"].get("message", "API error"),
            }

        candidate = data.get("candidates", [None])[0]
        if not candidate:
            block_reason = data.get("promptFeedback", {}).get("blockReason")
            if block_reason:
                logger.error("Content blocked by safety filter: %s", block_reason)
                return {
                    "success": False,
                    "reply": "I'm unable to respond to that. Please try a different question or call 112 for immediate help.",
                    "error": f"Content blocked: {block_reason}",
                }
            logger.error("No candidates in Gemini response")
            return {
                "success": False,
                "reply": "I couldn't generate a response. Please try again, or call 112 for immediate help.",
                "error": "No response generated",
            }

        finish = candidate.get("finishReason", "STOP")
        if finish not in ("STOP", "MAX_TOKENS"):
            logger.warning("Unusual finish reason: %s", finish)

        ai_text = (
            candidate.get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        if not ai_text:
            logger.error("No text in Gemini response parts")
            return {
                "success": False,
                "reply": "I couldn't generate a response. Please try again, or call 112 for immediate help.",
                "error": "Empty response",
            }

        logger.info("Gemini success (response: %.0f chars)", len(ai_text))
        return {"success": True, "reply": ai_text.strip()}

    except httpx.TimeoutException:
        logger.error("Gemini request timed out")
        return {
            "success": False,
            "reply": "Response took too long. Please try again.",
            "error": "Request timeout",
        }
    except Exception as exc:
        logger.exception("Gemini request failed")
        return {
            "success": False,
            "reply": "Sorry, I couldn't respond. Try again or call emergency services (112).",
            "error": str(exc),
        }


async def test_connection() -> dict:
    """Test the Gemini API connection with a simple message."""
    settings = get_settings()
    configured, preview = check_api_key()

    result = {
        "apiKeyConfigured": configured,
        "apiKeyPreview": preview,
        "model": settings.gemini_model,
        "pythonVersion": "",
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

    if not configured:
        result["error"] = "GEMINI_API_KEY not configured"
        return result

    import platform
    result["pythonVersion"] = platform.python_version()

    test_message = 'Say "Hello, Avana is working!" in one short sentence.'

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": test_message}]}],
        "generationConfig": {"maxOutputTokens": 100},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)

        if not response.is_success:
            error_text = response.text
            logger.error("Gemini test failed: %d %s", response.status_code, error_text[:200])
            result["success"] = False
            result["error"] = f"API test failed: {response.status_code}"
            result["details"] = error_text[:500]
            return result

        data = response.json()
        test_response = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        if not test_response:
            result["success"] = False
            result["error"] = "No response from API"
            result["fullResponse"] = data
            return result

        result["success"] = True
        result["testMessage"] = test_message
        result["testResponse"] = test_response
        return result

    except Exception as exc:
        logger.exception("Gemini test exception")
        result["success"] = False
        result["error"] = str(exc)
        return result
