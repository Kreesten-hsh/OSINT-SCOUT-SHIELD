from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, desc
from app.database import get_db
from app.models import Alert
from datetime import datetime, timedelta
import pytz

router = APIRouter()

@router.get("/stats/weekly")
async def get_weekly_stats(db: AsyncSession = Depends(get_db)):
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
    db: AsyncSession = Depends(get_db)
):
    """
    Returns count and top 3 critical alerts (risk_score >= threshold).
    Status should probably not be 'CLEAN' (assuming 'CLEAN' means resolved safe).
    We focus on NEW, INVESTIGATING, CONFIRMED etc.
    """
    # Assuming standard status strings, exclude resolved ones e.g. "CLEAN"
    # Or just show all high risk?
    # Prompt says: status IN (ANALYZED, CONFIRMED) -- wait, prompt section 2.2 says:
    # "status IN (ANALYZED, CONFIRMED)"
    # But new alerts might also be critical.
    # Let's adjust logic: Prompt explicitly requested "status IN (ANALYZED, CONFIRMED)"
    # BUT typically critical threats include NEW ones.
    # I will stick to the Prompt's strict requirement for now, but maybe include NEW if it feels empty?
    # Prompt Rule: "status IN (ANALYZED, CONFIRMED)"
    
    target_statuses = ["ANALYZED", "CONFIRMED", "NEW", "INVESTIGATING"] 
    # Broadening slightly because "Active Threat" implies anything not Closed/Clean.
    # If user insisted on ANALYZED/CONFIRMED specifically, I should check.
    # Prompt 2.2 says: "status IN (ANALYZED, CONFIRMED)" explicitly. I will follow that strict instruction.
    
    query_base = select(Alert).where(
        (Alert.risk_score >= threshold) &
        (Alert.status.in_(["ANALYZED", "CONFIRMED"]))
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
