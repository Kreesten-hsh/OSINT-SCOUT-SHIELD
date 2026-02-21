from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from app.core.security import require_role
from app.database import get_db
from app.models import Alert
from datetime import datetime, timedelta
import pytz

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    now_utc = datetime.now(pytz.utc)
    start_date = (now_utc - timedelta(days=6)).date()
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=pytz.utc)

    per_day_stmt = (
        select(
            func.date(Alert.created_at).label("day"),
            func.count(Alert.id).label("count"),
        )
        .where(Alert.created_at >= start_dt)
        .group_by(func.date(Alert.created_at))
        .order_by(func.date(Alert.created_at).asc())
    )
    per_day_rows = (await db.execute(per_day_stmt)).all()
    day_map = {str(day): int(count) for day, count in per_day_rows}

    incidents_by_day = []
    for offset in range(7):
        current_day = start_date + timedelta(days=offset)
        day_key = current_day.isoformat()
        incidents_by_day.append(
            {
                "date": day_key,
                "count": day_map.get(day_key, 0),
            }
        )

    incidents_by_risk = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    risk_stmt = (
        select(
            func.sum(case((Alert.risk_score >= 65, 1), else_=0)).label("high_count"),
            func.sum(case(((Alert.risk_score >= 35) & (Alert.risk_score < 65), 1), else_=0)).label("medium_count"),
            func.sum(case((Alert.risk_score < 35, 1), else_=0)).label("low_count"),
        )
        .select_from(Alert)
    )
    risk_row = (await db.execute(risk_stmt)).first()
    if risk_row:
        incidents_by_risk = {
            "HIGH": int(risk_row.high_count or 0),
            "MEDIUM": int(risk_row.medium_count or 0),
            "LOW": int(risk_row.low_count or 0),
        }

    status_order = ["NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"]
    status_stmt = select(Alert.status, func.count(Alert.id)).group_by(Alert.status)
    status_rows = (await db.execute(status_stmt)).all()
    incidents_by_status = {status: 0 for status in status_order}
    for status, count in status_rows:
        if status in incidents_by_status:
            incidents_by_status[status] = int(count)

    return {
        "incidents_by_day": incidents_by_day,
        "incidents_by_risk": incidents_by_risk,
        "incidents_by_status": incidents_by_status,
    }

@router.get("/stats/weekly")
async def get_weekly_stats(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Returns alert created counts for the last 7 days vs previous 7 days.
    """
    now = datetime.now(pytz.utc)
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # Current week count
    query_current = select(func.count(Alert.id)).where(Alert.created_at >= one_week_ago)
    result_current = await db.execute(query_current)
    count_current = result_current.scalar() or 0

    # Previous week count
    query_prev = select(func.count(Alert.id)).where(
        (Alert.created_at >= two_weeks_ago) & (Alert.created_at < one_week_ago)
    )
    result_prev = await db.execute(query_prev)
    count_prev = result_prev.scalar() or 0

    # Delta Percent
    if count_prev == 0:
        delta_percent = 100 if count_current > 0 else 0
    else:
        delta_percent = round(((count_current - count_prev) / count_prev) * 100, 1)

    return {
        "current_week_count": count_current,
        "previous_week_count": count_prev,
        "delta_percent": delta_percent
    }

@router.get("/stats/critical-threats")
async def get_critical_threats(
    threshold: int = Query(85, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Returns count and top 3 critical alerts (risk_score >= threshold).
    Status should probably not be 'CLEAN' (assuming 'CLEAN' means resolved safe).
    We focus on NEW, INVESTIGATING, CONFIRMED etc.
    """
    
    # Prompt 2.2 says: "status IN (ANALYZED, CONFIRMED)" explicitly.    # Query for critical alerts (CONFIRMED only, score >= threshold)
    query_base = select(Alert).where(
        Alert.risk_score >= threshold,
        Alert.status == "CONFIRMED"  # Only validated threats
    )
    
    # Count
    query_count = select(func.count()).select_from(query_base.subquery())
    res_count = await db.execute(query_count)
    total_count = res_count.scalar() or 0
    
    # Top 3
    query_top = query_base.order_by(desc(Alert.risk_score), desc(Alert.created_at)).limit(3)
    res_top = await db.execute(query_top)
    top_alerts = res_top.scalars().all()
    
    return {
        "count": total_count,
        "top_alerts": [
            {
                "id": a.id,
                "uuid": str(a.uuid),
                "title": f"Menace {a.source_type} ({a.risk_score})", # Title might be missing in model, fallback
                "risk_score": a.risk_score,
                "source_type": a.source_type,
                "status": a.status,
                "created_at": a.created_at
            }
            for a in top_alerts
        ]
    }

@router.get("/stats/sources-active")
async def get_active_sources(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Returns the count of active monitoring sources (is_active=True).
    """
    from app.models import MonitoringSource
    
    query = select(func.count(MonitoringSource.id)).where(MonitoringSource.is_active == True)
    result = await db.execute(query)
    count = result.scalar() or 0
    
    return {"count": count}

@router.get("/stats/reports-count")
async def get_reports_count(
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Returns the total count of generated reports.
    """
    from app.models import Report
    
    query = select(func.count(Report.id))
    result = await db.execute(query)
    count = result.scalar() or 0
    
    return {"count": count}

