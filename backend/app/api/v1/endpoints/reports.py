from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert
from app.schemas.alert import AlertResponse
import uuid

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Liste les rapports disponibles (Alertes traitées, donc status != NEW).
    """
    query = select(Alert).where(Alert.status != "NEW").offset(skip).limit(limit).order_by(Alert.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{alert_uuid}", response_model=AlertResponse)
async def generate_report_data(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère toutes les données nécessaires pour le rapport forensique.
    Même structure que l'alerte pour l'instant, mais endpoint dédié sémantiquement.
    """
    query = select(Alert).where(Alert.uuid == alert_uuid).options(
        selectinload(Alert.evidence),
        selectinload(Alert.analysis_results)
    )
    result = await db.execute(query)
    alert = result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    
    return alert
