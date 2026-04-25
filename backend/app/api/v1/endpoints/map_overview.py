from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.map_overview import MapOverviewData
from app.schemas.response import APIResponse
from app.services.map_overview import get_map_overview


router = APIRouter()


@router.get("/overview", response_model=APIResponse[MapOverviewData])
async def read_map_overview(
    db: AsyncSession = Depends(get_db),
    window: str = Query(default="7d"),
    risk: str = Query(default="all"),
    category: str | None = Query(default=None),
) -> APIResponse[MapOverviewData]:
    payload = await get_map_overview(db=db, window=window, risk=risk, category=category)
    return APIResponse(success=True, message="Vue cartographique recuperee.", data=payload)
