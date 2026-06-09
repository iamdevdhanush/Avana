import json
import logging
import re
from typing import Optional

from openai import OpenAI

from app.config.settings import get_settings

logger = logging.getLogger("avana.openai")

CLASSIFICATION_PROMPT = """Analyze this safety report and return ONLY valid JSON with no additional text.
Response MUST be valid JSON matching this exact format:
{
    "category": "(crime | suspicious | infrastructure | emergency | other)",
    "severity": "(low | medium | high)",
    "summary": "short 1-line summary of the incident"
}

Rules:
- category: crime (criminal activity), suspicious (unusual behavior), infrastructure (road/utility issues), emergency (immediate danger), other
- severity: low (minor), medium (concerning), high (urgent/dangerous)
- summary: Maximum 15 words, factual and concise

Report: """

VALID_CATEGORIES = {"crime", "suspicious", "infrastructure", "emergency", "other"}
VALID_SEVERITIES = {"low", "medium", "high"}


def _get_client() -> Optional[OpenAI]:
    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not configured")
        return None
    return OpenAI(api_key=settings.openai_api_key)


def _parse_classification(raw: str) -> dict:
    """Parse and validate the JSON response from OpenAI."""
    text = raw.strip()
    if text.startswith("```json"):
        text = re.sub(r"^```json\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    elif text.startswith("```"):
        text = re.sub(r"^```\n?", "", text)
        text = re.sub(r"\n?```$", "", text)

    parsed = json.loads(text)

    if not all(k in parsed for k in ("category", "severity", "summary")):
        raise ValueError("Invalid AI response: missing required fields")

    if parsed["category"] not in VALID_CATEGORIES:
        parsed["category"] = "other"
    if parsed["severity"] not in VALID_SEVERITIES:
        parsed["severity"] = "low"

    return parsed


async def classify_report(user_input: str) -> dict:
    """Classify a safety report using OpenAI GPT-4o-mini."""
    client = _get_client()
    if client is None:
        raise RuntimeError("OpenAI client not available — set OPENAI_API_KEY")

    logger.info("Classifying report (length: %d)", len(user_input))

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a safety report classification AI. Always return valid JSON only.",
                },
                {"role": "user", "content": CLASSIFICATION_PROMPT + user_input},
            ],
            temperature=0.3,
            max_tokens=150,
        )

        raw = completion.choices[0].message.content
        logger.debug("Raw OpenAI response: %s", raw[:200])

        result = _parse_classification(raw)
        logger.info("Classification successful: %s", result)
        return result

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse OpenAI response as JSON: %s", exc)
        raise RuntimeError(f"AI response parsing error: {exc}") from exc
    except Exception as exc:
        logger.exception("OpenAI classification failed")
        raise RuntimeError(f"Classification error: {exc}") from exc
