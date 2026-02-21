import uuid
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    get_current_subject,
    get_optional_current_user,
    get_current_token_payload,
    require_role,
    resolve_scope_owner_user_id,
)
from app.database import get_db
from app.schemas.citizen_incident import CitizenIncidentDetailData, CitizenIncidentListData
from app.schemas.deletion import AlertDeletionData
from app.schemas.response import APIResponse
from app.schemas.signal import (
    IncidentReportData,
    IncidentReportRequest,
    SignalChannel,
    VerificationSnapshot,
)
from app.services.incidents import (
    get_citizen_incident_detail,
    list_citizen_incidents,
    report_signal_to_incident,
)
from app.services.cascade_delete import delete_alert_cascade
from app.schemas.shield import IncidentDecisionData, IncidentDecisionRequest
from app.schemas.token import TokenPayload
from app.services.shield import apply_incident_decision


router = APIRouter()


@router.post("/report", response_model=APIResponse[IncidentReportData])
async def report_incident(
    request: IncidentReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    owner_user_id = current_user.id if current_user and current_user.role == "SME" else None
    incident = await report_signal_to_incident(
        request=request,
        db=db,
        owner_user_id=owner_user_id,
    )
    return APIResponse(
        success=True,
        message="Incident cree avec succes.",
        data=incident,
    )


@router.post("/report-with-media", response_model=APIResponse[IncidentReportData])
async def report_incident_with_media(
    message: str = Form(...),
    phone: str = Form(...),
    channel: SignalChannel = Form(default="WEB_PORTAL"),
    url: str | None = Form(default=None),
    verification: str | None = Form(default=None),
    screenshots: list[UploadFile] | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    verification_snapshot: VerificationSnapshot | None = None
    if verification:
        try:
            verification_payload = json.loads(verification)
            verification_snapshot = VerificationSnapshot(**verification_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid verification payload in form-data",
            ) from exc

    request = IncidentReportRequest(
        message=message,
        phone=phone,
        channel=channel,
        url=url,
        verification=verification_snapshot,
    )
    owner_user_id = current_user.id if current_user and current_user.role == "SME" else None
    incident = await report_signal_to_incident(
        request=request,
        db=db,
        screenshots=screenshots or [],
        owner_user_id=owner_user_id,
    )
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
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    decision = await apply_incident_decision(incident_id=incident_id, request=request, db=db)
    return APIResponse(
        success=True,
        message="Decision SOC enregistree avec succes.",
        data=decision,
    )


@router.get("/citizen", response_model=APIResponse[CitizenIncidentListData])
async def read_citizen_incidents(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    scope: str | None = Query(default=None, pattern="^me$"),
    _subject: str = Depends(get_current_subject),
    token_data: TokenPayload = Depends(get_current_token_payload),
):
    scope_owner_user_id = resolve_scope_owner_user_id(token_data, scope)

    payload = await list_citizen_incidents(
        db=db,
        skip=skip,
        limit=limit,
        status_filter=status,
        search=q,
        owner_user_id=scope_owner_user_id,
    )
    return APIResponse(
        success=True,
        message="Liste des incidents citoyens recuperee.",
        data=payload,
    )


@router.get("/citizen/{incident_id}", response_model=APIResponse[CitizenIncidentDetailData])
async def read_citizen_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _subject: str = Depends(get_current_subject),
):
    payload = await get_citizen_incident_detail(db=db, incident_id=incident_id)
    return APIResponse(
        success=True,
        message="Detail incident citoyen recupere.",
        data=payload,
    )


@router.delete("/citizen/{incident_id}", response_model=APIResponse[AlertDeletionData])
async def delete_citizen_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    result = await delete_alert_cascade(
        db=db,
        alert_uuid=incident_id,
        require_citizen_source=True,
    )
    return APIResponse(
        success=True,
        message="Incident citoyen supprime avec preuves, rapports et artefacts associes.",
        data=result,
    )
