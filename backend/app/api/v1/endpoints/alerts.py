from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Alert
from app.core.security import get_current_subject
from app.schemas import AlertResponse, AlertUpdate
from app.schemas.deletion import AlertDeletionData
from app.schemas.response import APIResponse
from app.services.cascade_delete import delete_alert_cascade


router = APIRouter()
ALLOWED_ALERT_STATUSES = {"NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"}


def _normalize_alert_status(raw_status: str | None) -> str:
    if raw_status in ALLOWED_ALERT_STATUSES:
        return str(raw_status)
    return "NEW"


def _serialize_alert(alert: Alert) -> AlertResponse:
    """Serialize defensively to avoid response-model failures on legacy rows."""
    try:
        return AlertResponse.model_validate(alert)
    except ValidationError:
        evidences = []
        for ev in (alert.evidences or []):
            evidences.append(
                {
                    "id": ev.id,
                    "alert_id": ev.alert_id,
                    "file_path": ev.file_path or "unknown",
                    "file_hash": ev.file_hash or "unknown",
                    "type": ev.type or "SCREENSHOT",
                    "status": ev.status or "ACTIVE",
                    "content_text_preview": ev.content_text_preview,
                    "captured_at": ev.captured_at,
                    "metadata_json": ev.metadata_json,
                }
            )

        analysis = None
        if alert.analysis_results is not None:
            analysis = {
                "id": alert.analysis_results.id,
                "alert_id": alert.analysis_results.alert_id,
                "categories": alert.analysis_results.categories,
                "entities": alert.analysis_results.entities,
            }

        return AlertResponse(
            id=int(alert.id),
            uuid=alert.uuid,
            url=alert.url or "citizen://unknown",
            source_type=alert.source_type or "UNKNOWN",
            phone_number=alert.phone_number,
            reported_message=alert.reported_message,
            citizen_channel=alert.citizen_channel,
            risk_score=int(alert.risk_score or 0),
            status=_normalize_alert_status(alert.status),
            created_at=alert.created_at,
            updated_at=alert.updated_at,
            analysis_note=alert.analysis_note,
            evidences=evidences,
            analysis_results=analysis,
        )


@router.get("", response_model=List[AlertResponse], include_in_schema=False)
@router.get("/", response_model=List[AlertResponse])
async def read_alerts(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: str | None = Query(default=None, description="Filter by status (NEW, IN_REVIEW, ... )"),
):
    query = (
        select(Alert)
        .options(
            selectinload(Alert.evidences),
            selectinload(Alert.analysis_results),
        )
        .order_by(Alert.created_at.desc())
    )

    if status:
        query = query.where(Alert.status == status)

    result = await db.execute(query.offset(skip).limit(limit))
    alerts = result.scalars().all()
    return [_serialize_alert(alert) for alert in alerts]


@router.get("/{alert_uuid}", response_model=AlertResponse)
async def read_alert(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert).where(Alert.uuid == alert_uuid).options(
        selectinload(Alert.evidences),
        selectinload(Alert.analysis_results),
    )
    result = await db.execute(query)
    alert = result.scalars().first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return _serialize_alert(alert)


@router.patch("/{alert_uuid}", response_model=APIResponse[AlertResponse])
async def update_alert(
    alert_uuid: uuid.UUID,
    alert_update: AlertUpdate,
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert).where(Alert.uuid == alert_uuid).options(
        selectinload(Alert.evidences),
        selectinload(Alert.analysis_results),
    )
    result = await db.execute(query)
    alert = result.scalars().first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert_update.status in ("CONFIRMED", "DISMISSED"):
        resulting_note = (
            alert_update.analysis_note if alert_update.analysis_note is not None else alert.analysis_note
        )
        if not resulting_note or not resulting_note.strip():
            raise HTTPException(
                status_code=422,
                detail=f"analysis_note is required when status is {alert_update.status}",
            )

    for field, value in alert_update.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)

    db.add(alert)
    await db.commit()

    refreshed = await db.execute(query)
    alert = refreshed.scalars().first()

    return APIResponse(
        success=True,
        message="Alerte mise a jour avec succes",
        data=_serialize_alert(alert),
    )


@router.delete("/{alert_uuid}", response_model=APIResponse[AlertDeletionData])
async def delete_alert(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _subject: str = Depends(get_current_subject),
):
    result = await delete_alert_cascade(
        db=db,
        alert_uuid=alert_uuid,
        require_citizen_source=False,
    )
    return APIResponse(
        success=True,
        message="Alerte supprimee avec nettoyage des artefacts associes.",
        data=result,
    )
