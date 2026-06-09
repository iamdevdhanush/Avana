import pytest
from app.services.gemini_service import (
    check_api_key,
    _build_contents,
    _safety_settings,
    send_message,
    test_connection,
)


def test_check_api_key_empty():
    result = check_api_key()
    assert isinstance(result, tuple)
    assert len(result) == 2


def test_build_contents_no_history():
    contents = _build_contents("Hello")
    assert len(contents) == 3
    assert contents[0]["role"] == "user"
    assert contents[1]["role"] == "model"
    assert contents[2]["role"] == "user"
    assert contents[2]["parts"][0]["text"] == "Hello"


def test_build_contents_with_history():
    history = [
        {"role": "user", "text": "First"},
        {"role": "assistant", "text": "Second"},
    ]
    contents = _build_contents("Hello", history)
    assert len(contents) == 5
    assert contents[2]["parts"][0]["text"] == "First"
    assert contents[3]["parts"][0]["text"] == "Second"


def test_build_contents_strips_message():
    contents = _build_contents("  Hello World  ")
    assert contents[-1]["parts"][0]["text"] == "Hello World"


def test_build_contents_respects_max_history():
    history = [{"role": "user", "text": f"Msg {i}"} for i in range(20)]
    contents = _build_contents("Final", history)
    assert len(contents) == 13


def test_safety_settings():
    settings = _safety_settings()
    assert len(settings) == 4
    categories = {s["category"] for s in settings}
    assert "HARM_CATEGORY_HARASSMENT" in categories
    assert "HARM_CATEGORY_HATE_SPEECH" in categories
    assert "HARM_CATEGORY_SEXUALLY_EXPLICIT" in categories
    assert "HARM_CATEGORY_DANGEROUS_CONTENT" in categories


@pytest.mark.asyncio
async def test_send_message_no_key():
    result = await send_message("Hello")
    assert result["success"] is False
    assert "error" in result


@pytest.mark.asyncio
async def test_test_connection_no_key():
    result = await test_connection()
    assert "apiKeyConfigured" in result
    assert "apiKeyPreview" in result
