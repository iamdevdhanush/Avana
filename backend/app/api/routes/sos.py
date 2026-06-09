import logging
from datetime import datetime

import fastapi
from app.models.schemas import SOSRequest, SOSResponse

logger = logging.getLogger("avana.sos")
alert_counter: int = 0

router = fastapi.APIRouter(prefix="/api", tags=["SOS"])


def _create_sos_response(lat: float, lng: float, user_id: str | None = None) -> SOSResponse:
    global alert_counter
    alert_counter += 1
    alert_id = alert_counter

    logger.info(
        "SOS ALERT #%d | lat=%.4f lng=%.4f userId=%s",
        alert_id, lat, lng, user_id or "anonymous",
    )

    return SOSResponse(
        success=True,
        message="Emergency services have been notified",
        alertId=alert_id,
        timestamp=datetime.now().isoformat(),
    )


@router.post("/sos", response_model=SOSResponse)
async def sos_alert(body: SOSRequest):
    return _create_sos_response(body.lat, body.lng, body.userId)


@router.post("/sos-alert", response_model=SOSResponse, include_in_schema=False)
async def sos_alert_alias(body: SOSRequest):
    return await sos_alert(body)
