import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_role
from app.database import get_db
from app.schemas.pme import AdminBusinessListData, AdminBusinessListItem
from app.schemas.response import APIResponse
from app.services.pme_portal import list_admin_businesses, update_business_validation_status


router = APIRouter()


@router.get("/pme", response_model=APIResponse[AdminBusinessListData])
async def read_admin_businesses(
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    _principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminBusinessListData]:
    payload = await list_admin_businesses(db=db, status_filter=status, search=q)
    return APIResponse(success=True, message="Liste des PME recuperee.", data=payload)


@router.patch("/pme/{business_uuid}/approve", response_model=APIResponse[AdminBusinessListItem])
async def approve_business(
    business_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminBusinessListItem]:
    payload = await update_business_validation_status(
        db=db,
        business_uuid=business_uuid,
        action="approve",
        admin_user_id=int(principal.uid) if principal.uid is not None else None,
    )
    return APIResponse(success=True, message="PME validee.", data=payload)


@router.patch("/pme/{business_uuid}/reject", response_model=APIResponse[AdminBusinessListItem])
async def reject_business(
    business_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminBusinessListItem]:
    payload = await update_business_validation_status(
        db=db,
        business_uuid=business_uuid,
        action="reject",
        admin_user_id=int(principal.uid) if principal.uid is not None else None,
    )
    return APIResponse(success=True, message="PME rejetee.", data=payload)


@router.patch("/pme/{business_uuid}/disable", response_model=APIResponse[AdminBusinessListItem])
async def disable_business(
    business_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["ADMIN"])),
) -> APIResponse[AdminBusinessListItem]:
    payload = await update_business_validation_status(
        db=db,
        business_uuid=business_uuid,
        action="disable",
        admin_user_id=int(principal.uid) if principal.uid is not None else None,
    )
    return APIResponse(success=True, message="PME desactivee.", data=payload)

