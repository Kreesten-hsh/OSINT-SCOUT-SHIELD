from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models import ExternalTransmission, FormalReport, ForensicBundle, ImpersonationIncident
from app.services.phone_privacy import decrypt_phone, mask_phone


logger = logging.getLogger(__name__)
TRANSMISSION_QUEUE = "external_transmissions_queue"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def compute_transmission_reasons(report_count: int, campaign_detected: bool) -> list[str]:
    reasons: list[str] = []
    if int(report_count or 0) >= int(settings.EXTERNAL_NUMBER_THRESHOLD):
        reasons.append("NUMBER_THRESHOLD_REACHED")
    if campaign_detected:
        reasons.append("CAMPAIGN_THRESHOLD_REACHED")
    return reasons


def _target_endpoint(target_type: str) -> str:
    if target_type == "ANSSI_OCRC":
        return settings.EXTERNAL_ANSSI_RECEIVER_URL
    return settings.EXTERNAL_OPERATORS_RECEIVER_URL


def _primary_category(report: FormalReport) -> str | None:
    analysis = report.analysis
    if analysis is None:
        return None
    if analysis.primary_category:
        return analysis.primary_category
    categories = analysis.categories_detected or []
    if categories:
        return str(categories[0])
    return None


def _risk_level(score: int) -> str:
    if score >= 65:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _business_targets(report: FormalReport) -> list[str]:
    return sorted(
        {
            incident.business_profile.official_name
            for incident in (report.impersonation_incidents or [])
            if incident.business_profile is not None and incident.business_profile.official_name
        }
    )


def _build_common_payload(
    *,
    report: FormalReport,
    bundle: ForensicBundle,
    reasons: list[str],
) -> dict[str, Any]:
    phone_number = None
    masked_phone = "-"
    if report.suspect_number is not None:
        try:
            phone_number = decrypt_phone(report.suspect_number.phone_ciphertext)
            masked_phone = mask_phone(phone_number)
        except Exception:
            logger.warning("Unable to decrypt suspect number for external payload", extra={"report_uuid": str(report.uuid)})

    risk_score = int(report.analysis.risk_score if report.analysis else 0)
    return {
        "public_reference": report.public_reference,
        "report_uuid": str(report.uuid),
        "legacy_alert_uuid": str(report.legacy_alert_uuid) if report.legacy_alert_uuid else None,
        "bundle_uuid": str(bundle.uuid),
        "bundle_hash_sha256": bundle.global_hash,
        "bundle_status": bundle.status,
        "risk_score": risk_score,
        "risk_level": _risk_level(risk_score),
        "primary_category": _primary_category(report),
        "trigger_reasons": reasons,
        "channel": report.message.channel if report.message else "WEB_PORTAL",
        "message_preview": ((report.message.content if report.message else "") or "")[:200],
        "suspect_phone_number": phone_number,
        "suspect_phone_masked": masked_phone,
        "report_count_for_number": int(report.suspect_number.report_count if report.suspect_number else 0),
        "business_targets": _business_targets(report),
        "custody_hash": report.custody_hash,
        "generated_at": _utc_now().isoformat(),
    }


def _build_payload_for_target(
    *,
    target_type: str,
    report: FormalReport,
    bundle: ForensicBundle,
    reasons: list[str],
) -> dict[str, Any]:
    common = _build_common_payload(report=report, bundle=bundle, reasons=reasons)
    artifacts = {
        "pdf_path": bundle.pdf_path,
        "json_path": bundle.json_path,
        "zip_path": bundle.zip_path,
    }
    if target_type == "ANSSI_OCRC":
        return {
            "payload_type": "FORENSIC_CASE",
            "target_type": target_type,
            **common,
            "evidence_count": len(report.evidence_items or []),
            "artifacts": artifacts,
            "manifest": bundle.manifest_json or {},
        }
    return {
        "payload_type": "THREAT_INTELLIGENCE",
        "target_type": target_type,
        **common,
        "artifacts": artifacts,
        "last_seen": report.suspect_number.last_seen.isoformat() if report.suspect_number and report.suspect_number.last_seen else None,
    }


async def _load_report_for_transmission(db: AsyncSession, report_id: int) -> FormalReport | None:
    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
            selectinload(FormalReport.forensic_bundles).selectinload(ForensicBundle.transmissions),
            selectinload(FormalReport.impersonation_incidents).selectinload(ImpersonationIncident.business_profile),
        )
        .where(FormalReport.id == report_id)
    )
    return (await db.execute(stmt)).scalars().first()


async def _ensure_forensic_bundle(db: AsyncSession, report: FormalReport) -> ForensicBundle:
    if report.forensic_bundles:
        return sorted(
            report.forensic_bundles,
            key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )[0]

    from app.api.v1.endpoints.reports import _create_bundle_for_formal_report, _load_legacy_alert_with_evidences

    legacy_alert = await _load_legacy_alert_with_evidences(db, report.legacy_alert_uuid)
    return await _create_bundle_for_formal_report(db=db, formal_report=report, legacy_alert=legacy_alert)


