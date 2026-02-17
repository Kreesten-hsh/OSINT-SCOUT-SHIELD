import json
import logging
import uuid
import hashlib
from pathlib import Path
import re

from fastapi import HTTPException, UploadFile, status
import redis.asyncio as redis
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Alert, Evidence
from app.schemas.citizen_incident import (
    CitizenIncidentAttachment,
    CitizenIncidentDetailData,
    CitizenIncidentListData,
    CitizenIncidentListItem,
    CitizenIncidentStats,
    RelatedCitizenIncident,
)
from app.schemas.signal import IncidentReportRequest, IncidentReportData
from app.services.detection import score_signal


logger = logging.getLogger(__name__)
PHONE_PATTERN = re.compile(r"^\+?[0-9]{8,15}$")
MAX_SCREENSHOTS_PER_REPORT = 5
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
SUPPORTED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


async def report_signal_to_incident(
    request: IncidentReportRequest,
    db: AsyncSession,
    screenshots: list[UploadFile] | None = None,
) -> IncidentReportData:
    normalized_phone = request.phone.strip()
    if not PHONE_PATTERN.match(normalized_phone):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="phone must be a valid number (8 to 15 digits, optional leading +)",
        )

    if request.verification:
        risk_score = request.verification.risk_score
    else:
        detection = score_signal(message=request.message, url=request.url, phone=normalized_phone)
        risk_score = int(detection["risk_score"])

    source_type = f"CITIZEN_{request.channel}"
    target_url = (request.url or "").strip() or "citizen://text-signal"
    reported_message = request.message.strip()

    alert = Alert(
        uuid=uuid.uuid4(),
        url=target_url,
        source_type=source_type,
        phone_number=normalized_phone,
        reported_message=reported_message,
        citizen_channel=request.channel,
        risk_score=max(0, min(risk_score, 100)),
        status="NEW",
        analysis_note=f"[{request.channel}] {reported_message[:250]}",
    )
    db.add(alert)
    await db.flush()

    if screenshots:
        await _store_citizen_screenshots(alert=alert, screenshots=screenshots, db=db)

    await db.commit()
    await db.refresh(alert)

    queued_for_osint = False
    if request.url and request.url.lower().startswith(("http://", "https://")):
        try:
            client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            task_payload = {
                "id": str(alert.uuid),
                "url": request.url.strip(),
                "source_type": source_type,
            }
            await client.rpush("osint_to_scan", json.dumps(task_payload))
            await client.aclose()
            queued_for_osint = True
        except Exception:
            logger.exception(
                "Failed to enqueue incident report task",
                extra={"alert_uuid": str(alert.uuid)},
            )

    return IncidentReportData(
        alert_uuid=alert.uuid,
        status="NEW",
        risk_score_initial=alert.risk_score,
        queued_for_osint=queued_for_osint,
    )


