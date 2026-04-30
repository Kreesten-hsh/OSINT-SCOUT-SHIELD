from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.mobile import MobileBootstrapData, MobileHistoryData
from app.schemas.response import APIResponse
from app.services.mobile_history import fetch_mobile_history, get_mobile_bootstrap_payload


router = APIRouter()


@router.get("/bootstrap", response_model=APIResponse[MobileBootstrapData])
async def mobile_bootstrap():
    return APIResponse(
        success=True,
        message="Bootstrap mobile charge.",
        data=get_mobile_bootstrap_payload(),
    )


@router.get("/history", response_model=APIResponse[MobileHistoryData])
async def mobile_history(
    device_install_id: str = Query(..., min_length=3, max_length=128),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    data = await fetch_mobile_history(
        db=db,
        device_install_id=device_install_id,
        limit=limit,
    )
    return APIResponse(
        success=True,
        message="Historique mobile charge.",
        data=data,
    )
