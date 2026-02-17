import json
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Alert
from app.schemas.shield import (
    IncidentDecisionData,
    IncidentDecisionRequest,
    OperatorActionStatusData,
    OperatorActionStatusRequest,
    ShieldActionTimelineItem,
    ShieldDispatchData,
    ShieldIncidentTimelineData,
    ShieldDispatchRequest,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_note(current_note: str | None, line: str) -> str:
    current = (current_note or "").strip()
    if not current:
        return line
    return f"{current}\n{line}"


async def _get_alert_by_uuid(alert_uuid: uuid.UUID, db: AsyncSession) -> Alert:
    stmt = select(Alert).where(Alert.uuid == alert_uuid)
    alert = (await db.execute(stmt)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Incident not found")
    return alert


async def apply_incident_decision(
    incident_id: uuid.UUID,
    request: IncidentDecisionRequest,
    db: AsyncSession,
) -> IncidentDecisionData:
    alert = await _get_alert_by_uuid(incident_id, db)

    if request.decision == "CONFIRM":
        alert.status = "CONFIRMED"
        decision_status = "VALIDATED"
    elif request.decision == "REJECT":
        alert.status = "DISMISSED"
        decision_status = "REJECTED"
    else:
        alert.status = "IN_REVIEW"
        decision_status = "ESCALATED"

    author = (request.decided_by or "SOC_ANALYST").strip()
    base_note = f"[SOC_DECISION] {request.decision} by {author}"
    if request.comment:
        base_note = f"{base_note} | {request.comment.strip()}"
    alert.analysis_note = _append_note(alert.analysis_note, base_note)

    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    return IncidentDecisionData(
        incident_id=alert.uuid,
        alert_status=alert.status,
        decision_status=decision_status,
        comment=request.comment,
    )


async def _read_dispatch_from_redis(dispatch_id: uuid.UUID) -> dict | None:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        raw = await client.get(f"shield_dispatch:{dispatch_id}")
        if not raw:
            return None
        return json.loads(raw)
    finally:
        await client.aclose()


async def _append_dispatch_to_incident_index(incident_id: uuid.UUID, dispatch_id: uuid.UUID) -> None:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        key = f"shield_incident_dispatches:{incident_id}"
        await client.lpush(key, str(dispatch_id))
        await client.ltrim(key, 0, 99)
        await client.expire(key, settings.SHIELD_ACTION_TTL_SECONDS)
    finally:
        await client.aclose()


async def _read_incident_dispatch_ids(incident_id: uuid.UUID) -> list[str]:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        key = f"shield_incident_dispatches:{incident_id}"
        return await client.lrange(key, 0, -1)
    finally:
        await client.aclose()


async def get_incident_shield_timeline(
    incident_id: uuid.UUID,
    db: AsyncSession,
) -> ShieldIncidentTimelineData:
    await _get_alert_by_uuid(incident_id, db)
    dispatch_ids = await _read_incident_dispatch_ids(incident_id)

    timeline_actions: list[ShieldActionTimelineItem] = []
    for dispatch_id_raw in dispatch_ids:
        try:
            dispatch_id = uuid.UUID(dispatch_id_raw)
        except ValueError:
            continue

        payload = await _read_dispatch_from_redis(dispatch_id)
        if not payload:
            continue
        if payload.get("incident_id") != str(incident_id):
            continue

        action_type = payload.get("action_type")
        decision_status = payload.get("decision_status")
        operator_status = payload.get("operator_status")
        created_at = payload.get("created_at")
        if not all([action_type, decision_status, operator_status, created_at]):
            continue

        timeline_actions.append(
            ShieldActionTimelineItem(
                dispatch_id=dispatch_id,
                incident_id=incident_id,
                action_type=action_type,
                decision_status=decision_status,
                operator_status=operator_status,
                created_at=created_at,
                updated_at=payload.get("updated_at"),
            )
        )

    return ShieldIncidentTimelineData(
        incident_id=incident_id,
        total_actions=len(timeline_actions),
        actions=timeline_actions,
    )


async def _write_dispatch_to_redis(dispatch_id: uuid.UUID, payload: dict) -> None:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await client.set(
            f"shield_dispatch:{dispatch_id}",
            json.dumps(payload),
            ex=settings.SHIELD_ACTION_TTL_SECONDS,
        )
    finally:
        await client.aclose()


async def operator_callback_action_status(
    request: OperatorActionStatusRequest,
    db: AsyncSession,
) -> OperatorActionStatusData:
    alert = await _get_alert_by_uuid(uuid.UUID(str(request.incident_id)), db)
    dispatch_payload = await _read_dispatch_from_redis(uuid.UUID(str(request.dispatch_id)))
    if not dispatch_payload:
        raise HTTPException(status_code=404, detail="Dispatch not found or expired")
    if dispatch_payload.get("incident_id") != str(request.incident_id):
        raise HTTPException(status_code=409, detail="Dispatch does not match incident")

    action_type = dispatch_payload.get("action_type")

    if request.operator_status == "EXECUTED":
        decision_status = "EXECUTED"
        if action_type in ("BLOCK_NUMBER", "SUSPEND_WALLET"):
            alert.status = "BLOCKED_SIMULATED"
    elif request.operator_status == "FAILED":
        decision_status = "ESCALATED"
        alert.status = "IN_REVIEW"
    else:
        decision_status = "PENDING"

    callback_note = (
        f"[OPERATOR_CALLBACK] status={request.operator_status}"
        f" dispatch={request.dispatch_id}"
        f" action={action_type or 'UNKNOWN'}"
    )
    if request.execution_note:
        callback_note = f"{callback_note} | {request.execution_note.strip()}"
    if request.external_ref:
        callback_note = f"{callback_note} | ref={request.external_ref.strip()}"
    if request.operator_status == "EXECUTED" and action_type in ("BLOCK_NUMBER", "SUSPEND_WALLET"):
        callback_note = f"{callback_note} | blocked_simulated=true"

    alert.analysis_note = _append_note(alert.analysis_note, callback_note)
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    dispatch_payload["operator_status"] = request.operator_status
    dispatch_payload["decision_status"] = decision_status
    dispatch_payload["updated_at"] = _utc_now_iso()
    await _write_dispatch_to_redis(uuid.UUID(str(request.dispatch_id)), dispatch_payload)

    return OperatorActionStatusData(
        dispatch_id=request.dispatch_id,
        incident_id=request.incident_id,
        action_type=action_type,
        decision_status=decision_status,
        alert_status=alert.status,
        operator_status=request.operator_status,
        updated_at=_utc_now_iso(),
    )


async def dispatch_shield_action(
    request: ShieldDispatchRequest,
    db: AsyncSession,
) -> ShieldDispatchData:
    alert = await _get_alert_by_uuid(uuid.UUID(str(request.incident_id)), db)
    if alert.status not in ("CONFIRMED", "BLOCKED_SIMULATED"):
        raise HTTPException(
            status_code=409,
            detail="Incident must be CONFIRMED before SHIELD dispatch",
        )

    dispatch_id = uuid.uuid4()
    dispatch_payload = {
        "dispatch_id": str(dispatch_id),
        "incident_id": str(request.incident_id),
        "action_type": request.action_type,
        "operator_status": "SENT",
        "decision_status": "PENDING",
        "created_at": _utc_now_iso(),
    }
    await _write_dispatch_to_redis(dispatch_id, dispatch_payload)
    await _append_dispatch_to_incident_index(uuid.UUID(str(request.incident_id)), dispatch_id)

    requested_by = (request.requested_by or "SOC_ANALYST").strip()
    dispatch_note = f"[SHIELD_DISPATCH] action={request.action_type} by {requested_by} dispatch={dispatch_id}"
    if request.reason:
        dispatch_note = f"{dispatch_note} | {request.reason.strip()}"
    alert.analysis_note = _append_note(alert.analysis_note, dispatch_note)
    db.add(alert)
    await db.commit()

    operator_status = "SENT"
    decision_status = "PENDING"
    if request.auto_callback:
        callback_result = await operator_callback_action_status(
            request=OperatorActionStatusRequest(
                dispatch_id=dispatch_id,
                incident_id=request.incident_id,
                operator_status="EXECUTED",
                execution_note="Simulation automatique operateur",
                external_ref=f"SIM-{str(dispatch_id)[:8]}",
            ),
            db=db,
        )
        operator_status = callback_result.operator_status
        decision_status = callback_result.decision_status

    return ShieldDispatchData(
        dispatch_id=dispatch_id,
        incident_id=request.incident_id,
        action_type=request.action_type,
        decision_status=decision_status,
        operator_status=operator_status,
        callback_required=not request.auto_callback,
    )