async def _store_citizen_screenshots(
    alert: Alert,
    screenshots: list[UploadFile],
    db: AsyncSession,
) -> None:
    if len(screenshots) > MAX_SCREENSHOTS_PER_REPORT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Maximum {MAX_SCREENSHOTS_PER_REPORT} screenshots allowed per report",
        )

    base_dir = Path("evidences_store")
    uploads_dir = base_dir / "citizen_uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    duplicates_skipped = 0
    inserted = 0

    for idx, screenshot in enumerate(screenshots):
        content_type = (screenshot.content_type or "").lower()
        if content_type not in SUPPORTED_IMAGE_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported screenshot content type: {content_type or 'unknown'}",
            )

        file_bytes = await screenshot.read()
        if not file_bytes:
            continue
        if len(file_bytes) > MAX_SCREENSHOT_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Screenshot too large (max {MAX_SCREENSHOT_BYTES // (1024 * 1024)}MB per file)",
            )

        digest = hashlib.sha256(file_bytes).hexdigest()
        duplicate_stmt = select(Evidence).where(Evidence.file_hash == digest)
        duplicate = (await db.execute(duplicate_stmt)).scalars().first()
        if duplicate:
            duplicates_skipped += 1
            continue

        ext = Path(screenshot.filename or "").suffix.lower()
        if not ext:
            ext = ".png" if content_type == "image/png" else ".jpg"

        relative_path = f"citizen_uploads/{alert.uuid}_{idx}_{digest[:12]}{ext}"
        absolute_path = base_dir / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(file_bytes)

        evidence = Evidence(
            alert_id=alert.id,
            type="CITIZEN_SCREENSHOT",
            file_path=relative_path,
            file_hash=digest,
            content_text_preview=f"Citizen upload {screenshot.filename or f'image_{idx + 1}'}",
            metadata_json={
                "origin": "citizen_upload",
                "filename": screenshot.filename,
                "content_type": content_type,
                "size_bytes": len(file_bytes),
                "sha256": digest,
            },
        )
        db.add(evidence)
        inserted += 1

    if duplicates_skipped > 0:
        suffix = f"\n[CITIZEN_UPLOAD] duplicate_images_skipped={duplicates_skipped}"
        alert.analysis_note = f"{(alert.analysis_note or '').strip()}{suffix}".strip()
        db.add(alert)



async def list_citizen_incidents(
    db: AsyncSession,
    skip: int,
    limit: int,
    status_filter: str | None = None,
    search: str | None = None,
) -> CitizenIncidentListData:
    filters = [Alert.source_type.like("CITIZEN_%")]
    if status_filter:
        filters.append(Alert.status == status_filter)
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Alert.phone_number.ilike(term),
                Alert.reported_message.ilike(term),
                Alert.url.ilike(term),
            )
        )

    total_stmt = select(func.count(Alert.id)).where(*filters)
    total = int((await db.execute(total_stmt)).scalar_one() or 0)

    stmt = (
        select(Alert)
        .where(*filters)
        .order_by(Alert.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    alerts = (await db.execute(stmt)).scalars().all()

    phone_numbers = sorted({a.phone_number for a in alerts if a.phone_number})
    phone_report_counts: dict[str, int] = {}
    if phone_numbers:
        count_stmt = (
            select(Alert.phone_number, func.count(Alert.id))
            .where(
                Alert.source_type.like("CITIZEN_%"),
                Alert.phone_number.in_(phone_numbers),
            )
            .group_by(Alert.phone_number)
        )
        for phone, count in (await db.execute(count_stmt)).all():
            if phone:
                phone_report_counts[str(phone)] = int(count)

    attachment_count_map: dict[int, int] = {}
    if alerts:
        alert_ids = [a.id for a in alerts]
        attachment_count_stmt = (
            select(Evidence.alert_id, func.count(Evidence.id))
            .where(Evidence.alert_id.in_(alert_ids))
            .group_by(Evidence.alert_id)
        )
        for alert_id, count in (await db.execute(attachment_count_stmt)).all():
            attachment_count_map[int(alert_id)] = int(count)

    items = [
        CitizenIncidentListItem(
            alert_uuid=alert.uuid,
            phone_number=alert.phone_number or "-",
            channel=(alert.citizen_channel or "WEB_PORTAL"),
            message_preview=(alert.reported_message or "")[:140],
            risk_score=alert.risk_score,
            status=alert.status,
            created_at=alert.created_at,
            attachments_count=attachment_count_map.get(alert.id, 0),
            reports_for_phone=phone_report_counts.get(alert.phone_number or "", 1),
        )
        for alert in alerts
    ]

    return CitizenIncidentListData(items=items, total=total, skip=skip, limit=limit)


async def get_citizen_incident_detail(
    db: AsyncSession,
    incident_id: uuid.UUID,
) -> CitizenIncidentDetailData:
    stmt = select(Alert).where(
        Alert.uuid == incident_id,
        Alert.source_type.like("CITIZEN_%"),
    )
    alert = (await db.execute(stmt)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Citizen incident not found")

    evidence_stmt = select(Evidence).where(Evidence.alert_id == alert.id).order_by(Evidence.captured_at.desc())
    evidences = (await db.execute(evidence_stmt)).scalars().all()

    phone = alert.phone_number or ""
    if phone:
        reports_for_phone_stmt = select(func.count(Alert.id)).where(
            Alert.source_type.like("CITIZEN_%"),
            Alert.phone_number == phone,
        )
        reports_for_phone = int((await db.execute(reports_for_phone_stmt)).scalar_one() or 0)

        open_reports_stmt = select(func.count(Alert.id)).where(
            Alert.source_type.like("CITIZEN_%"),
            Alert.phone_number == phone,
            Alert.status.in_(("NEW", "IN_REVIEW")),
        )
        open_reports_for_phone = int((await db.execute(open_reports_stmt)).scalar_one() or 0)

        confirmed_reports_stmt = select(func.count(Alert.id)).where(
            Alert.source_type.like("CITIZEN_%"),
            Alert.phone_number == phone,
            Alert.status == "CONFIRMED",
        )
        confirmed_reports_for_phone = int((await db.execute(confirmed_reports_stmt)).scalar_one() or 0)

        blocked_reports_stmt = select(func.count(Alert.id)).where(
            Alert.source_type.like("CITIZEN_%"),
            Alert.phone_number == phone,
            Alert.status == "BLOCKED_SIMULATED",
        )
        blocked_reports_for_phone = int((await db.execute(blocked_reports_stmt)).scalar_one() or 0)

        related_stmt = (
            select(Alert)
            .where(
                Alert.source_type.like("CITIZEN_%"),
                Alert.phone_number == phone,
                Alert.id != alert.id,
            )
            .order_by(Alert.created_at.desc())
            .limit(5)
        )
        related = (await db.execute(related_stmt)).scalars().all()
    else:
        reports_for_phone = 0
        open_reports_for_phone = 0
        confirmed_reports_for_phone = 0
        blocked_reports_for_phone = 0
        related = []

    attachments = [
        CitizenIncidentAttachment(
            evidence_id=evidence.id,
            file_path=evidence.file_path,
            file_hash=evidence.file_hash,
            captured_at=evidence.captured_at,
            type=evidence.type,
            preview_endpoint=f"/evidence/view/{evidence.id}",
        )
        for evidence in evidences
    ]

    related_incidents = [
        RelatedCitizenIncident(
            alert_uuid=row.uuid,
            status=row.status,
            risk_score=row.risk_score,
            created_at=row.created_at,
        )
        for row in related
    ]

    return CitizenIncidentDetailData(
        alert_uuid=alert.uuid,
        phone_number=phone or "-",
        channel=(alert.citizen_channel or "WEB_PORTAL"),
        message=alert.reported_message or "",
        url=alert.url,
        risk_score=alert.risk_score,
        status=alert.status,
        analysis_note=alert.analysis_note,
        created_at=alert.created_at,
        attachments=attachments,
        stats=CitizenIncidentStats(
            reports_for_phone=reports_for_phone,
            open_reports_for_phone=open_reports_for_phone,
            confirmed_reports_for_phone=confirmed_reports_for_phone,
            blocked_reports_for_phone=blocked_reports_for_phone,
        ),
        related_incidents=related_incidents,
    )
