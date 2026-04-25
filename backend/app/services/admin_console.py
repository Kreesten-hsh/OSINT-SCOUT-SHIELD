from __future__ import annotations

import csv
import json
import re
import uuid
from datetime import datetime, time, timedelta, timezone
from io import StringIO
from typing import Any

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    BusinessProfile,
    ExternalTransmission,
    FormalReport,
    ForensicBundle,
    ImpersonationIncident,
    MessageAnalysis,
    SuspectNumber,
)
from app.schemas.admin_console import (
    AdminCategoryCount,
    AdminDashboardBusinessTargetItem,
    AdminDashboardData,
    AdminDashboardRecentReportItem,
    AdminDashboardRecentTransmissionItem,
    AdminDashboardTopNumberItem,
    AdminDailyCount,
    AdminTransmissionListData,
    AdminTransmissionListItem,
)
from app.services.phone_privacy import decrypt_phone, derive_phone_hash, mask_phone, normalize_phone


PHONE_PATTERN = re.compile(r"^\+?[0-9]{8,15}$")
REPORT_STATUS_ORDER = ["NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"]
TRANSMISSION_STATUS_ORDER = ["PENDING", "QUEUED", "SENT", "RETRYING", "FAILED", "DELIVERED"]


def _status_map(order: list[str]) -> dict[str, int]:
    return {status: 0 for status in order}


def _safe_mask_phone(phone_ciphertext: str | None) -> str:
    if not phone_ciphertext:
        return "-"
    try:
        return mask_phone(decrypt_phone(phone_ciphertext))
    except Exception:
        return "-"


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


def _report_export_record(report: FormalReport) -> dict[str, Any]:
    businesses = sorted(
        {
            incident.business_profile.official_name
            for incident in (report.impersonation_incidents or [])
            if incident.business_profile is not None and incident.business_profile.official_name
        }
    )
    transmissions = [
        transmission
        for bundle in (report.forensic_bundles or [])
        for transmission in (bundle.transmissions or [])
    ]
    transmission_labels = [
        f"{transmission.target_type}:{transmission.status}"
        for transmission in transmissions
    ]
    bundle_statuses = [bundle.status for bundle in (report.forensic_bundles or []) if bundle.status]
    risk_score = int(report.analysis.risk_score if report.analysis else 0)
    return {
        "public_reference": report.public_reference,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "status": report.status,
        "risk_score": risk_score,
        "risk_level": _risk_level(risk_score),
        "primary_category": _primary_category(report),
        "channel": report.message.channel if report.message else "WEB_PORTAL",
        "suspect_phone_masked": _safe_mask_phone(report.suspect_number.phone_ciphertext if report.suspect_number else None),
        "message_preview": ((report.message.content if report.message else "") or "")[:180],
        "evidence_count": len(report.evidence_items or []),
        "business_targets": businesses,
        "bundle_statuses": bundle_statuses,
        "transmissions": transmission_labels,
    }


