import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_subject, require_role
from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.shield import (
    ShieldDispatchData,
    ShieldDispatchRequest,
    ShieldIncidentTimelineData,
)
from app.services.shield import dispatch_shield_action, get_incident_shield_timeline


router = APIRouter()


@router.post("/actions/dispatch", response_model=APIResponse[ShieldDispatchData])
async def dispatch_action(
    request: ShieldDispatchRequest,
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    dispatch_result = await dispatch_shield_action(request=request, db=db)
    return APIResponse(
        success=True,
        message="Action SHIELD envoyee a l operateur simule.",
        data=dispatch_result,
    )


@router.get("/incidents/{incident_id}/actions", response_model=APIResponse[ShieldIncidentTimelineData])
async def get_incident_actions(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _subject: str = Depends(get_current_subject),
):
    timeline = await get_incident_shield_timeline(incident_id=incident_id, db=db)
    return APIResponse(
        success=True,
        message="Historique SHIELD recupere avec succes.",
        data=timeline,
    )
