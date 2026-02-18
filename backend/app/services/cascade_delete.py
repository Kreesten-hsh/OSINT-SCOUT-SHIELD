import logging
import uuid
from pathlib import Path

import redis.asyncio as redis
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models import Alert, Report
from app.schemas.deletion import AlertDeletionData


logger = logging.getLogger(__name__)

ALLOWED_FILE_ROOTS = [Path("/app/evidences_store"), Path("evidences_store")]


def _is_within_allowed_roots(path: Path) -> bool:
    resolved = path.resolve(strict=False)
    for root in ALLOWED_FILE_ROOTS:
        root_resolved = root.resolve(strict=False)
        if resolved == root_resolved or root_resolved in resolved.parents:
            return True
    return False


def _build_candidates(path_value: str, *, report_file: bool) -> list[Path]:
    raw = Path(path_value)
    candidates: list[Path] = []

    if raw.is_absolute():
        candidates.append(raw)
    else:
        for root in ALLOWED_FILE_ROOTS:
            candidates.append(root / raw)
            if report_file:
                candidates.append(root / "reports" / raw)

    deduped: list[Path] = []
    seen: set[str] = set()
    for item in candidates:
        key = str(item)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _delete_file_from_candidates(candidates: list[Path]) -> tuple[bool, bool]:
    found_candidate = False
    for candidate in candidates:
        if not _is_within_allowed_roots(candidate):
            continue

        if candidate.exists():
            found_candidate = True
            try:
                candidate.unlink()
                return True, True
            except Exception:
                logger.exception("Unable to delete artifact file", extra={"path": str(candidate)})
                return False, True
    return False, found_candidate


async def _delete_shield_dispatches(alert_uuid: uuid.UUID) -> int:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        incident_key = f"shield_incident_dispatches:{alert_uuid}"
        dispatch_ids = await client.lrange(incident_key, 0, -1)
        dispatch_keys = [f"shield_dispatch:{dispatch_id}" for dispatch_id in dispatch_ids]
        keys = [incident_key, *dispatch_keys]
        if keys:
            await client.delete(*keys)
        return len(dispatch_ids)
    except Exception:
        logger.exception("Failed to clean SHIELD redis state", extra={"alert_uuid": str(alert_uuid)})
        return 0
    finally:
        await client.aclose()


async def delete_alert_cascade(
    *,
    db: AsyncSession,
    alert_uuid: uuid.UUID,
    require_citizen_source: bool = False,
) -> AlertDeletionData:
    query = (
        select(Alert)
        .where(Alert.uuid == alert_uuid)
        .options(selectinload(Alert.evidences), selectinload(Alert.analysis_results))
    )
    alert = (await db.execute(query)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if require_citizen_source and not str(alert.source_type or "").startswith("CITIZEN_"):
        raise HTTPException(status_code=404, detail="Citizen incident not found")

    reports_query = select(Report).where(Report.alert_id == alert.id)
    reports = (await db.execute(reports_query)).scalars().all()

    evidence_paths: set[str] = {
        str(evidence.file_path).strip()
        for evidence in (alert.evidences or [])
        if evidence.file_path
    }
    report_paths: set[str] = {
        str(report.pdf_path).strip()
        for report in reports
        if report.pdf_path
    }

    deleted_reports_count = len(reports)
    deleted_evidences_count = len(alert.evidences or [])
    deleted_analysis_results_count = 1 if alert.analysis_results is not None else 0

    for report in reports:
        await db.delete(report)

    await db.delete(alert)
    await db.commit()

    deleted_files_count = 0
    missing_files_count = 0

    for relative_path in sorted(evidence_paths):
        deleted, found = _delete_file_from_candidates(_build_candidates(relative_path, report_file=False))
        if deleted:
            deleted_files_count += 1
        elif not found:
            missing_files_count += 1

    for relative_path in sorted(report_paths):
        deleted, found = _delete_file_from_candidates(_build_candidates(relative_path, report_file=True))
        if deleted:
            deleted_files_count += 1
        elif not found:
            missing_files_count += 1

    deleted_shield_actions_count = await _delete_shield_dispatches(alert_uuid)

    return AlertDeletionData(
        alert_uuid=alert_uuid,
        deleted_reports_count=deleted_reports_count,
        deleted_evidences_count=deleted_evidences_count,
        deleted_analysis_results_count=deleted_analysis_results_count,
        deleted_files_count=deleted_files_count,
        missing_files_count=missing_files_count,
        deleted_shield_actions_count=deleted_shield_actions_count,
    )