async def _load_export_reports(db: AsyncSession) -> list[FormalReport]:
    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
            selectinload(FormalReport.impersonation_incidents).selectinload(ImpersonationIncident.business_profile),
            selectinload(FormalReport.forensic_bundles).selectinload(ForensicBundle.transmissions),
        )
        .order_by(FormalReport.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().unique().all()


async def get_admin_dashboard(db: AsyncSession) -> AdminDashboardData:
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=6)).date()
    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)

    total_reports = int((await db.execute(select(func.count(FormalReport.id)))).scalar_one() or 0)
    daily_reports = int(
        (
            await db.execute(
                select(func.count(FormalReport.id)).where(FormalReport.created_at >= today_start)
            )
        ).scalar_one()
        or 0
    )
    open_reports = int(
        (
            await db.execute(
                select(func.count(FormalReport.id)).where(FormalReport.status.in_(["NEW", "IN_REVIEW"]))
            )
        ).scalar_one()
        or 0
    )
    confirmed_reports = int(
        (
            await db.execute(
                select(func.count(FormalReport.id)).where(FormalReport.status == "CONFIRMED")
            )
        ).scalar_one()
        or 0
    )
    bundles_ready = int(
        (
            await db.execute(
                select(func.count(ForensicBundle.id)).where(
                    or_(
                        ForensicBundle.status != "PENDING",
                        ForensicBundle.pdf_path.is_not(None),
                        ForensicBundle.json_path.is_not(None),
                        ForensicBundle.zip_path.is_not(None),
                    )
                )
            )
        ).scalar_one()
        or 0
    )
    active_businesses = int(
        (
            await db.execute(
                select(func.count(BusinessProfile.id)).where(BusinessProfile.validation_status == "ACTIVE")
            )
        ).scalar_one()
        or 0
    )
    pending_businesses = int(
        (
            await db.execute(
                select(func.count(BusinessProfile.id)).where(BusinessProfile.validation_status == "PENDING_APPROVAL")
            )
        ).scalar_one()
        or 0
    )

    reports_by_day_rows = (
        await db.execute(
            select(func.date(FormalReport.created_at).label("day"), func.count(FormalReport.id).label("count"))
            .where(FormalReport.created_at >= start_dt)
            .group_by(func.date(FormalReport.created_at))
            .order_by(func.date(FormalReport.created_at).asc())
        )
    ).all()
    day_map = {str(day): int(count) for day, count in reports_by_day_rows}
    reports_by_day = [
        AdminDailyCount(
            date=(start_date + timedelta(days=offset)).isoformat(),
            count=day_map.get((start_date + timedelta(days=offset)).isoformat(), 0),
        )
        for offset in range(7)
    ]

    reports_by_status = _status_map(REPORT_STATUS_ORDER)
    for status, count in (
        await db.execute(select(FormalReport.status, func.count(FormalReport.id)).group_by(FormalReport.status))
    ).all():
        if status in reports_by_status:
            reports_by_status[str(status)] = int(count or 0)

    transmissions_by_status = _status_map(TRANSMISSION_STATUS_ORDER)
    for status, count in (
        await db.execute(
            select(ExternalTransmission.status, func.count(ExternalTransmission.id)).group_by(ExternalTransmission.status)
        )
    ).all():
        if status in transmissions_by_status:
            transmissions_by_status[str(status)] = int(count or 0)

    reports_by_category_rows = (
        await db.execute(
            select(
                func.coalesce(MessageAnalysis.primary_category, "non_classe").label("category"),
                func.count(FormalReport.id).label("count"),
            )
            .select_from(FormalReport)
            .join(MessageAnalysis, FormalReport.analysis_id == MessageAnalysis.id)
            .group_by("category")
            .order_by(desc("count"), "category")
            .limit(5)
        )
    ).all()

    recent_reports_stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
        )
        .order_by(FormalReport.created_at.desc())
        .limit(5)
    )
    recent_reports = (await db.execute(recent_reports_stmt)).scalars().all()

    recent_transmissions_stmt = (
        select(ExternalTransmission, FormalReport)
        .join(ForensicBundle, ExternalTransmission.bundle_id == ForensicBundle.id)
        .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
        .order_by(ExternalTransmission.created_at.desc())
        .limit(5)
    )
    recent_transmissions = (await db.execute(recent_transmissions_stmt)).all()

    top_business_rows = (
        await db.execute(
            select(
                BusinessProfile.uuid,
                BusinessProfile.official_name,
                func.count(ImpersonationIncident.id).label("incidents_count"),
                func.max(ImpersonationIncident.created_at).label("last_incident_at"),
            )
            .join(ImpersonationIncident, ImpersonationIncident.business_profile_id == BusinessProfile.id)
            .group_by(BusinessProfile.id, BusinessProfile.uuid, BusinessProfile.official_name)
            .order_by(desc("incidents_count"), desc("last_incident_at"))
            .limit(5)
        )
    ).all()

    top_numbers_stmt = (
        select(SuspectNumber)
        .order_by(SuspectNumber.report_count.desc(), SuspectNumber.last_seen.desc())
        .limit(5)
    )
    top_numbers = (await db.execute(top_numbers_stmt)).scalars().all()

    transmissions_pending = sum(
        transmissions_by_status.get(status, 0) for status in ("PENDING", "QUEUED", "SENT", "RETRYING")
    )
    transmissions_failed = transmissions_by_status.get("FAILED", 0)
    transmissions_delivered = transmissions_by_status.get("DELIVERED", 0)
    transmissions_total = sum(transmissions_by_status.values())
    transmission_success_rate = round(
        (transmissions_delivered / transmissions_total) * 100 if transmissions_total else 0.0,
        1,
    )
    active_campaigns = int(
        (
            await db.execute(
                select(func.count(SuspectNumber.id)).where(SuspectNumber.report_count >= 3)
            )
        ).scalar_one()
        or 0
    )

    return AdminDashboardData(
        total_reports=total_reports,
        daily_reports=daily_reports,
        open_reports=open_reports,
        confirmed_reports=confirmed_reports,
        bundles_ready=bundles_ready,
        active_businesses=active_businesses,
        pending_businesses=pending_businesses,
        transmissions_pending=transmissions_pending,
        transmissions_failed=transmissions_failed,
        transmission_success_rate=transmission_success_rate,
        active_campaigns=active_campaigns,
        reports_by_day=reports_by_day,
        reports_by_category=[
            AdminCategoryCount(category=str(row.category or "non_classe"), count=int(row.count or 0))
            for row in reports_by_category_rows
        ],
        reports_by_status=reports_by_status,
        transmissions_by_status=transmissions_by_status,
        recent_reports=[
            AdminDashboardRecentReportItem(
                report_uuid=report.uuid,
                legacy_alert_uuid=report.legacy_alert_uuid,
                public_reference=report.public_reference,
                status=report.status,
                risk_score=int(report.analysis.risk_score if report.analysis else 0),
                message_preview=((report.message.content if report.message else "") or "")[:160],
                suspect_phone_masked=_safe_mask_phone(
                    report.suspect_number.phone_ciphertext if report.suspect_number else None
                ),
                created_at=report.created_at,
            )
            for report in recent_reports
        ],
        top_targeted_businesses=[
            AdminDashboardBusinessTargetItem(
                business_uuid=row.uuid,
                official_name=row.official_name,
                incidents_count=int(row.incidents_count or 0),
                last_incident_at=row.last_incident_at,
            )
            for row in top_business_rows
        ],
        top_suspect_numbers=[
            AdminDashboardTopNumberItem(
                suspect_number_uuid=number.uuid,
                masked_phone=_safe_mask_phone(number.phone_ciphertext),
                reports_count=int(number.report_count or 0),
                last_seen=number.last_seen,
            )
            for number in top_numbers
        ],
        recent_transmissions=[
            AdminDashboardRecentTransmissionItem(
                transmission_uuid=transmission.uuid,
                public_reference=report.public_reference,
                target_type=transmission.target_type,
                status=transmission.status,
                created_at=transmission.created_at,
                delivered_at=transmission.delivered_at,
            )
            for transmission, report in recent_transmissions
        ],
    )


