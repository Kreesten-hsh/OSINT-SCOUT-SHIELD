import json
import logging
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
import re

from fastapi import HTTPException, UploadFile, status
import redis.asyncio as redis
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models import Alert, CitizenMessage, Evidence, EvidenceItem, FormalReport, MessageAnalysis, SuspectNumber
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
from app.services.phone_privacy import decrypt_phone, derive_phone_hash, mask_phone, normalize_phone


logger = logging.getLogger(__name__)
PHONE_PATTERN = re.compile(r"^\+?[0-9]{8,15}$")
MAX_SCREENSHOTS_PER_REPORT = 5
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
SUPPORTED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


def _normalize_signal_channel(value: str | None) -> str:
    normalized = (value or "").strip().upper()
    if normalized == "MOBILE_APP":
        return "MOBILE_APP"
    return "WEB_PORTAL"


async def report_signal_to_incident(
    request: IncidentReportRequest,
    db: AsyncSession,
    screenshots: list[UploadFile] | None = None,
    owner_user_id: int | None = None,
) -> IncidentReportData:
    normalized_phone = request.phone.strip()
    if not PHONE_PATTERN.match(normalized_phone):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="phone must be a valid number (8 to 15 digits, optional leading +)",
        )

    detection = score_signal(message=request.message, url=request.url, phone=normalized_phone)
    categories_detected = detection.get("categories_detected", []) or []
    if request.verification:
        risk_score = request.verification.risk_score
        categories_detected = request.verification.categories_detected or categories_detected
    else:
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
        owner_user_id=owner_user_id,
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

    # ── UPGRADE U1 v3.0 : ThreatIndicator + région ──
    try:
        from app.services.intel_aggregator import upsert_threat_indicator

        _phone = getattr(alert, "phone_number", None)
        _score = float(risk_score) if risk_score else 0.0
        _cats = categories_detected or []
        if _phone:
            _indicator = await upsert_threat_indicator(
                db=db,
                phone=_phone,
                danger_score=_score,
                dominant_category=_cats[0] if _cats else None,
            )
            alert.region = _indicator.region
            await db.commit()
    except Exception as _e:
        import logging

        logging.getLogger(__name__).warning("ThreatIndicator upsert failed: %s", _e)

    redis_client = None

    # ── UPGRADE U2 v3.0 : Détection campagnes coordonnées ──
    try:
        from app.services.campaign_detector import (
            register_signal, create_or_update_campaign
        )
        _rules = categories_detected or []
        _region = getattr(alert, "region", None)
        if _rules:
            if redis_client is None:
                redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _campaign_data = await register_signal(
                redis_client=redis_client,
                incident_id=str(alert.id),
                matched_rules=_rules,
                region=_region,
            )
            if _campaign_data.get("campaign_detected"):
                await create_or_update_campaign(db, _campaign_data, _region)
    except Exception as _e:
        import logging

        logging.getLogger(__name__).warning(
            "Campaign detection failed: %s", _e
        )

    queued_for_osint_u5 = False

    # -- UPGRADE U5 v3.0 : Forensic Preservation automatique --
    try:
        import re as _re

        _categories_u5 = categories_detected or []
        _message_u5 = reported_message or ""
        if "suspicious_url" in _categories_u5:
            _urls = _re.findall(r"https?://[^\s]+", _message_u5)
            if _urls:
                if redis_client is None:
                    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                _scan_job = {
                    "id": str(alert.uuid),
                    "url": _urls[0],
                    "alert_id": str(alert.id),
                    "trigger": "suspicious_url_auto_v3",
                    "priority": "HIGH",
                    "source_type": source_type,
                }
                await redis_client.lpush(
                    "osint_to_scan",
                    json.dumps(_scan_job),
                )
                queued_for_osint_u5 = True
    except Exception as _e:
        logger.warning("Forensic preservation push failed: %s", _e)

    queued_for_osint = queued_for_osint_u5
    if request.url and request.url.lower().startswith(("http://", "https://")):
        try:
            if redis_client is None:
                redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            task_payload = {
                "id": str(alert.uuid),
                "url": request.url.strip(),
                "source_type": source_type,
            }
            await redis_client.rpush("osint_to_scan", json.dumps(task_payload))
            queued_for_osint = True
        except Exception:
            logger.exception(
                "Failed to enqueue incident report task",
                extra={"alert_uuid": str(alert.uuid)},
            )
    if redis_client is not None:
        try:
            await redis_client.aclose()
        except Exception:
            logger.warning("Failed to close Redis client after incident processing")

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
    owner_user_id: int | None = None,
) -> CitizenIncidentListData:
    filters = []
    if owner_user_id is not None:
        filters.append(FormalReport.reporter_user_id == owner_user_id)
    if status_filter:
        filters.append(FormalReport.status == status_filter)
    if search and search.strip():
        search_value = search.strip()
        term = f"%{search_value}%"
        search_filters = [
            CitizenMessage.content.ilike(term),
            CitizenMessage.submitted_url.ilike(term),
        ]
        try:
            normalized_phone = normalize_phone(search_value)
            if PHONE_PATTERN.match(normalized_phone):
                search_filters.append(SuspectNumber.phone_hash == derive_phone_hash(normalized_phone))
        except Exception:
            logger.debug("Unable to normalize search phone for citizen incident list", exc_info=True)
        filters.append(or_(*search_filters))

    total_stmt = (
        select(func.count(FormalReport.id))
        .select_from(FormalReport)
        .join(CitizenMessage, FormalReport.message_id == CitizenMessage.id)
        .join(SuspectNumber, FormalReport.suspect_number_id == SuspectNumber.id)
        .where(*filters)
    )
    total = int((await db.execute(total_stmt)).scalar_one() or 0)

    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
        )
        .join(CitizenMessage, FormalReport.message_id == CitizenMessage.id)
        .join(SuspectNumber, FormalReport.suspect_number_id == SuspectNumber.id)
        .where(*filters)
        .order_by(FormalReport.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reports = (await db.execute(stmt)).scalars().all()

    report_counts_by_number: dict[int, int] = {}
    suspect_number_ids = sorted({report.suspect_number_id for report in reports if report.suspect_number_id is not None})
    if suspect_number_ids:
        count_stmt = (
            select(FormalReport.suspect_number_id, func.count(FormalReport.id))
            .where(FormalReport.suspect_number_id.in_(suspect_number_ids))
            .group_by(FormalReport.suspect_number_id)
        )
        if owner_user_id is not None:
            count_stmt = count_stmt.where(FormalReport.reporter_user_id == owner_user_id)
        for suspect_number_id, count in (await db.execute(count_stmt)).all():
            if suspect_number_id is not None:
                report_counts_by_number[int(suspect_number_id)] = int(count)

    attachment_count_map: dict[uuid.UUID, int] = {}
    legacy_alert_uuid_map = {
        report.legacy_alert_uuid: report
        for report in reports
        if report.legacy_alert_uuid is not None
    }
    if legacy_alert_uuid_map:
        alert_rows = (
            await db.execute(
                select(Alert.id, Alert.uuid).where(Alert.uuid.in_(list(legacy_alert_uuid_map.keys())))
            )
        ).all()
        alert_id_by_uuid = {alert_uuid: int(alert_id) for alert_id, alert_uuid in alert_rows if alert_uuid is not None}
        if alert_id_by_uuid:
            attachment_count_stmt = (
                select(Evidence.alert_id, func.count(Evidence.id))
                .where(Evidence.alert_id.in_(list(alert_id_by_uuid.values())))
                .group_by(Evidence.alert_id)
            )
            counts_by_alert_id = {int(alert_id): int(count) for alert_id, count in (await db.execute(attachment_count_stmt)).all()}
            for alert_uuid, alert_id in alert_id_by_uuid.items():
                attachment_count_map[alert_uuid] = counts_by_alert_id.get(alert_id, 0)

    items = []
    for report in reports:
        incident_uuid = report.legacy_alert_uuid or report.uuid
        suspect_number = report.suspect_number
        phone_number = "-"
        if suspect_number is not None:
            try:
                phone_number = decrypt_phone(suspect_number.phone_ciphertext)
            except Exception:
                logger.warning("Unable to decrypt suspect phone for incident list", extra={"report_uuid": str(report.uuid)})
        items.append(
            CitizenIncidentListItem(
                alert_uuid=incident_uuid,
                phone_number=phone_number,
                channel=(report.message.channel if report.message else "WEB_PORTAL"),
                message_preview=((report.message.content if report.message else "") or "")[:140],
                risk_score=int(report.analysis.risk_score if report.analysis else 0),
                status=report.status,
                created_at=report.created_at,
                attachments_count=attachment_count_map.get(report.legacy_alert_uuid, 0) if report.legacy_alert_uuid else len(report.evidence_items or []),
                reports_for_phone=report_counts_by_number.get(int(report.suspect_number_id or 0), 1),
            )
        )

    return CitizenIncidentListData(items=items, total=total, skip=skip, limit=limit)


async def get_citizen_incident_detail(
    db: AsyncSession,
    incident_id: uuid.UUID,
) -> CitizenIncidentDetailData:
    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
        )
        .where(
            or_(
                FormalReport.legacy_alert_uuid == incident_id,
                FormalReport.uuid == incident_id,
            )
        )
    )
    report = (await db.execute(stmt)).scalars().first()
    if not report:
        legacy_alert_stmt = (
            select(Alert)
            .options(selectinload(Alert.evidences))
            .where(Alert.uuid == incident_id)
        )
        legacy_alert = (await db.execute(legacy_alert_stmt)).scalars().first()
        if not legacy_alert:
            raise HTTPException(status_code=404, detail="Citizen incident not found")

        legacy_phone = (legacy_alert.phone_number or "").strip() or "-"
        attachments = [
            CitizenIncidentAttachment(
                evidence_id=evidence.id,
                file_path=evidence.file_path or "-",
                file_hash=evidence.file_hash or "unknown",
                captured_at=evidence.captured_at,
                type=(evidence.type or "SCREENSHOT"),
                preview_endpoint=f"/evidence/view/{evidence.id}",
            )
            for evidence in sorted(
                legacy_alert.evidences or [],
                key=lambda item: item.captured_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )
        ]

        reports_for_phone = 0
        open_reports_for_phone = 0
        confirmed_reports_for_phone = 0
        blocked_reports_for_phone = 0
        related_incidents: list[RelatedCitizenIncident] = []

        try:
            normalized_phone = normalize_phone(legacy_phone)
            if legacy_phone != "-" and PHONE_PATTERN.match(normalized_phone):
                suspect_number = await db.scalar(
                    select(SuspectNumber).where(SuspectNumber.phone_hash == derive_phone_hash(normalized_phone))
                )
                if suspect_number is not None:
                    reports_for_phone = int(
                        (
                            await db.execute(
                                select(func.count(FormalReport.id)).where(
                                    FormalReport.suspect_number_id == suspect_number.id,
                                )
                            )
                        ).scalar_one()
                        or 0
                    )
                    open_reports_for_phone = int(
                        (
                            await db.execute(
                                select(func.count(FormalReport.id)).where(
                                    FormalReport.suspect_number_id == suspect_number.id,
                                    FormalReport.status.in_(("NEW", "IN_REVIEW")),
                                )
                            )
                        ).scalar_one()
                        or 0
                    )
                    confirmed_reports_for_phone = int(
                        (
                            await db.execute(
                                select(func.count(FormalReport.id)).where(
                                    FormalReport.suspect_number_id == suspect_number.id,
                                    FormalReport.status == "CONFIRMED",
                                )
                            )
                        ).scalar_one()
                        or 0
                    )
                    blocked_reports_for_phone = int(
                        (
                            await db.execute(
                                select(func.count(FormalReport.id)).where(
                                    FormalReport.suspect_number_id == suspect_number.id,
                                    FormalReport.status == "BLOCKED_SIMULATED",
                                )
                            )
                        ).scalar_one()
                        or 0
                    )
        except Exception:
            logger.warning("Unable to compute legacy incident stats", extra={"alert_uuid": str(legacy_alert.uuid)})

        return CitizenIncidentDetailData(
            alert_uuid=legacy_alert.uuid,
            phone_number=legacy_phone,
            channel=_normalize_signal_channel(legacy_alert.citizen_channel),
            message=legacy_alert.reported_message or "",
            url=(legacy_alert.url or "citizen://text-signal"),
            risk_score=int(legacy_alert.risk_score or 0),
            status=legacy_alert.status,
            analysis_note=legacy_alert.analysis_note,
            created_at=legacy_alert.created_at,
            attachments=attachments,
            stats=CitizenIncidentStats(
                reports_for_phone=reports_for_phone,
                open_reports_for_phone=open_reports_for_phone,
                confirmed_reports_for_phone=confirmed_reports_for_phone,
                blocked_reports_for_phone=blocked_reports_for_phone,
            ),
            related_incidents=related_incidents,
        )

    legacy_alert = None
    evidences = []
    if report.legacy_alert_uuid is not None:
        alert_stmt = (
            select(Alert)
            .options(selectinload(Alert.evidences))
            .where(Alert.uuid == report.legacy_alert_uuid)
        )
        legacy_alert = (await db.execute(alert_stmt)).scalars().first()
        if legacy_alert:
            evidences = sorted(
                legacy_alert.evidences or [],
                key=lambda item: item.captured_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )

    suspect_number = report.suspect_number
    phone = "-"
    if suspect_number is not None:
        try:
            phone = decrypt_phone(suspect_number.phone_ciphertext)
        except Exception:
            logger.warning("Unable to decrypt suspect phone for incident detail", extra={"report_uuid": str(report.uuid)})

    reports_for_phone = 0
    open_reports_for_phone = 0
    confirmed_reports_for_phone = 0
    blocked_reports_for_phone = 0
    related_reports = []
    if report.suspect_number_id is not None:
        reports_for_phone_stmt = select(func.count(FormalReport.id)).where(
            FormalReport.suspect_number_id == report.suspect_number_id,
        )
        reports_for_phone = int((await db.execute(reports_for_phone_stmt)).scalar_one() or 0)

        open_reports_stmt = select(func.count(FormalReport.id)).where(
            FormalReport.suspect_number_id == report.suspect_number_id,
            FormalReport.status.in_(("NEW", "IN_REVIEW")),
        )
        open_reports_for_phone = int((await db.execute(open_reports_stmt)).scalar_one() or 0)

        confirmed_reports_stmt = select(func.count(FormalReport.id)).where(
            FormalReport.suspect_number_id == report.suspect_number_id,
            FormalReport.status == "CONFIRMED",
        )
        confirmed_reports_for_phone = int((await db.execute(confirmed_reports_stmt)).scalar_one() or 0)

        blocked_reports_stmt = select(func.count(FormalReport.id)).where(
            FormalReport.suspect_number_id == report.suspect_number_id,
            FormalReport.status == "BLOCKED_SIMULATED",
        )
        blocked_reports_for_phone = int((await db.execute(blocked_reports_stmt)).scalar_one() or 0)

        related_stmt = (
            select(FormalReport)
            .options(selectinload(FormalReport.analysis))
            .where(
                FormalReport.suspect_number_id == report.suspect_number_id,
                FormalReport.id != report.id,
            )
            .order_by(FormalReport.created_at.desc())
            .limit(5)
        )
        related_reports = (await db.execute(related_stmt)).scalars().all()

    attachments = []
    if evidences:
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
    else:
        attachments = [
            CitizenIncidentAttachment(
                evidence_id=evidence_item.id,
                file_path=evidence_item.file_path,
                file_hash=evidence_item.file_hash,
                captured_at=evidence_item.created_at,
                type=evidence_item.type,
                preview_endpoint=f"/evidence/items/view/{evidence_item.id}",
            )
            for evidence_item in sorted(
                report.evidence_items or [],
                key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )
        ]

    related_incidents = [
        RelatedCitizenIncident(
            alert_uuid=(row.legacy_alert_uuid or row.uuid),
            status=row.status,
            risk_score=int(row.analysis.risk_score if row.analysis else 0),
            created_at=row.created_at,
        )
        for row in related_reports
    ]

    return CitizenIncidentDetailData(
        alert_uuid=(report.legacy_alert_uuid or report.uuid),
        phone_number=phone or "-",
        channel=_normalize_signal_channel(report.message.channel if report.message else "WEB_PORTAL"),
        message=report.message.content if report.message else "",
        url=(report.message.submitted_url if report.message and report.message.submitted_url else "citizen://text-signal"),
        risk_score=int(report.analysis.risk_score if report.analysis else 0),
        status=report.status,
        analysis_note=(legacy_alert.analysis_note if legacy_alert else None),
        created_at=report.created_at,
        attachments=attachments,
        stats=CitizenIncidentStats(
            reports_for_phone=reports_for_phone,
            open_reports_for_phone=open_reports_for_phone,
            confirmed_reports_for_phone=confirmed_reports_for_phone,
            blocked_reports_for_phone=blocked_reports_for_phone,
        ),
        related_incidents=related_incidents,
    )


async def get_top_reported_numbers(
    db: AsyncSession,
    limit: int = 5,
    owner_user_id: int | None = None,
) -> list[dict[str, int | str]]:
    stmt = (
        select(SuspectNumber.phone_ciphertext, func.count(FormalReport.id).label("total"))
        .join(FormalReport, FormalReport.suspect_number_id == SuspectNumber.id)
        .group_by(SuspectNumber.id, SuspectNumber.phone_ciphertext)
        .order_by(func.count(FormalReport.id).desc(), SuspectNumber.id.asc())
        .limit(limit)
    )
    if owner_user_id is not None:
        stmt = stmt.where(FormalReport.reporter_user_id == owner_user_id)

    rows = (await db.execute(stmt)).all()
    masked_rows: list[dict[str, int | str]] = []
    for ciphertext, total in rows:
        if not ciphertext:
            continue
        try:
            decrypted_phone = decrypt_phone(str(ciphertext))
        except Exception:
            logger.warning("Unable to decrypt suspect phone for top-number stats")
            continue
        masked_rows.append(
            {
                "phone": mask_phone(decrypted_phone),
                "count": int(total),
            }
        )
    return masked_rows
