import fastapi
from app.data.zones import heatmap_points

router = fastapi.APIRouter(prefix="/api", tags=["Heatmap"])


@router.get("/heatmap")
async def get_heatmap():
    return [list(p.values()) for p in heatmap_points]