async def list_admin_transmissions(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    target_filter: str | None = None,
    search: str | None = None,
) -> AdminTransmissionListData:
    filters = []
    summary_filters = []

    if target_filter:
        target_clause = ExternalTransmission.target_type == target_filter
        filters.append(target_clause)
        summary_filters.append(target_clause)

    if search and search.strip():
        search_value = search.strip()
        term = f"%{search_value}%"
        search_filters = [
            FormalReport.public_reference.ilike(term),
            ExternalTransmission.ack_reference.ilike(term),
            ExternalTransmission.target_endpoint.ilike(term),
            BusinessProfile.official_name.ilike(term),
        ]
        try:
            normalized_phone = normalize_phone(search_value)
            if PHONE_PATTERN.match(normalized_phone):
                search_filters.append(SuspectNumber.phone_hash == derive_phone_hash(normalized_phone))
        except Exception:
            pass
        search_clause = or_(*search_filters)
        filters.append(search_clause)
        summary_filters.append(search_clause)

    if status_filter:
        filters.append(ExternalTransmission.status == status_filter)

    base_query = (
        select(ExternalTransmission)
        .join(ForensicBundle, ExternalTransmission.bundle_id == ForensicBundle.id)
        .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
        .join(SuspectNumber, FormalReport.suspect_number_id == SuspectNumber.id)
        .outerjoin(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .outerjoin(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
    )

    total = int(
        (
            await db.execute(
                select(func.count(func.distinct(ExternalTransmission.id)))
                .select_from(ExternalTransmission)
                .join(ForensicBundle, ExternalTransmission.bundle_id == ForensicBundle.id)
                .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
                .join(SuspectNumber, FormalReport.suspect_number_id == SuspectNumber.id)
                .outerjoin(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
                .outerjoin(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
                .where(*filters)
            )
        ).scalar_one()
        or 0
    )

    transmissions = (
        await db.execute(
            base_query.options(
                selectinload(ExternalTransmission.bundle)
                .selectinload(ForensicBundle.report)
                .selectinload(FormalReport.analysis),
                selectinload(ExternalTransmission.bundle)
                .selectinload(ForensicBundle.report)
                .selectinload(FormalReport.suspect_number),
            )
            .where(*filters)
            .order_by(ExternalTransmission.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    ).scalars().unique().all()

    status_counts = _status_map(TRANSMISSION_STATUS_ORDER)
    for status, count in (
        await db.execute(
            select(ExternalTransmission.status, func.count(func.distinct(ExternalTransmission.id)))
            .select_from(ExternalTransmission)
            .join(ForensicBundle, ExternalTransmission.bundle_id == ForensicBundle.id)
            .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
            .join(SuspectNumber, FormalReport.suspect_number_id == SuspectNumber.id)
            .outerjoin(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
            .outerjoin(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
            .where(*summary_filters)
            .group_by(ExternalTransmission.status)
        )
    ).all():
        if status in status_counts:
            status_counts[str(status)] = int(count or 0)

    items = []
    for transmission in transmissions:
        bundle = transmission.bundle
        report = bundle.report if bundle else None
        if bundle is None or report is None:
            continue
        items.append(
            AdminTransmissionListItem(
                transmission_uuid=transmission.uuid,
                bundle_uuid=bundle.uuid,
                report_uuid=report.uuid,
                public_reference=report.public_reference,
                target_type=transmission.target_type,
                target_endpoint=transmission.target_endpoint,
                bundle_status=bundle.status,
                status=transmission.status,
                attempts=int(transmission.attempts or 0),
                ack_reference=transmission.ack_reference,
                next_retry_at=transmission.next_retry_at,
                last_error=transmission.last_error,
                created_at=transmission.created_at,
                delivered_at=transmission.delivered_at,
                risk_score=int(report.analysis.risk_score if report.analysis else 0),
                primary_category=_primary_category(report),
                suspect_phone_masked=_safe_mask_phone(
                    report.suspect_number.phone_ciphertext if report.suspect_number else None
                ),
            )
        )

    return AdminTransmissionListData(
        items=items,
        total=total,
        pending_count=status_counts["PENDING"],
        queued_count=status_counts["QUEUED"],
        sent_count=status_counts["SENT"],
        retrying_count=status_counts["RETRYING"],
        failed_count=status_counts["FAILED"],
        delivered_count=status_counts["DELIVERED"],
    )


async def build_admin_csv_export(db: AsyncSession) -> tuple[str, bytes]:
    reports = await _load_export_reports(db)
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "public_reference",
            "created_at",
            "status",
            "risk_score",
            "risk_level",
            "primary_category",
            "channel",
            "suspect_phone_masked",
            "message_preview",
            "evidence_count",
            "business_targets",
            "bundle_statuses",
            "transmissions",
        ],
    )
    writer.writeheader()
    for report in reports:
        row = _report_export_record(report)
        writer.writerow(
            {
                **row,
                "business_targets": " | ".join(row["business_targets"]),
                "bundle_statuses": " | ".join(row["bundle_statuses"]),
                "transmissions": " | ".join(row["transmissions"]),
            }
        )

    filename = f"benin_cyber_shield_admin_export_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}.csv"
    return filename, output.getvalue().encode("utf-8")


async def build_admin_stix_lite_export(db: AsyncSession) -> tuple[str, bytes]:
    reports = await _load_export_reports(db)
    objects = []
    for report in reports:
        row = _report_export_record(report)
        objects.append(
            {
                "type": "incident",
                "id": f"incident--{report.uuid}",
                "name": row["public_reference"],
                "created": row["created_at"],
                "modified": row["created_at"],
                "labels": [value for value in [row["primary_category"], row["status"]] if value],
                "confidence": max(0, min(int(row["risk_score"] or 0), 100)),
                "description": row["message_preview"],
                "x_benin_cyber_shield": {
                    "public_reference": row["public_reference"],
                    "status": row["status"],
                    "risk_score": row["risk_score"],
                    "risk_level": row["risk_level"],
                    "channel": row["channel"],
                    "suspect_phone_masked": row["suspect_phone_masked"],
                    "business_targets": row["business_targets"],
                    "bundle_statuses": row["bundle_statuses"],
                    "transmissions": row["transmissions"],
                    "evidence_count": row["evidence_count"],
                },
            }
        )

    payload = {
        "type": "bundle",
        "id": f"bundle--{uuid.uuid4()}",
        "spec_version": "2.1",
        "x_format": "stix-lite",
        "created": datetime.now(timezone.utc).isoformat(),
        "objects": objects,
    }
    filename = f"benin_cyber_shield_admin_stix_lite_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}.json"
    return filename, json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
