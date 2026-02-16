from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.signal import IncidentReportData, IncidentReportRequest
from app.services.incidents import report_signal_to_incident


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

