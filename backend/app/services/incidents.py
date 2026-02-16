import json
import logging
import uuid

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Alert
from app.schemas.signal import IncidentReportRequest, IncidentReportData
from app.services.detection import score_signal


logger = logging.getLogger(__name__)


async def report_signal_to_incident(
    request: IncidentReportRequest,
    db: AsyncSession,
) -> IncidentReportData:
    if request.verification:
        risk_score = request.verification.risk_score
    else:
        detection = score_signal(message=request.message, url=request.url, phone=request.phone)
        risk_score = int(detection["risk_score"])

    source_type = f"CITIZEN_{request.channel}"
    target_url = (request.url or "").strip() or "citizen://text-signal"

    alert = Alert(
        uuid=uuid.uuid4(),
        url=target_url,
        source_type=source_type,
        risk_score=max(0, min(risk_score, 100)),
        status="NEW",
        analysis_note=f"[{request.channel}] {request.message[:250]}",
    )
    db.add(alert)
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

