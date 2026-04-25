from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import ForensicBundle, FormalReport
from app.models.memory_domain import MessageAnalysis


ALLOWED_MEMORY_STATUSES = {"NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"}


@dataclass
class MemoryDomainDeletionSummary:
    deleted_reports_count: int = 0
    deleted_messages_count: int = 0
    deleted_analyses_count: int = 0
    deleted_evidence_items_count: int = 0
    deleted_impersonation_incidents_count: int = 0
    deleted_forensic_bundles_count: int = 0
    deleted_external_transmissions_count: int = 0
    deleted_suspect_numbers_count: int = 0
    artifact_paths: list[str] = field(default_factory=list)


def _normalize_memory_status(status: str | None) -> str:
    raw = str(status or "").strip().upper()
    if raw in ALLOWED_MEMORY_STATUSES:
        return raw
    return "NEW"


def build_legacy_analysis_payload(analysis: MessageAnalysis) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    categories: list[dict[str, Any]] = []
    seen_categories: set[str] = set()

    for raw_category in analysis.categories_detected or []:
        category = str(raw_category or "").strip()
        if not category or category in seen_categories:
            continue
        seen_categories.add(category)
        categories.append(
            {
                "name": category,
                "score": int(analysis.risk_score or 0),
            }
        )

    primary_category = str(analysis.primary_category or "").strip()
    if primary_category and primary_category not in seen_categories:
        categories.insert(
            0,
            {
                "name": primary_category,
                "score": int(analysis.risk_score or 0),
            },
        )

    entities: list[dict[str, Any]] = []
    seen_entities: set[tuple[str, str]] = set()

    for raw_rule in analysis.matched_rules or []:
        rule = str(raw_rule or "").strip()
        if not rule:
            continue
        key = ("MATCHED_RULE", rule)
        if key in seen_entities:
            continue
        seen_entities.add(key)
        entities.append({"type": "MATCHED_RULE", "value": rule})

    for raw_span in analysis.highlighted_spans or []:
        if not isinstance(raw_span, dict):
            continue
        text = str(raw_span.get("text") or "").strip()
        label = str(raw_span.get("label") or raw_span.get("rule") or raw_span.get("category") or "").strip()
        if not text and not label:
            continue
        key = ("HIGHLIGHT", f"{label}:{text}")
        if key in seen_entities:
            continue
        seen_entities.add(key)
        entities.append(
            {
                "type": "HIGHLIGHT",
                "value": text or label,
                "label": label or None,
                "start": raw_span.get("start"),
                "end": raw_span.get("end"),
            }
        )

    return categories, entities


async def sync_memory_domain_status_from_legacy_alert(
    db: AsyncSession,
    *,
    alert_uuid: UUID,
    alert_status: str | None,
) -> int:
    normalized_status = _normalize_memory_status(alert_status)
    stmt = (
        select(FormalReport)
        .options(selectinload(FormalReport.impersonation_incidents))
        .where(FormalReport.legacy_alert_uuid == alert_uuid)
    )
    reports = (await db.execute(stmt)).scalars().all()
    for report in reports:
        report.status = normalized_status
        db.add(report)
        for incident in report.impersonation_incidents or []:
            incident.status = normalized_status
            db.add(incident)

    if reports:
        await db.flush()
    return len(reports)


async def delete_linked_memory_domain_reports(
    db: AsyncSession,
    *,
    alert_uuid: UUID,
) -> MemoryDomainDeletionSummary:
    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
            selectinload(FormalReport.impersonation_incidents),
            selectinload(FormalReport.forensic_bundles).selectinload(ForensicBundle.transmissions),
        )
        .where(FormalReport.legacy_alert_uuid == alert_uuid)
    )
    reports = (await db.execute(stmt)).scalars().all()
    summary = MemoryDomainDeletionSummary()
    if not reports:
        return summary

    messages_by_id: dict[int, Any] = {}
    analyses_by_id: dict[int, Any] = {}
    suspect_numbers_by_id: dict[int, Any] = {}
    suspect_number_decrements: dict[int, int] = {}
    artifact_paths_seen: set[str] = set()

    for report in reports:
        summary.deleted_reports_count += 1
        summary.deleted_evidence_items_count += len(report.evidence_items or [])
        summary.deleted_impersonation_incidents_count += len(report.impersonation_incidents or [])
        summary.deleted_forensic_bundles_count += len(report.forensic_bundles or [])

        if report.message is not None and report.message.id not in messages_by_id:
            messages_by_id[report.message.id] = report.message
        if report.analysis is not None and report.analysis.id not in analyses_by_id:
            analyses_by_id[report.analysis.id] = report.analysis
        if report.suspect_number is not None:
            suspect_numbers_by_id[report.suspect_number.id] = report.suspect_number
            suspect_number_decrements[report.suspect_number.id] = suspect_number_decrements.get(report.suspect_number.id, 0) + 1

        for bundle in report.forensic_bundles or []:
            summary.deleted_external_transmissions_count += len(bundle.transmissions or [])
            for candidate_path in (bundle.zip_path, bundle.pdf_path, bundle.json_path):
                path_value = str(candidate_path or "").strip()
                if not path_value or path_value in artifact_paths_seen:
                    continue
                artifact_paths_seen.add(path_value)
                summary.artifact_paths.append(path_value)

        await db.delete(report)

    await db.flush()

    for analysis in analyses_by_id.values():
        await db.delete(analysis)
        summary.deleted_analyses_count += 1

    for message in messages_by_id.values():
        await db.delete(message)
        summary.deleted_messages_count += 1

    for suspect_number_id, suspect_number in suspect_numbers_by_id.items():
        remaining_count = max(0, int(suspect_number.report_count or 0) - suspect_number_decrements.get(suspect_number_id, 0))
        if remaining_count == 0:
            await db.delete(suspect_number)
            summary.deleted_suspect_numbers_count += 1
            continue
        suspect_number.report_count = remaining_count
        db.add(suspect_number)

    await db.flush()
    return summary
