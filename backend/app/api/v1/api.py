from fastapi import APIRouter, Depends
from app.api.v1.endpoints import auth, alerts, evidence, ingestion, analysis, reports, sources, dashboard
from app.core.security import get_current_subject

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=["alerts"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    ingestion.router,
    prefix="/ingestion",
    tags=["ingestion"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    evidence.router,
    prefix="/evidence",
    tags=["evidence"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    sources.router,
    prefix="/sources",
    tags=["sources"],
    dependencies=[Depends(get_current_subject)],
)
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_subject)],
)
