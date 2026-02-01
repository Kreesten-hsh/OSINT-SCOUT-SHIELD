from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.source import MonitoringSource, ScrapingRun
from app.schemas.source import SourceCreate, SourceResponse, SourceUpdate, ScrapingRunResponse

router = APIRouter()

@router.get("/sources", response_model=List[SourceResponse])
async def read_sources(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    query = select(MonitoringSource).order_by(MonitoringSource.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/sources", response_model=SourceResponse)
async def create_source(
    source_in: SourceCreate,
    db: AsyncSession = Depends(get_db)
):
    source = MonitoringSource(**source_in.dict())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source

@router.patch("/sources/{source_id}/toggle", response_model=SourceResponse)
async def toggle_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Active/Désactive une source."""
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    source.is_active = not source.is_active
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source

@router.delete("/sources/{source_id}", response_model=SourceResponse)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Supprime une source."""
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Note: Cascade delete handled by DB model relationship if configured, 
    # but here we rely on basic session delete
    await db.delete(source)
    await db.commit()
    return source

@router.patch("/sources/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: int,
    source_in: SourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Met à jour une source (fréquence, nom, url)."""
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = source_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)

    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source

@router.get("/sources/{source_id}/runs", response_model=List[ScrapingRunResponse])
async def read_source_runs(
    source_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Historique des runs pour une source spécifique."""
    query = select(ScrapingRun).where(ScrapingRun.source_id == source_id).order_by(ScrapingRun.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/runs", response_model=List[ScrapingRunResponse])
async def read_runs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(ScrapingRun).order_by(ScrapingRun.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
