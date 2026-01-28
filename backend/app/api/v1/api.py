from fastapi import APIRouter
from app.api.v1.endpoints import alerts, evidence

api_router = APIRouter()
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence"])
