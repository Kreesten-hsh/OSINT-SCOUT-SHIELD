from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_active_principal, require_role
from app.database import get_db
from app.schemas.pme import (
    PmeBundleListData,
    PmeDashboardData,
    PmeIncidentListData,
    PmeProfileData,
    PmeProfileUpdateRequest,
    PmeRegisterRequest,
    PmeRegistrationData,
    PmeSignalementListData,
)
from app.schemas.response import APIResponse
from app.services.pme_portal import (
    get_business_dashboard,
    get_business_profile,
    list_business_bundles,
    list_business_incidents,
    list_business_signalements,
    register_business,
    update_business_profile,
)


router = APIRouter()


@router.post("/register", response_model=APIResponse[PmeRegistrationData])
async def register_pme(
    request: PmeRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PmeRegistrationData]:
    payload = await register_business(db=db, request=request)
    return APIResponse(
        success=True,
        message="Inscription PME enregistree. Le compte restera en attente jusqu'a validation par un administrateur.",
        data=payload,
    )


@router.get("/dashboard", response_model=APIResponse[PmeDashboardData])
async def read_pme_dashboard(
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeDashboardData]:
    payload = await get_business_dashboard(db=db, user_id=int(principal.uid))
    return APIResponse(success=True, message="Tableau de bord PME recupere.", data=payload)


@router.get("/incidents", response_model=APIResponse[PmeIncidentListData])
async def read_pme_incidents(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeIncidentListData]:
    payload = await list_business_incidents(db=db, user_id=int(principal.uid), skip=skip, limit=limit)
    return APIResponse(success=True, message="Alertes PME recuperees.", data=payload)


@router.get("/signalements", response_model=APIResponse[PmeSignalementListData])
async def read_pme_signalements(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeSignalementListData]:
    payload = await list_business_signalements(db=db, user_id=int(principal.uid), skip=skip, limit=limit)
    return APIResponse(success=True, message="Signalements lies recuperees.", data=payload)


@router.get("/dossiers", response_model=APIResponse[PmeBundleListData])
async def read_pme_dossiers(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeBundleListData]:
    payload = await list_business_bundles(db=db, user_id=int(principal.uid), skip=skip, limit=limit)
    return APIResponse(success=True, message="Dossiers PME recuperes.", data=payload)


@router.get("/profile", response_model=APIResponse[PmeProfileData])
async def read_pme_profile(
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeProfileData]:
    payload = await get_business_profile(db=db, user_id=int(principal.uid))
    return APIResponse(success=True, message="Profil PME recupere.", data=payload)


@router.patch("/profile", response_model=APIResponse[PmeProfileData])
async def patch_pme_profile(
    request: PmeProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    principal=Depends(require_role(["SME"])),
) -> APIResponse[PmeProfileData]:
    payload = await update_business_profile(db=db, user_id=int(principal.uid), request=request)
    return APIResponse(success=True, message="Profil PME mis a jour.", data=payload)

