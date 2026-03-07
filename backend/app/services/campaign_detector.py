from __future__ import annotations

from datetime import datetime
import hashlib
import json
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignAlert


CAMPAIGN_WINDOW_SECONDS = 7200
CAMPAIGN_THRESHOLD = 5
REDIS_KEY_PREFIX = "campaign:"


def _rules_hash(matched_rules: list[str]) -> str:
    payload = json.dumps(sorted(matched_rules)).encode()
    return hashlib.md5(payload).hexdigest()[:8]


async def register_signal(
    redis_client,
    incident_id: str,
    matched_rules: list[str],
    region: str | None = None,
) -> dict:
    if not matched_rules:
        return {"campaign_detected": False, "count": 0}

    rules_key = _rules_hash(matched_rules)
    redis_key = f"{REDIS_KEY_PREFIX}{rules_key}"
    now_ts = time.time()
    cutoff_ts = now_ts - CAMPAIGN_WINDOW_SECONDS

    await redis_client.zremrangebyscore(redis_key, 0, cutoff_ts)
    await redis_client.zadd(redis_key, {f"{incident_id}:{region or 'unknown'}": now_ts})
    await redis_client.expire(redis_key, CAMPAIGN_WINDOW_SECONDS + 60)
    count = int(await redis_client.zcard(redis_key))
    campaign_type = "_".join(sorted(matched_rules)[:2]).upper()

    return {
        "campaign_detected": count >= CAMPAIGN_THRESHOLD,
        "count": count,
        "type": campaign_type,
        "rules": matched_rules,
    }


async def create_or_update_campaign(
    db: AsyncSession,
    campaign_data: dict,
    dominant_region: str | None = None,
) -> CampaignAlert | None:
    if not campaign_data.get("campaign_detected"):
        return None

    campaign_type = str(campaign_data.get("type", "")).strip()
    if not campaign_type:
        return None

    stmt = select(CampaignAlert).where(
        CampaignAlert.campaign_type == campaign_type,
        CampaignAlert.status == "ACTIVE",
    )
    existing = (await db.execute(stmt)).scalars().first()

    if existing:
        existing.incident_count = int(campaign_data.get("count", existing.incident_count))
        existing.last_seen = datetime.utcnow()
        if dominant_region:
            existing.dominant_region = dominant_region
        db.add(existing)
        await db.commit()
        return existing

    new_campaign = CampaignAlert(
        campaign_type=campaign_type,
        matched_rules=campaign_data.get("rules"),
        incident_count=int(campaign_data.get("count", 1)),
        dominant_region=dominant_region,
        status="ACTIVE",
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow(),
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    return new_campaign
