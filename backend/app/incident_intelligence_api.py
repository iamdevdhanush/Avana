"""
Drop-in replacement for the standalone incident-intelligence-api.js service.

Exposes the same API endpoints on port 3001 for analyzing and listing
safety reports via OpenAI classification and Supabase persistence.

Usage:
    python -m app.incident_intelligence_api
"""
import logging
import time
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.services.openai_service import classify_report
from app.services.supabase_service import insert_report, fetch_reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("incident-intelligence")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Incident Intelligence API starting on port 3001")
    yield
    logger.info("Incident Intelligence API shutting down")


app = FastAPI(
    title="Avana Incident Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str = Field(..., min_length=1)


class AnalyzeResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None
    processingTime: str | None = None


class ReportsResponse(BaseModel):
    success: bool
    data: list[dict]
    count: int


@app.post("/api/analyze-report", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest):
    start = time.time()
    try:
        classification = await classify_report(body.text)

        try:
            record = await insert_report(
                text=body.text,
                category=classification["category"],
                severity=classification["severity"],
                summary=classification["summary"],
            )
        except RuntimeError as db_err:
            logger.warning("DB insert failed: %s", db_err)
            record = {
                "id": body.id,
                "text": body.text,
                "category": classification["category"],
                "severity": classification["severity"],
                "summary": classification["summary"],
                "created_at": datetime.now().isoformat(),
            }

        elapsed = time.time() - start
        return AnalyzeResponse(
            success=True,
            data=record,
            processingTime=f"{elapsed:.2f}s",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/api/reports", response_model=ReportsResponse)
async def list_reports(limit: int = 50):
    try:
        records = await fetch_reports(limit=limit)
        return ReportsResponse(success=True, data=records, count=len(records))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/api/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "supabase": "configured" if settings.supabase_url else "missing",
        "openai": "configured" if settings.openai_api_key else "missing",
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.incident_intelligence_api:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
    )
