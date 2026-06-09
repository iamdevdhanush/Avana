import logging

import fastapi
from app.models.schemas import (
    ChatRequest, ChatResponse, ChatErrorResponse, ChatTestResponse,
)
from app.services.gemini_service import send_message, test_connection

logger = logging.getLogger("avana.chat")

router = fastapi.APIRouter(prefix="/api", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse | ChatErrorResponse)
async def chat(body: ChatRequest):
    history_list = []
    if body.history:
        history_list = [m.model_dump() for m in body.history]

    result = await send_message(body.message, history=history_list)

    if result.get("success"):
        return ChatResponse(success=True, reply=result["reply"])
    else:
        return ChatErrorResponse(
            success=False,
            error=result.get("error", "Unknown error"),
            reply=result.get("reply", ""),
        )


@router.get("/chat/test", response_model=ChatTestResponse)
async def test_chat():
    result = await test_connection()
    return ChatTestResponse(
        success=result.get("success", False),
        apiKeyConfigured=result.get("apiKeyConfigured", False),
        apiKeyPreview=result.get("apiKeyPreview", ""),
        model=result.get("model", ""),
        pythonVersion=result.get("pythonVersion", ""),
        timestamp=result.get("timestamp", ""),
        testMessage=result.get("testMessage"),
        testResponse=result.get("testResponse"),
        error=result.get("error"),
    )
