import logging
import time
from datetime import datetime

import fastapi
from fastapi import HTTPException

from app.models.schemas import (
    AnalyzeReportRequest,
    AnalyzeReportResponse,
    ReportListResponse,
    ErrorResponse,
)
from app.services.openai_service import classify_report
from app.services.supabase_service import insert_report, fetch_reports

logger = logging.getLogger("avana.reports")

router = fastapi.APIRouter(prefix="/api", tags=["Reports"])


@router.post(
    "/analyze-report",
    response_model=AnalyzeReportResponse,
    responses={503: {"model": ErrorResponse}},
)
async def analyze_report(body: AnalyzeReportRequest):
    start_time = time.time()
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
            logger.warning("Failed to persist report to database: %s", db_err)
            record = {
                "id": None,
                "text": body.text,
                "category": classification["category"],
                "severity": classification["severity"],
                "summary": classification["summary"],
                "created_at": datetime.now().isoformat(),
            }

        elapsed = time.time() - start_time
        logger.info("Report analyzed in %.2fs", elapsed)

        return AnalyzeReportResponse(
            success=True,
            data=record,
            processingTime=f"{elapsed:.2f}s",
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"error": str(exc)})


@router.get("/reports", response_model=ReportListResponse)
async def list_reports(limit: int = 50):
    try:
        records = await fetch_reports(limit=limit)
        return ReportListResponse(success=True, data=records, count=len(records))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"error": str(exc)})
