from pydantic import BaseModel, Field, RootModel
from typing import Optional


class RiskRequest(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    time: Optional[str] = Field(None, description="ISO timestamp for time-of-day evaluation")


class RiskResponse(BaseModel):
    risk: str = Field(..., description="LOW | MEDIUM | HIGH")
    reason: str = Field(..., description="Human-readable reason")
    timestamp: str = Field(..., description="ISO timestamp")


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float


class SOSRequest(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    userId: Optional[str] = Field(None, description="Authenticated user ID")


class SOSResponse(BaseModel):
    success: bool
    message: str
    alertId: int
    timestamp: str


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|model)$")
    text: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")
    history: Optional[list[ChatMessage]] = Field(None, description="Conversation history (max 10)")


class ChatResponse(BaseModel):
    success: bool
    reply: str


class ChatErrorResponse(BaseModel):
    success: bool = False
    error: str
    reply: str


class ChatTestResponse(BaseModel):
    success: bool
    apiKeyConfigured: bool = False
    apiKeyPreview: str = ""
    model: str = ""
    pythonVersion: str = ""
    timestamp: str = ""
    testMessage: Optional[str] = None
    testResponse: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    time: str
    uptime: float


class AnalyzeReportRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Report text to classify")


class AnalyzeReportResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    processingTime: Optional[str] = None


class ReportListResponse(BaseModel):
    success: bool
    data: list[dict]
    count: int


class ErrorResponse(BaseModel):
    error: str
