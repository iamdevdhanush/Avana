import time
from datetime import datetime

import fastapi
from app.models.schemas import HealthResponse

router = fastapi.APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_root():
    return HealthResponse(
        status="ok",
        time=datetime.now().isoformat(),
        uptime=time.time() - START_TIME,
    )


@router.get("/api/health", response_model=HealthResponse, include_in_schema=False)
async def health_api():
    return await health_root()
