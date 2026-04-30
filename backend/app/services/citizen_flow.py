import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

import redis.asyncio as redis
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models import (
    Alert,
    AnalysisResult,
    BusinessProfile,
    CitizenMessage,
    Evidence,
    EvidenceItem,
    FormalReport,
    ImpersonationIncident,
    MessageAnalysis,
    SuspectNumber,
)
from app.schemas.signal import IncidentReportData, IncidentReportRequest, VerifySignalData, VerifySignalRequest
from app.services.benin_geography import resolve_department
from app.services.campaign_detector import create_or_update_campaign, register_signal
from app.services.detection import score_signal
from app.services.external_transmissions import schedule_external_transmissions_for_report
from app.services.hashing import compute_snapshot_hash
from app.services.legacy_memory_bridge import build_legacy_analysis_payload
from app.services.phone_privacy import derive_phone_hash, encrypt_phone, mask_phone, normalize_phone


logger = logging.getLogger(__name__)
PHONE_PATTERN = re.compile(r"^\+?[0-9]{8,15}$")
MAX_SCREENSHOTS_PER_REPORT = 5
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
SUPPORTED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


def _normalize_text(value: str) -> str:
    return (value or "").strip().lower()


def _primary_category(categories: list[str]) -> str | None:
    for category in categories:
        if category:
            return str(category)
    return None


def _generate_public_reference() -> str:
    now = datetime.now(timezone.utc)
    return f"BCS-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


async def verify_citizen_signal(
    request: VerifySignalRequest,
    db: AsyncSession,
) -> VerifySignalData:
    normalized_phone = normalize_phone(request.phone)
    if not PHONE_PATTERN.match(normalized_phone):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="phone must be a valid number (8 to 15 digits, optional leading +)",
        )

    result = score_signal(message=request.message, url=request.url, phone=normalized_phone)
    phone_hash = derive_phone_hash(normalized_phone)
    suspect_number = await db.scalar(select(SuspectNumber).where(SuspectNumber.phone_hash == phone_hash))
    recurrence_count = int(suspect_number.report_count or 0) if suspect_number else 0
    resolved_department, department_source = resolve_department(request.department, normalized_phone)
    verification_message_uuid: uuid.UUID | None = None
    verification_analysis_uuid: uuid.UUID | None = None

    if request.channel == "MOBILE_APP" and request.device_install_id:
        message = CitizenMessage(
            uuid=_new_uuid(),
            content=request.message.strip(),
            channel=request.channel,
            device_install_id=request.device_install_id.strip(),
            history_entry_type="VERIFY",
            submitted_phone_masked=mask_phone(normalized_phone),
            department=resolved_department,
            department_source=department_source,
            submitted_url=(request.url or "").strip() or None,
        )
        db.add(message)
        await db.flush()

        analysis = MessageAnalysis(
            uuid=_new_uuid(),
            message_id=message.id,
            risk_score=max(0, min(int(result["risk_score"]), 100)),
            risk_level=str(result["risk_level"]),
            primary_category=_primary_category(result.get("categories_detected", [])),
            matched_rules=result.get("matched_rules", []),
            categories_detected=result.get("categories_detected", []),
            explanation=result.get("explanation", []),
            recommendations=result.get("recommendations", []),
            highlighted_spans=result.get("highlighted_spans", []),
            fon_alert=result.get("fon_alert"),
        )
        db.add(analysis)
        await db.commit()
        verification_message_uuid = message.uuid
        verification_analysis_uuid = analysis.uuid

    return VerifySignalData(
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        explanation=result["explanation"],
        should_report=result["should_report"],
        matched_rules=result["matched_rules"],
        categories_detected=result.get("categories_detected", []),
        recurrence_count=recurrence_count,
        highlighted_spans=result.get("highlighted_spans", []),
        recommendations=result.get("recommendations", []),
        citizen_advice=result.get("citizen_advice", []),
        fon_alert=result.get("fon_alert"),
        resolved_department=resolved_department,
        department_source=department_source,
        verification_message_uuid=verification_message_uuid,
        verification_analysis_uuid=verification_analysis_uuid,
    )