async def _push_transmission_to_queue(transmission_uuid: uuid.UUID) -> None:
    redis_client = None
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.rpush(TRANSMISSION_QUEUE, str(transmission_uuid))
    except Exception:
        logger.exception("Failed to queue external transmission", extra={"transmission_uuid": str(transmission_uuid)})
    finally:
        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                logger.warning("Failed to close Redis client after queueing external transmission")


async def schedule_external_transmissions_for_report(
    *,
    db: AsyncSession,
    report_id: int,
    campaign_detected: bool = False,
) -> list[ExternalTransmission]:
    report = await _load_report_for_transmission(db, report_id)
    if report is None or report.suspect_number is None:
        return []

    reasons = compute_transmission_reasons(
        report_count=int(report.suspect_number.report_count or 0),
        campaign_detected=campaign_detected,
    )
    if not reasons:
        return []

    bundle = await _ensure_forensic_bundle(db, report)
    existing_targets = {transmission.target_type for transmission in (bundle.transmissions or [])}
    created: list[ExternalTransmission] = []
    for target_type in ("ANSSI_OCRC", "OPERATORS"):
        if target_type in existing_targets:
            continue
        transmission = ExternalTransmission(
            bundle_id=bundle.id,
            target_type=target_type,
            target_endpoint=_target_endpoint(target_type),
            payload_json=_build_payload_for_target(
                target_type=target_type,
                report=report,
                bundle=bundle,
                reasons=reasons,
            ),
            status="QUEUED",
            attempts=0,
        )
        db.add(transmission)
        created.append(transmission)

    if not created:
        return []

    bundle.status = "QUEUED"
    db.add(bundle)
    await db.commit()
    for transmission in created:
        await db.refresh(transmission)
        await _push_transmission_to_queue(transmission.uuid)
    return created


async def send_external_payload(
    *,
    target_url: str,
    payload: dict[str, Any],
) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            target_url,
            json=payload,
            headers={"X-Transmission-Secret": settings.EXTERNAL_TRANSMISSION_SHARED_SECRET},
        )
        response.raise_for_status()
        data = response.json()
    ack_reference = ((data.get("data") or {}).get("ack_reference")) or data.get("ack_reference")
    if not ack_reference:
        ack_reference = f"ACK-{uuid.uuid4().hex[:12].upper()}"
    return str(ack_reference)


def _recompute_bundle_status(bundle: ForensicBundle) -> tuple[str, datetime | None]:
    statuses = {transmission.status for transmission in (bundle.transmissions or [])}
    now = _utc_now()
    if statuses and statuses == {"DELIVERED"}:
        return "DELIVERED", now
    if "RETRYING" in statuses:
        return "RETRYING", None
    if "FAILED" in statuses and statuses.issubset({"FAILED", "DELIVERED"}):
        return "FAILED", None
    if statuses & {"PENDING", "QUEUED", "SENT"}:
        return "QUEUED", None
    return bundle.status, bundle.transmitted_at


async def process_external_transmission(
    *,
    db: AsyncSession,
    transmission_uuid: uuid.UUID,
    sender=send_external_payload,
) -> ExternalTransmission | None:
    stmt = (
        select(ExternalTransmission)
        .options(
            selectinload(ExternalTransmission.bundle)
            .selectinload(ForensicBundle.transmissions),
            selectinload(ExternalTransmission.bundle)
            .selectinload(ForensicBundle.report),
        )
        .where(ExternalTransmission.uuid == transmission_uuid)
    )
    transmission = (await db.execute(stmt)).scalars().first()
    if transmission is None:
        return None

    now = _utc_now()
    if transmission.next_retry_at and transmission.next_retry_at > now:
        return transmission

    transmission.attempts = int(transmission.attempts or 0) + 1
    transmission.status = "SENT"
    transmission.last_error = None
    db.add(transmission)
    await db.commit()

    try:
        ack_reference = await sender(
            target_url=transmission.target_endpoint or _target_endpoint(transmission.target_type),
            payload=transmission.payload_json or {},
        )
    except Exception as exc:
        transmission.last_error = str(exc)
        if int(transmission.attempts or 0) >= int(settings.EXTERNAL_MAX_ATTEMPTS):
            transmission.status = "FAILED"
            transmission.next_retry_at = None
        else:
            transmission.status = "RETRYING"
            transmission.next_retry_at = now + timedelta(seconds=int(settings.EXTERNAL_RETRY_DELAY_SECONDS))
        db.add(transmission)
    else:
        transmission.status = "DELIVERED"
        transmission.ack_reference = ack_reference
        transmission.next_retry_at = None
        transmission.delivered_at = _utc_now()
        transmission.last_error = None
        db.add(transmission)

    if transmission.bundle is not None:
        bundle_status, transmitted_at = _recompute_bundle_status(transmission.bundle)
        transmission.bundle.status = bundle_status
        transmission.bundle.transmitted_at = transmitted_at
        db.add(transmission.bundle)

    await db.commit()
    await db.refresh(transmission)
    return transmission


def build_external_delivery_ack(target_type: str) -> dict[str, Any]:
    return {
        "target_type": target_type,
        "received": True,
        "ack_reference": f"{target_type}-{uuid.uuid4().hex[:10].upper()}",
    }
