from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert
from app.schemas.alert import AlertResponse
import uuid
import json
import redis.asyncio as redis
from app.core.config import settings
from app.core.security import require_role
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class IngestionRequest(BaseModel):
    url: Optional[str] = None
    source_type: str = "WEB" # WEB, SOCIAL, DARKWEB
    notes: Optional[str] = None

from app.schemas.response import APIResponse

@router.post("/manual", response_model=APIResponse[AlertResponse], status_code=status.HTTP_201_CREATED)
async def manual_ingestion(
    request: IngestionRequest,
    db: AsyncSession = Depends(get_db),
    _principal=Depends(require_role(["ANALYST", "ADMIN"])),
):
    """
    Ingestion manuelle d'une URL ou source.
    Crée une alerte statut 'NEW' et déclenchera (simulé) le worker d'analyse.
    """
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="Une URL est requise pour l'ingestion.")
    clean_url = request.url.strip()

    # Création de l'alerte
    new_alert = Alert(
        uuid=uuid.uuid4(),
        url=clean_url,
        source_type=request.source_type,
        risk_score=0, # Sera calculé plus tard
        status="NEW"
    )
    
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    
    # Manually construct AlertResponse to avoid implicit lazy loading triggers
    response_data = AlertResponse(
        id=new_alert.id,
        uuid=new_alert.uuid,
        url=new_alert.url,
        source_type=new_alert.source_type,
        risk_score=new_alert.risk_score,
        status=new_alert.status,
        created_at=new_alert.created_at,
        updated_at=new_alert.updated_at,
        analysis_note=new_alert.analysis_note,
        evidences=[],
        analysis_results=None
    )

    # Push task to Redis worker
    try:
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        task_payload = {
            "id": str(new_alert.uuid),
            "url": str(clean_url),
            "source_type": new_alert.source_type
        }
        await r.rpush("osint_to_scan", json.dumps(task_payload))
        await r.aclose()
    except Exception as e:
        logger.exception("Failed to push ingestion task to Redis")

    
    return APIResponse(
        success=True,
        message="Cible ajoutée avec succès. Analyse en cours.",
        data=response_data
    )
