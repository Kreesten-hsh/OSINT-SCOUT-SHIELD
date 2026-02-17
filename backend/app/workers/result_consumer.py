import asyncio
from datetime import datetime
import json
import logging
import uuid

import redis.asyncio as redis
from sqlalchemy import select

from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models import Alert, AnalysisResult, Evidence
from app.models.source import ScrapingRun


logger = logging.getLogger(__name__)
RESULT_QUEUE = "osint_results"


def _clamp_risk_score(value: object) -> int:
    try:
        return max(0, min(int(value), 100))
    except Exception:
        return 0


def _safe_dict(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_list(value: object) -> list:
    return value if isinstance(value, list) else []


def _append_analysis_note(existing_note: str | None, new_line: str) -> str:
    current = (existing_note or "").strip()
    addition = (new_line or "").strip()
    if not addition:
        return current
    if not current:
        return addition
    return f"{current}\n{addition}"


def _build_failure_message(status: str, error_code: str, error: str) -> str:
    code = error_code or "UNKNOWN_ERROR"
    text = error or "No details"
    return f"OSINT {status}: {code} - {text}"


async def process_result(result_data: dict) -> None:
    """Consume a scraper result and persist alert/evidence data."""
    task_id = result_data.get("task_id")
    if not task_id:
        logger.error("Result without task_id received")
        return

    try:
        task_uuid = uuid.UUID(str(task_id))
    except ValueError:
        logger.error("Invalid task_id format", extra={"task_id": task_id})
        return

    status = str(result_data.get("status", "COMPLETED")).upper()
    is_alert = bool(result_data.get("is_alert", False))
    risk_score = _clamp_risk_score(result_data.get("risk_score", 0))
    source_type = str(result_data.get("source_type") or "AUTOMATIC_SCRAPING")
    target_url = str(result_data.get("url") or "").strip()

    details = _safe_dict(result_data.get("details"))
    analysis = _safe_dict(details.get("analysis"))
    metadata = _safe_dict(details.get("evidence_metadata"))

    error = str(result_data.get("error") or "").strip()
    error_code = str(result_data.get("error_code") or "").strip()

    evidence_hash = result_data.get("evidence_hash")
    evidence_file_path = result_data.get("evidence_file_path")

    async with AsyncSessionLocal() as db:
        try:
            alert_stmt = select(Alert).where(Alert.uuid == task_uuid)
            alert = (await db.execute(alert_stmt)).scalars().first()

            run_stmt = select(ScrapingRun).where(ScrapingRun.uuid == task_uuid)
            scraping_run = (await db.execute(run_stmt)).scalars().first()

            if status != "COMPLETED":
                failure_message = _build_failure_message(status, error_code, error)

                if alert:
                    alert.analysis_note = _append_analysis_note(alert.analysis_note, failure_message)
                    db.add(alert)

                if scraping_run:
                    scraping_run.status = "FAILED"
                    scraping_run.completed_at = datetime.utcnow()
                    scraping_run.log_message = failure_message[:1000]
                    db.add(scraping_run)

                await db.commit()
                logger.warning(
                    "Result processed as failure",
                    extra={"task_id": str(task_uuid), "status": status, "error_code": error_code},
                )
                return

            if not alert and scraping_run and not is_alert:
                scraping_run.status = "COMPLETED"
                scraping_run.completed_at = datetime.utcnow()
                scraping_run.log_message = "No threat detected"
                db.add(scraping_run)
                await db.commit()
                return

            if not alert:
                alert = Alert(
                    uuid=uuid.uuid4(),
                    url=target_url,
                    source_type=source_type,
                    risk_score=risk_score,
                    status="NEW",
                )
                db.add(alert)
                await db.flush()
            else:
                alert.risk_score = risk_score
                if target_url:
                    alert.url = target_url
                db.add(alert)

            if evidence_hash:
                duplicate_stmt = select(Evidence).where(Evidence.file_hash == str(evidence_hash))
                duplicate_evidence = (await db.execute(duplicate_stmt)).scalars().first()

                if duplicate_evidence is None:
                    summary = str(analysis.get("summary") or "")
                    resolved_file_path = (
                        str(evidence_file_path)
                        if evidence_file_path
                        else f"screenshots/evidence_{str(evidence_hash)[:16]}.png"
                    )

                    db.add(
                        Evidence(
                            alert_id=alert.id,
                            file_path=resolved_file_path,
                            file_hash=str(evidence_hash),
                            content_text_preview=summary[:500],
                            metadata_json=metadata,
                        )
                    )
                else:
                    duplicate_note = (
                        f"Evidence hash already exists ({str(evidence_hash)[:16]}...), "
                        "skipped duplicate insert."
                    )
                    alert.analysis_note = _append_analysis_note(alert.analysis_note, duplicate_note)
                    db.add(alert)
            else:
                alert.analysis_note = _append_analysis_note(
                    alert.analysis_note,
                    "OSINT completed without evidence hash.",
                )
                db.add(alert)

            categories = _safe_list(analysis.get("categories"))
            entities = _safe_list(analysis.get("entities"))

            analysis_stmt = select(AnalysisResult).where(AnalysisResult.alert_id == alert.id)
            analysis_row = (await db.execute(analysis_stmt)).scalars().first()

            if analysis_row:
                analysis_row.categories = categories
                analysis_row.entities = entities
                db.add(analysis_row)
            else:
                db.add(
                    AnalysisResult(
                        alert_id=alert.id,
                        categories=categories,
                        entities=entities,
                    )
                )

            if scraping_run:
                scraping_run.status = "COMPLETED"
                scraping_run.completed_at = datetime.utcnow()
                if is_alert:
                    scraping_run.alerts_generated_count += 1
                    scraping_run.log_message = f"Threat detected on {target_url}"
                else:
                    scraping_run.log_message = "No threat detected"
                db.add(scraping_run)

            await db.commit()
            logger.info("Result processed", extra={"task_id": str(task_uuid), "alert_id": alert.id})

        except Exception:
            await db.rollback()
            logger.exception("Error processing result", extra={"task_id": str(task_uuid)})


async def start_result_consumer() -> None:
    """Background task listening to the Redis result queue."""
    logger.info("Starting result consumer")

    redis_client = None

    try:
        while True:
            try:
                if redis_client is None:
                    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                    await redis_client.ping()
                    logger.info("Result consumer connected to Redis")

                item = await redis_client.blpop(RESULT_QUEUE, timeout=1)
                if item:
                    _, payload = item
                    try:
                        result = json.loads(payload)
                    except json.JSONDecodeError:
                        logger.error("Invalid JSON payload on osint_results", extra={"payload": payload})
                        continue

                    await process_result(result)

                await asyncio.sleep(0.05)

            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Result consumer loop error, reconnecting")
                if redis_client is not None:
                    try:
                        await redis_client.aclose()
                    except Exception:
                        pass
                    redis_client = None
                await asyncio.sleep(1)

    except asyncio.CancelledError:
        logger.info("Result consumer cancelled")
    finally:
        if redis_client is not None:
            await redis_client.aclose()
