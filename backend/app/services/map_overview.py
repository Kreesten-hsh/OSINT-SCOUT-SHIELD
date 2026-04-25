from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import ExternalTransmission, ForensicBundle, FormalReport
from app.schemas.map_overview import DepartmentMapPoint, MapOverviewData, MapOverviewTransmissionItem, RiskFilter, WindowFilter
from app.services.benin_geography import BENIN_DEPARTMENT_COORDS, derive_department_from_phone, normalize_department_name
from app.services.phone_privacy import decrypt_phone


def _window_to_days(value: str | None) -> tuple[WindowFilter, int]:
    if value == "30d":
        return "30d", 30
    return "7d", 7


def _normalize_risk(value: str | None) -> RiskFilter:
    if value in {"high", "medium", "low"}:
        return value
    return "all"


def _risk_matches(risk_filter: RiskFilter, risk_score: int) -> bool:
    if risk_filter == "high":
        return risk_score >= 65
    if risk_filter == "medium":
        return 35 <= risk_score < 65
    if risk_filter == "low":
        return risk_score < 35
    return True


def _resolve_report_department(report: FormalReport) -> str | None:
    message = report.message
    explicit_department = normalize_department_name(message.department if message else None)
    if explicit_department:
        return explicit_department

    suspect_number = report.suspect_number
    if suspect_number is None:
        return None
    try:
        phone = decrypt_phone(suspect_number.phone_ciphertext)
    except Exception:
        return None
    return derive_department_from_phone(phone)


async def get_map_overview(
    db: AsyncSession,
    *,
    window: str | None = None,
    risk: str | None = None,
    category: str | None = None,
) -> MapOverviewData:
    normalized_window, days = _window_to_days(window)
    normalized_risk = _normalize_risk(risk)
    category_filter = (category or "").strip().lower() or None

    start_dt = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(FormalReport)
        .where(FormalReport.created_at >= start_dt)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.forensic_bundles).selectinload(ForensicBundle.transmissions),
        )
        .order_by(FormalReport.created_at.desc())
    )
    reports = (await db.execute(stmt)).scalars().unique().all()

    department_buckets: dict[str, dict[str, object]] = {}
    overall_category_counts: Counter[str] = Counter()
    total_reports = 0
    high_risk_reports = 0
    recent_transmissions: list[MapOverviewTransmissionItem] = []

    for report in reports:
        analysis = report.analysis
        if analysis is None:
            continue

        risk_score = int(analysis.risk_score or 0)
        if not _risk_matches(normalized_risk, risk_score):
            continue

        primary_category = (analysis.primary_category or "").strip() or None
        if category_filter and (primary_category or "").lower() != category_filter:
            continue

        total_reports += 1
        if risk_score >= 65:
            high_risk_reports += 1
        if primary_category:
            overall_category_counts[primary_category] += 1

        department = _resolve_report_department(report)
        if department and department in BENIN_DEPARTMENT_COORDS:
            bucket = department_buckets.setdefault(
                department,
                {
                    "count": 0,
                    "high_risk_count": 0,
                    "latest_report_at": None,
                    "category_counts": Counter(),
                },
            )
            bucket["count"] = int(bucket["count"]) + 1
            if risk_score >= 65:
                bucket["high_risk_count"] = int(bucket["high_risk_count"]) + 1
            if primary_category:
                category_counts = bucket["category_counts"]
                assert isinstance(category_counts, Counter)
                category_counts[primary_category] += 1
            latest_report_at = bucket["latest_report_at"]
            if latest_report_at is None or (report.created_at and report.created_at > latest_report_at):
                bucket["latest_report_at"] = report.created_at

        for bundle in report.forensic_bundles or []:
            for transmission in bundle.transmissions or []:
                recent_transmissions.append(
                    MapOverviewTransmissionItem(
                        transmission_uuid=transmission.uuid,
                        public_reference=report.public_reference,
                        department=department,
                        target_type=transmission.target_type,
                        status=transmission.status,
                        created_at=transmission.created_at,
                    )
                )

    department_points: list[DepartmentMapPoint] = []
    for department, payload in department_buckets.items():
        category_counts = payload.get("category_counts", Counter())
        dominant_category = None
        if isinstance(category_counts, Counter) and category_counts:
            dominant_category = category_counts.most_common(1)[0][0]
        latitude, longitude = BENIN_DEPARTMENT_COORDS[department]
        department_points.append(
            DepartmentMapPoint(
                department=department,
                latitude=latitude,
                longitude=longitude,
                count=int(payload["count"]),
                high_risk_count=int(payload["high_risk_count"]),
                dominant_category=dominant_category,
                latest_report_at=payload.get("latest_report_at"),
            )
        )

    department_points.sort(key=lambda item: (-item.count, item.department))
    recent_transmissions.sort(key=lambda item: item.created_at, reverse=True)

    dominant_category = overall_category_counts.most_common(1)[0][0] if overall_category_counts else None

    return MapOverviewData(
        window=normalized_window,
        risk=normalized_risk,
        category=category_filter,
        total_reports=total_reports,
        high_risk_reports=high_risk_reports,
        active_departments=len(department_points),
        dominant_category=dominant_category,
        departments=department_points,
        top_departments=department_points[:4],
        recent_transmissions=recent_transmissions[:6],
    )
