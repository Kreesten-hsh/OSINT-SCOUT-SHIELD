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
    query = select(MonitoringSource).offset(skip).limit(limit)
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

@router.get("/runs", response_model=List[ScrapingRunResponse])
async def read_runs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(ScrapingRun).order_by(ScrapingRun.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
