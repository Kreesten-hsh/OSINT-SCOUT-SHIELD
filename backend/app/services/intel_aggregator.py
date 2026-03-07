from __future__ import annotations

from datetime import datetime
from hashlib import sha256
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ThreatIndicator


ALERT_THRESHOLD = 3

BENIN_PREFIX_REGION: dict[str, str] = {
    "01": "Atlantique",
    "02": "Borgou",
    "03": "Ouémé",
    "04": "Zou",
    "05": "Mono",
    "06": "Couffo",
    "07": "Atacora",
    "08": "Donga",
    "09": "Collines",
    "10": "Plateau",
    "11": "Alibori",
    "12": "Littoral",
    "61": "Atlantique",
    "62": "Atlantique",
    "66": "Atlantique",
    "67": "Littoral",
    "95": "Ouémé",
    "96": "Atlantique",
    "97": "Borgou",
}


def derive_region_from_phone(phone: str) -> str | None:
    normalized = re.sub(r"[\s-]", "", (phone or "").strip())
    normalized = normalized.removeprefix("+229")
    with_zero = normalized
    if normalized.startswith("0"):
        normalized = normalized[1:]
    if len(normalized) < 2 and len(with_zero) < 2:
        return None
    primary_prefix = normalized[:2] if len(normalized) >= 2 else None
    fallback_prefix = with_zero[:2] if len(with_zero) >= 2 else None
    if primary_prefix and primary_prefix in BENIN_PREFIX_REGION:
        return BENIN_PREFIX_REGION[primary_prefix]
    if fallback_prefix in {"01", "02"} and fallback_prefix in BENIN_PREFIX_REGION:
        return BENIN_PREFIX_REGION[fallback_prefix]
    return None


def mask_phone(phone: str) -> str:
    normalized = (phone or "").strip()
    if len(normalized) >= 7:
        return f"{normalized[:3]}****{normalized[-3:]}"
    return "***"


async def upsert_threat_indicator(
    db: AsyncSession,
    phone: str | None = None,
    url: str | None = None,
    danger_score: float = 0.0,
    dominant_category: str | None = None,
) -> ThreatIndicator:
    if phone and phone.strip():
        normalized_phone = phone.strip()
        hash_key = sha256(normalized_phone.encode()).hexdigest()
        indicator_type = "phone"
        raw_value_masked = mask_phone(normalized_phone)
        region = derive_region_from_phone(normalized_phone)
        hash_attr = "phone_hash"
    elif url and url.strip():
        normalized_url = url.strip()
        hash_key = sha256(normalized_url.encode()).hexdigest()
        indicator_type = "url"
        raw_value_masked = normalized_url[:50]
        region = None
        hash_attr = "url_hash"
    else:
        raise ValueError("phone or url must be provided")

    stmt = select(ThreatIndicator).where(getattr(ThreatIndicator, hash_attr) == hash_key)
    existing = (await db.execute(stmt)).scalars().first()

    if existing:
        existing.occurrence_count += 1
        existing.last_seen = datetime.utcnow()
        existing.danger_score = (float(existing.danger_score) + float(danger_score)) / 2
        if dominant_category:
            existing.dominant_category = dominant_category
        if existing.occurrence_count >= ALERT_THRESHOLD:
            existing.alert_triggered = True
        if not existing.region and region:
            existing.region = region
        db.add(existing)
        await db.commit()
        return existing

    new_indicator = ThreatIndicator(
        indicator_type=indicator_type,
        raw_value_masked=raw_value_masked,
        phone_hash=hash_key if hash_attr == "phone_hash" else None,
        url_hash=hash_key if hash_attr == "url_hash" else None,
        occurrence_count=1,
        danger_score=float(danger_score),
        region=region,
        dominant_category=dominant_category,
        alert_triggered=False,
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow(),
    )
    db.add(new_indicator)
    await db.commit()
    await db.refresh(new_indicator)
    return new_indicator
