from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import AnalysisResult, Alert
from app.schemas.alert import AnalysisResultResponse

router = APIRouter()

@router.get("/", response_model=List[AnalysisResultResponse])
async def read_analysis_results(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Liste brute des résultats d'analyse.
    """
    query = select(AnalysisResult).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats")
async def get_analysis_stats(db: AsyncSession = Depends(get_db)):
    """
    Stats agrégées pour le Centre d'Analyse.
    """
    # Exemple de stats : Top Entities, Risk Score moyen
    
    # Risk Score Avg
    risk_query = select(func.avg(Alert.risk_score))
    risk_result = await db.execute(risk_query)
    avg_risk = risk_result.scalar() or 0
    
    # Count Analyzed
    count_query = select(func.count(Alert.id)).where(Alert.status != 'NEW')
    count_result = await db.execute(count_query)

    # Threat Distribution (Real Data)
    # Severity is often derived from score in this system, but let's assume risk_score buckets
    # < 30: Low, 30-70: Medium, > 70: Critical
    
    low_query = select(func.count(Alert.id)).where(Alert.risk_score < 30)
    med_query = select(func.count(Alert.id)).where(Alert.risk_score >= 30, Alert.risk_score < 70)
    high_query = select(func.count(Alert.id)).where(Alert.risk_score >= 70)
    
    low = (await db.execute(low_query)).scalar() or 0
    med = (await db.execute(med_query)).scalar() or 0
    high = (await db.execute(high_query)).scalar() or 0
    
    return {
        "global_risk_score": round(avg_risk, 2),
        "analyzed_count": count_result.scalar() or 0,
        "top_entities": [], # Pas de mock. Vide si non implémenté.
        "threat_distribution": [
            {"name": "Faible", "value": low, "color": "#10B981"},
            {"name": "Moyen", "value": med, "color": "#F59E0B"},
            {"name": "Critique", "value": high, "color": "#EF4444"}
        ]
    }
