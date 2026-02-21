from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from app.core.security import get_current_token_payload, require_role, resolve_scope_owner_user_id
from app.database import get_db
from app.models.source import MonitoringSource, ScrapingRun
from app.schemas.source import SourceCreate, SourceResponse, SourceUpdate, ScrapingRunResponse
from app.schemas.response import APIResponse
from app.schemas.token import TokenPayload

router = APIRouter()

@router.get("/", response_model=APIResponse[List[SourceResponse]])
async def read_sources(
    skip: int = 0,
    limit: int = 100,
    scope: str | None = Query(default=None, pattern="^me$"),
    db: AsyncSession = Depends(get_db),
    token_data: TokenPayload = Depends(get_current_token_payload),
):
    """
    Liste toutes les sources de monitoring configurées.
    """
    scope_owner_user_id = resolve_scope_owner_user_id(token_data, scope)

    query = select(MonitoringSource).order_by(MonitoringSource.id.desc())
    if scope_owner_user_id is not None:
        query = query.where(MonitoringSource.owner_user_id == scope_owner_user_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    sources = result.scalars().all()
    
    return APIResponse(
        success=True,
        message="Sources récupérées avec succès",
        data=sources
    )

@router.post("/", response_model=APIResponse[SourceResponse], status_code=status.HTTP_201_CREATED)
async def create_source(
    source_in: SourceCreate,
    db: AsyncSession = Depends(get_db),
    token_data: TokenPayload = Depends(get_current_token_payload),
):
    """
    Ajoute une nouvelle source de monitoring.
    """
    # Check duplicate URL? (Ideally yes, but let's rely on DB unique if setup or just add anyway)
    # The model defines UUID as unique but URL is not unique in model definition (only UUID).
    # But logical duplicate check is good.
    
    owner_user_id = resolve_scope_owner_user_id(token_data, None)
    source = MonitoringSource(**source_in.model_dump(), owner_user_id=owner_user_id)
    db.add(source)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Une erreur est survenue lors de la création (doublon possible).")
    
    await db.refresh(source)
    
    return APIResponse(
        success=True,
        message="Source créée avec succès",
        data=source
    )

@router.get("/{source_id}", response_model=APIResponse[SourceResponse])
async def read_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère une source par son ID.
    """
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
        
    return APIResponse(
        success=True,
        message="Source trouvée",
        data=source
    )

@router.patch("/{source_id}/toggle", response_model=APIResponse[SourceResponse])
async def toggle_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Active/Désactive une source.
    """
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    source.is_active = not source.is_active
    db.add(source)
    await db.commit()
    await db.refresh(source)
    
    status_msg = "activée" if source.is_active else "désactivée"
    
    return APIResponse(
        success=True,
        message=f"Source {status_msg} avec succès",
        data=source
    )

@router.delete("/{source_id}", response_model=APIResponse[SourceResponse])
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Supprime une source.
    """
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    await db.delete(source)
    await db.commit()
    
    return APIResponse(
        success=True,
        message="Source supprimée avec succès",
        data=source
    )

@router.patch("/{source_id}", response_model=APIResponse[SourceResponse])
async def update_source(
    source_id: int,
    source_in: SourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour une source (fréquence, nom, url).
    """
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = source_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)

    db.add(source)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Erreur lors de la mise à jour.")
        
    await db.refresh(source)
    
    return APIResponse(
        success=True,
        message="Source mise à jour avec succès",
        data=source
    )

@router.get("/{source_id}/runs", response_model=APIResponse[List[ScrapingRunResponse]])
async def read_source_runs(
    source_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Historique des runs pour une source spécifique.
    """
    # Verify source exists first?
    source = await db.get(MonitoringSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    query = select(ScrapingRun).where(ScrapingRun.source_id == source_id).order_by(ScrapingRun.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    runs = result.scalars().all()
    
    return APIResponse(
        success=True,
        message=f"Historique récupéré ({len(runs)} runs)",
        data=runs
    )

# Note: The global /runs endpoint might be better in a separate `runs.py` or keep here.
# Assuming it stays here for now but standardized.
@router.get("/runs/all", response_model=APIResponse[List[ScrapingRunResponse]])
async def read_runs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Historique global des runs.
    """
    query = select(ScrapingRun).order_by(ScrapingRun.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    runs = result.scalars().all()
    
    return APIResponse(
        success=True,
        message=f"Historique global récupéré ({len(runs)} runs)",
        data=runs
    )
