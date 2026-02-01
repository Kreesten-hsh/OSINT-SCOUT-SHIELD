from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert
from app.schemas import AlertResponse, AlertUpdate
import uuid

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
async def read_alerts(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: str = Query(None, description="Filtrer par statut (NEW, CLOSED...)")
):
    """
    Récupère la liste des alertes détectées.
    """
    query = select(Alert).options(
        selectinload(Alert.evidences),
        selectinload(Alert.analysis_results)
    ).order_by(Alert.created_at.desc())

    if status:
        query = query.where(Alert.status == status)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    return alerts


@router.get("/{alert_uuid}", response_model=AlertResponse)
async def read_alert(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère le détail complet d'une alerte par son UUID.
    """
    query = select(Alert).where(Alert.uuid == alert_uuid).options(
        selectinload(Alert.evidences),
        selectinload(Alert.analysis_results)
    )
    result = await db.execute(query)
    alert = result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_uuid}", response_model=AlertResponse)
async def update_alert(
    alert_uuid: uuid.UUID,
    alert_update: AlertUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un analyste de qualifier l'alerte (Confirmer/Fermer).
    """
    # 1. Get
    query = select(Alert).where(Alert.uuid == alert_uuid)
    result = await db.execute(query)
    alert = result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # 2. Update
    update_data = alert_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
    
    # 3. Save
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    
    return alert
