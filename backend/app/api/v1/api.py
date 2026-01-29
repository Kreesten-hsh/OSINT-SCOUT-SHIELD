from fastapi import APIRouter
from app.api.v1.endpoints import alerts, evidence, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence"])
