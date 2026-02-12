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

    is_alert = bool(result_data.get("is_alert", False))
    risk_score = int(result_data.get("risk_score", 0))
    source_type = result_data.get("source_type", "AUTOMATIC_SCRAPING")
    target_url = result_data.get("url", "")
    details = result_data.get("details", {}) or {}
    analysis = details.get("analysis", {}) or {}
    metadata = details.get("evidence_metadata", {}) or {}

    async with AsyncSessionLocal() as db:
        try:
            alert_stmt = select(Alert).where(Alert.uuid == task_uuid)
            alert = (await db.execute(alert_stmt)).scalars().first()

            run_stmt = select(ScrapingRun).where(ScrapingRun.uuid == task_uuid)
            scraping_run = (await db.execute(run_stmt)).scalars().first()

            if not alert and scraping_run and not is_alert:
                scraping_run.status = "COMPLETED"
                scraping_run.completed_at = datetime.utcnow()
                scraping_run.log_message = "RAS - analyse terminee (clean)"
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
                db.add(alert)

            file_hash = result_data.get("evidence_hash") or f"missing-{task_uuid.hex}"
            file_path = f"evidence_{file_hash[:8]}.png"
            summary = analysis.get("summary", "") or ""

            db.add(
                Evidence(
                    alert_id=alert.id,
                    file_path=file_path,
                    file_hash=file_hash,
                    content_text_preview=summary[:500],
                    metadata_json=metadata,
                )
            )

            db.add(
                AnalysisResult(
                    alert_id=alert.id,
                    categories=analysis.get("categories", []),
                    entities=analysis.get("entities", []),
                )
            )

            if scraping_run:
                scraping_run.status = "COMPLETED"
                scraping_run.completed_at = datetime.utcnow()
                if is_alert:
                    scraping_run.alerts_generated_count += 1
                    scraping_run.log_message = f"Menace detectee sur {target_url}"
                else:
                    scraping_run.log_message = "RAS - analyse terminee (clean)"
                db.add(scraping_run)

            await db.commit()
            logger.info("Result processed", extra={"task_id": str(task_uuid), "alert_id": alert.id})

        except Exception:
            await db.rollback()
            logger.exception("Error processing result", extra={"task_id": str(task_uuid)})


async def start_result_consumer() -> None:
    """Background task listening the Redis result queue."""
    logger.info("Starting result consumer")
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    try:
        while True:
            item = await redis_client.blpop("osint_results", timeout=1)
            if item:
                _, payload = item
                try:
                    await process_result(json.loads(payload))
                except json.JSONDecodeError:
                    logger.error("Invalid JSON payload on osint_results", extra={"payload": payload})
            await asyncio.sleep(0.05)
    except asyncio.CancelledError:
        logger.info("Result consumer cancelled")
    except Exception:
        logger.exception("Result consumer crashed")
    finally:
        await redis_client.aclose()