async def create_citizen_report(
    request: IncidentReportRequest,
    db: AsyncSession,
    screenshots: list[UploadFile] | None = None,
    owner_user_id: int | None = None,
) -> IncidentReportData:
    normalized_phone = normalize_phone(request.phone)
    if not PHONE_PATTERN.match(normalized_phone):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="phone must be a valid number (8 to 15 digits, optional leading +)",
        )

    existing_mobile_message = await _load_mobile_verification_message(
        db=db,
        message_uuid=request.verification_message_uuid,
        analysis_uuid=request.verification_analysis_uuid,
        device_install_id=request.device_install_id,
    )
    if existing_mobile_message and existing_mobile_message.reports:
        return _build_existing_report_response(existing_mobile_message.reports[0])

    detection = score_signal(message=request.message, url=request.url, phone=normalized_phone)
    categories_detected = detection.get("categories_detected", []) or []
    matched_rules = detection.get("matched_rules", []) or []
    risk_score = int(detection["risk_score"])
    risk_level = str(detection["risk_level"])
    explanation = detection.get("explanation", []) or []
    recommendations = detection.get("recommendations", []) or []
    highlighted_spans = detection.get("highlighted_spans", []) or []
    fon_alert = detection.get("fon_alert")

    if request.verification:
        risk_score = request.verification.risk_score
        risk_level = request.verification.risk_level
        matched_rules = request.verification.matched_rules or matched_rules
        categories_detected = request.verification.categories_detected or categories_detected

    suspect_number = await _upsert_suspect_number(db=db, phone=normalized_phone)
    resolved_department, department_source = resolve_department(request.department, normalized_phone)
    if existing_mobile_message and existing_mobile_message.analysis:
        message = existing_mobile_message
        analysis = existing_mobile_message.analysis
        message.content = request.message.strip()
        message.channel = request.channel
        message.device_install_id = request.device_install_id
        message.history_entry_type = "REPORT"
        message.submitted_phone_masked = mask_phone(normalized_phone)
        message.department = resolved_department
        message.department_source = department_source
        message.submitted_url = (request.url or "").strip() or None
        analysis.risk_score = max(0, min(risk_score, 100))
        analysis.risk_level = risk_level
        analysis.primary_category = _primary_category(categories_detected)
        analysis.matched_rules = matched_rules
        analysis.categories_detected = categories_detected
        analysis.explanation = explanation
        analysis.recommendations = recommendations
        analysis.highlighted_spans = highlighted_spans
        analysis.fon_alert = fon_alert
        db.add(message)
        db.add(analysis)
        await db.flush()
    else:
        message = CitizenMessage(
            uuid=_new_uuid(),
            content=request.message.strip(),
            channel=request.channel,
            device_install_id=request.device_install_id,
            history_entry_type="REPORT" if request.channel == "MOBILE_APP" and request.device_install_id else "VERIFY",
            submitted_phone_masked=mask_phone(normalized_phone),
            department=resolved_department,
            department_source=department_source,
            submitted_url=(request.url or "").strip() or None,
        )
        db.add(message)
        await db.flush()

        analysis = MessageAnalysis(
            uuid=_new_uuid(),
            message_id=message.id,
            risk_score=max(0, min(risk_score, 100)),
            risk_level=risk_level,
            primary_category=_primary_category(categories_detected),
            matched_rules=matched_rules,
            categories_detected=categories_detected,
            explanation=explanation,
            recommendations=recommendations,
            highlighted_spans=highlighted_spans,
            fon_alert=fon_alert,
        )
        db.add(analysis)
        await db.flush()

    public_reference = _generate_public_reference()
    custody_hash = compute_snapshot_hash(
        {
            "message_uuid": str(message.uuid),
            "analysis_uuid": str(analysis.uuid),
            "phone_hash": suspect_number.phone_hash,
            "public_reference": public_reference,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    formal_report = FormalReport(
        uuid=_new_uuid(),
        public_reference=public_reference,
        message=message,
        analysis=analysis,
        suspect_number=suspect_number,
        reporter_user_id=owner_user_id,
        status="NEW",
        custody_hash=custody_hash,
    )
    db.add(formal_report)
    await db.flush()

    if screenshots:
        await _store_citizen_screenshots(
            report=formal_report,
            screenshots=screenshots,
            db=db,
        )

    await _create_impersonation_incidents_if_needed(
        db=db,
        report=formal_report,
        message_text=request.message,
        phone=normalized_phone,
    )

    legacy_alert = await _mirror_legacy_alert(
        db=db,
        report=formal_report,
        message=message,
        analysis=analysis,
        phone=normalized_phone,
        owner_user_id=owner_user_id,
    )
    formal_report.legacy_alert_uuid = legacy_alert.uuid if legacy_alert else None
    db.add(formal_report)

    queued_for_osint = await _enqueue_forensic_capture(
        report_uuid=str(formal_report.uuid),
        legacy_alert_uuid=str(legacy_alert.uuid) if legacy_alert else None,
        source_type=f"CITIZEN_{request.channel}",
        url=(request.url or "").strip() or None,
    )

    campaign_detected = await _register_campaign_detection(
        db=db,
        report=formal_report,
        matched_rules=[str(rule) for rule in matched_rules],
    )

    await db.commit()
    await db.refresh(formal_report)
    if formal_report.id is not None:
        await schedule_external_transmissions_for_report(
            db=db,
            report_id=int(formal_report.id),
            campaign_detected=campaign_detected,
        )

    return IncidentReportData(
        alert_uuid=legacy_alert.uuid if legacy_alert else formal_report.uuid,
        status="NEW",
        risk_score_initial=analysis.risk_score,
        queued_for_osint=bool(queued_for_osint),
        report_uuid=formal_report.uuid,
        public_reference=formal_report.public_reference,
    )


def _build_existing_report_response(report: FormalReport) -> IncidentReportData:
    return IncidentReportData(
        alert_uuid=report.legacy_alert_uuid or report.uuid,
        status="NEW",
        risk_score_initial=int(report.analysis.risk_score if report.analysis else 0),
        queued_for_osint=False,
        report_uuid=report.uuid,
        public_reference=report.public_reference,
    )


async def _load_mobile_verification_message(
    *,
    db: AsyncSession,
    message_uuid: uuid.UUID | None,
    analysis_uuid: uuid.UUID | None,
    device_install_id: str | None,
) -> CitizenMessage | None:
    if not message_uuid or not analysis_uuid or not device_install_id:
        return None

    stmt = (
        select(CitizenMessage)
        .options(
            selectinload(CitizenMessage.analysis),
            selectinload(CitizenMessage.reports).selectinload(FormalReport.analysis),
        )
        .where(
            CitizenMessage.uuid == message_uuid,
            CitizenMessage.device_install_id == device_install_id,
            CitizenMessage.channel == "MOBILE_APP",
        )
    )
    result = await db.execute(stmt)
    message = result.scalar_one_or_none()
    if message is None or message.analysis is None:
        return None
    if message.analysis.uuid != analysis_uuid:
        return None
    return message


async def _upsert_suspect_number(db: AsyncSession, phone: str) -> SuspectNumber:
    phone_hash = derive_phone_hash(phone)
    suspect_number = await db.scalar(select(SuspectNumber).where(SuspectNumber.phone_hash == phone_hash))
    if suspect_number is None:
        suspect_number = SuspectNumber(
            phone_hash=phone_hash,
            phone_ciphertext=encrypt_phone(phone),
            report_count=1,
        )
        db.add(suspect_number)
        await db.flush()
        return suspect_number

    suspect_number.report_count = int(suspect_number.report_count or 0) + 1
    suspect_number.phone_ciphertext = encrypt_phone(phone)
    suspect_number.last_seen = datetime.now(timezone.utc)
    db.add(suspect_number)
    await db.flush()
    return suspect_number


async def _store_citizen_screenshots(
    report: FormalReport,
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
        duplicate = await db.scalar(select(EvidenceItem).where(EvidenceItem.file_hash == digest))
        if duplicate is not None:
            continue
        ext = Path(screenshot.filename or "").suffix.lower()
        if not ext:
            ext = ".png" if content_type == "image/png" else ".jpg"

        relative_path = f"citizen_uploads/{report.uuid}_{idx}_{digest[:12]}{ext}"
        absolute_path = base_dir / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(file_bytes)

        db.add(
            EvidenceItem(
                report_id=report.id,
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
        )

    await db.flush()


async def _create_impersonation_incidents_if_needed(
    db: AsyncSession,
    report: FormalReport,
    message_text: str,
    phone: str,
) -> None:
    normalized_message = _normalize_text(message_text)
    if not normalized_message:
        return

    stmt = select(BusinessProfile).where(BusinessProfile.validation_status == "ACTIVE")
    business_profiles = (await db.execute(stmt)).scalars().all()
    if not business_profiles:
        return

    for profile in business_profiles:
        keywords = profile.keywords_json or []
        for keyword in keywords:
            normalized_keyword = _normalize_text(str(keyword))
            if normalized_keyword and normalized_keyword in normalized_message:
                custody_hash = compute_snapshot_hash(
                    {
                        "business_profile_id": profile.id,
                        "formal_report_id": report.id,
                        "keyword": normalized_keyword,
                        "phone_hash": derive_phone_hash(phone),
                    }
                )
                db.add(
                    ImpersonationIncident(
                        business_profile_id=profile.id,
                        formal_report_id=report.id,
                        status="NEW",
                        detection_reason=f"keyword_match:{normalized_keyword}",
                        custody_hash=custody_hash,
                    )
                )
                break

    await db.flush()


async def _mirror_legacy_alert(
    db: AsyncSession,
    report: FormalReport,
    message: CitizenMessage,
    analysis: MessageAnalysis,
    phone: str,
    owner_user_id: int | None,
) -> Alert:
    categories, entities = build_legacy_analysis_payload(analysis)
    legacy_alert = Alert(
        uuid=uuid.uuid4(),
        url=message.submitted_url or "citizen://text-signal",
        source_type=f"CITIZEN_{message.channel}",
        phone_number=phone,
        reported_message=message.content,
        citizen_channel=message.channel,
        owner_user_id=owner_user_id,
        risk_score=analysis.risk_score,
        status=report.status,
        analysis_note=f"[TRANSITION_REF={report.public_reference}] {message.content[:220]}",
    )
    db.add(legacy_alert)
    await db.flush()
    db.add(
        AnalysisResult(
            alert_id=legacy_alert.id,
            categories=categories,
            entities=entities,
        )
    )

    evidence_items = (
        await db.execute(select(EvidenceItem).where(EvidenceItem.report_id == report.id))
    ).scalars().all()
    for item in evidence_items:
        db.add(
            Evidence(
                alert_id=legacy_alert.id,
                type=item.type,
                file_path=item.file_path,
                file_hash=item.file_hash,
                content_text_preview=item.content_text_preview,
                metadata_json=item.metadata_json,
            )
        )

    await db.flush()
    return legacy_alert


async def _register_campaign_detection(
    *,
    db: AsyncSession,
    report: FormalReport,
    matched_rules: list[str],
) -> bool:
    if not matched_rules:
        return False

    redis_client = None
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        campaign_data = await register_signal(
            redis_client=redis_client,
            incident_id=str(report.uuid),
            matched_rules=matched_rules,
            region=None,
        )
        if campaign_data.get("campaign_detected"):
            await create_or_update_campaign(db=db, campaign_data=campaign_data, dominant_region=None)
            return True
        return False
    except Exception:
        logger.exception("Failed to register campaign detection for report", extra={"report_uuid": str(report.uuid)})
        return False
    finally:
        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                logger.warning("Failed to close Redis client after campaign detection")


async def _enqueue_forensic_capture(
    report_uuid: str,
    legacy_alert_uuid: str | None,
    source_type: str,
    url: str | None,
) -> bool:
    if not url or not url.lower().startswith(("http://", "https://")):
        return False

    redis_client = None
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        task_payload = {
            "id": legacy_alert_uuid or report_uuid,
            "report_uuid": report_uuid,
            "url": url,
            "source_type": source_type,
        }
        await redis_client.rpush("osint_to_scan", json.dumps(task_payload))
        return True
    except Exception:
        logger.exception("Failed to enqueue citizen report forensic capture", extra={"report_uuid": report_uuid})
        return False
    finally:
        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                logger.warning("Failed to close Redis client after citizen queueing")
