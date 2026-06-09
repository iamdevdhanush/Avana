import fastapi
from app.models.schemas import RiskRequest, RiskResponse
from app.services.risk_service import calculate_risk_level

router = fastapi.APIRouter(prefix="/api", tags=["Risk"])


@router.post("/risk", response_model=RiskResponse)
async def assess_risk(body: RiskRequest):
    return calculate_risk_level(body.lat, body.lng, body.time)


@router.post("/assess-risk", response_model=RiskResponse, include_in_schema=False)
async def assess_risk_alias(body: RiskRequest):
    return await assess_risk(body)
