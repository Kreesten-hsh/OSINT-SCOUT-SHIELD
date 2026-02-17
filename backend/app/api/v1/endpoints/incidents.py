import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_subject
from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.signal import IncidentReportData, IncidentReportRequest
from app.services.incidents import report_signal_to_incident
from app.schemas.shield import IncidentDecisionData, IncidentDecisionRequest
from app.services.shield import apply_incident_decision


router = APIRouter()


@router.post("/report", response_model=APIResponse[IncidentReportData])
async def report_incident(
    request: IncidentReportRequest,
    db: AsyncSession = Depends(get_db),
):
    incident = await report_signal_to_incident(request=request, db=db)
    return APIResponse(
        success=True,
        message="Incident cree avec succes.",
        data=incident,
    )


@router.patch("/{incident_id}/decision", response_model=APIResponse[IncidentDecisionData])
async def decide_incident(
    incident_id: uuid.UUID,
    request: IncidentDecisionRequest,
    db: AsyncSession = Depends(get_db),
    _subject: str = Depends(get_current_subject),
):
    decision = await apply_incident_decision(incident_id=incident_id, request=request, db=db)
    return APIResponse(
        success=True,
        message="Decision SOC enregistree avec succes.",
        data=decision,
    )
