import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_optional_current_user
from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.signal import (
    IncidentReportData,
    IncidentReportRequest,
    SignalChannel,
    VerificationSnapshot,
)
from app.services.citizen_flow import create_citizen_report


router = APIRouter()


@router.post("/", response_model=APIResponse[IncidentReportData])
async def create_signalement(
    request: IncidentReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    owner_user_id = current_user.id if current_user and current_user.role == "SME" else None
    result = await create_citizen_report(
        request=request,
        db=db,
        owner_user_id=owner_user_id,
    )
    return APIResponse(
        success=True,
        message="Signalement enregistre avec succes.",
        data=result,
    )


@router.post("/with-media", response_model=APIResponse[IncidentReportData])
async def create_signalement_with_media(
    message: str = Form(...),
    phone: str = Form(...),
    channel: SignalChannel = Form(default="WEB_PORTAL"),
    department: str | None = Form(default=None),
    url: str | None = Form(default=None),
    device_install_id: str | None = Form(default=None),
    verification_message_uuid: str | None = Form(default=None),
    verification_analysis_uuid: str | None = Form(default=None),
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
        department=department,
        url=url,
        device_install_id=device_install_id,
        verification_message_uuid=verification_message_uuid,
        verification_analysis_uuid=verification_analysis_uuid,
        verification=verification_snapshot,
    )
    owner_user_id = current_user.id if current_user and current_user.role == "SME" else None
    result = await create_citizen_report(
        request=request,
        db=db,
        screenshots=screenshots or [],
        owner_user_id=owner_user_id,
    )
    return APIResponse(
        success=True,
        message="Signalement enregistre avec succes.",
        data=result,
    )
