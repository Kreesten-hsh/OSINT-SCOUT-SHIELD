from __future__ import annotations

import csv
from datetime import datetime
import io
import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_role
from app.database import get_db
from app.models import CampaignAlert, ThreatIndicator


router = APIRouter()


@router.get("/threat-intel/dashboard")
async def get_threat_intel_dashboard(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
) -> dict:
    """Return top recurring indicators, category distribution, and active threat count."""
    top_stmt = (
        select(ThreatIndicator)
        .where(ThreatIndicator.indicator_type == "phone")
        .order_by(ThreatIndicator.occurrence_count.desc())
        .limit(10)
    )
    top_rows = (await db.execute(top_stmt)).scalars().all()

    categories_stmt = (
        select(ThreatIndicator.dominant_category, func.count(ThreatIndicator.id))
        .group_by(ThreatIndicator.dominant_category)
        .order_by(func.count(ThreatIndicator.id).desc())
    )
    categories_rows = (await db.execute(categories_stmt)).all()

    active_threats_stmt = select(func.count(ThreatIndicator.id)).where(ThreatIndicator.alert_triggered.is_(True))
    active_threats = int((await db.execute(active_threats_stmt)).scalar() or 0)

    return {
        "top_numbers": [
            {
                "masked": indicator.raw_value_masked,
                "count": int(indicator.occurrence_count or 0),
                "score": float(indicator.danger_score or 0.0),
                "region": indicator.region,
                "category": indicator.dominant_category,
                "alert": bool(indicator.alert_triggered),
            }
            for indicator in top_rows
        ],
        "categories": [
            {
                "name": category if category else "UNKNOWN",
                "count": int(count),
            }
            for category, count in categories_rows
        ],
        "active_threats": active_threats,
    }


@router.get("/map/heatmap")
async def get_map_heatmap(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, str | int]]:
    """Return a public regional heatmap aggregated from threat indicators."""
    stmt = (
        select(
            ThreatIndicator.region,
            ThreatIndicator.dominant_category,
            func.count(ThreatIndicator.id).label("total"),
        )
        .where(ThreatIndicator.region.is_not(None))
        .group_by(ThreatIndicator.region, ThreatIndicator.dominant_category)
    )
    rows = (await db.execute(stmt)).all()

    by_region: dict[str, dict[str, object]] = {}
    for region, category, total in rows:
        if not region:
            continue
        bucket = by_region.setdefault(
            str(region),
            {
                "region": str(region),
                "count": 0,
                "dominant_type": "UNKNOWN",
                "_types": {},
            },
        )
        bucket["count"] = int(bucket["count"]) + int(total)
        types = bucket["_types"]
        assert isinstance(types, dict)
        key = str(category) if category else "UNKNOWN"
        types[key] = int(types.get(key, 0)) + int(total)

    response: list[dict[str, str | int]] = []
    for region_data in by_region.values():
        types = region_data.get("_types", {})
        dominant_type = "UNKNOWN"
        if isinstance(types, dict) and types:
            dominant_type = max(types.items(), key=lambda item: item[1])[0]
        response.append(
            {
                "region": str(region_data["region"]),
                "count": int(region_data["count"]),
                "dominant_type": dominant_type,
            }
        )
    response.sort(key=lambda item: int(item["count"]), reverse=True)
    return response


@router.get("/dashboard/intel/export")
async def export_threat_intel(
    format: str = Query(default="json"),
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """Export active threat intelligence in JSON, CSV, or STIX-lite formats."""
    export_format = (format or "json").strip().lower()
    stmt = (
        select(ThreatIndicator)
        .where(ThreatIndicator.alert_triggered.is_(True))
        .order_by(ThreatIndicator.occurrence_count.desc())
    )
    indicators = (await db.execute(stmt)).scalars().all()

    if export_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["masked_value", "type", "count", "score", "region", "category", "first_seen"])
        for indicator in indicators:
            writer.writerow(
                [
                    indicator.raw_value_masked,
                    indicator.indicator_type,
                    int(indicator.occurrence_count or 0),
                    float(indicator.danger_score or 0.0),
                    indicator.region or "",
                    indicator.dominant_category or "",
                    indicator.first_seen.isoformat() if indicator.first_seen else "",
                ]
            )
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=benin_threat_intel.csv"},
        )

    if export_format == "stix":
        objects = []
        for indicator in indicators:
            label_values = [indicator.indicator_type]
            if indicator.dominant_category:
                label_values.append(indicator.dominant_category)

            object_id = f"indicator--{indicator.id}"
            pattern_key = "phone-number:value" if indicator.indicator_type == "phone" else "url:value"
            objects.append(
                {
                    "type": "indicator",
                    "id": object_id,
                    "pattern": f"[{pattern_key} = '{indicator.raw_value_masked}']",
                    "valid_from": indicator.first_seen.isoformat() if indicator.first_seen else datetime.utcnow().isoformat(),
                    "labels": label_values,
                    "x_benin_region": indicator.region,
                    "x_occurrence_count": int(indicator.occurrence_count or 0),
                }
            )

        return {
            "type": "bundle",
            "id": f"bundle--{uuid.uuid4()}",
            "spec_version": "2.1",
            "objects": objects,
        }

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "source": "BENIN CYBER SHIELD",
        "indicators": [
            {
                "masked_value": indicator.raw_value_masked,
                "type": indicator.indicator_type,
                "count": int(indicator.occurrence_count or 0),
                "score": float(indicator.danger_score or 0.0),
                "region": indicator.region,
                "category": indicator.dominant_category,
                "first_seen": indicator.first_seen.isoformat() if indicator.first_seen else None,
                "last_seen": indicator.last_seen.isoformat() if indicator.last_seen else None,
                "alert": bool(indicator.alert_triggered),
            }
            for indicator in indicators
        ],
    }


@router.get("/dashboard/intel/summary")
async def get_campaign_summary(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
) -> dict:
    """Return active coordinated campaign alerts for analyst dashboard banner."""
    stmt = (
        select(CampaignAlert)
        .where(CampaignAlert.status == "ACTIVE")
        .order_by(CampaignAlert.incident_count.desc())
        .limit(10)
    )
    campaigns = (await db.execute(stmt)).scalars().all()
    return {
        "active_campaigns": [
            {
                "id": str(campaign.id),
                "type": campaign.campaign_type,
                "count": int(campaign.incident_count or 0),
                "region": campaign.dominant_region,
                "first_seen": campaign.first_seen.isoformat() if campaign.first_seen else None,
                "last_seen": campaign.last_seen.isoformat() if campaign.last_seen else None,
            }
            for campaign in campaigns
        ]
    }
