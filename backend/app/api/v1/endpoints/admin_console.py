from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_role
from app.database import get_db
from app.schemas.admin_console import AdminDashboardData, AdminTransmissionListData
from app.schemas.response import APIResponse
from app.services.admin_console import (
    build_admin_csv_export,
    build_admin_stix_lite_export,
    get_admin_dashboard,
    list_admin_transmissions,
)


router = APIRouter()


@router.get("/dashboard", response_model=APIResponse[AdminDashboardData])
async def read_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminDashboardData]:
    payload = await get_admin_dashboard(db=db)
    return APIResponse(success=True, message="Tableau de bord national recupere.", data=payload)


@router.get("/transmissions", response_model=APIResponse[AdminTransmissionListData])
async def read_admin_transmissions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status: str | None = Query(default=None),
    target: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminTransmissionListData]:
    payload = await list_admin_transmissions(
        db=db,
        skip=skip,
        limit=limit,
        status_filter=status,
        target_filter=target,
        search=q,
    )
    return APIResponse(success=True, message="Transmissions externes recuperees.", data=payload)


@router.post("/exports/csv")
async def export_admin_csv(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ADMIN"])),
) -> Response:
    filename, content = await build_admin_csv_export(db=db)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/exports/stix-lite")
async def export_admin_stix_lite(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ADMIN"])),
) -> Response:
    filename, content = await build_admin_stix_lite_export(db=db)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
