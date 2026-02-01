from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, HttpUrl
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert
from app.schemas.alert import AlertResponse
import uuid
import json
import redis.asyncio as redis
from app.core.config import settings

router = APIRouter()

class IngestionRequest(BaseModel):
    url: Optional[str] = None
    source_type: str = "WEB" # WEB, SOCIAL, DARKWEB
    notes: Optional[str] = None

@router.post("/manual", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def manual_ingestion(
    request: IngestionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingestion manuelle d'une URL ou source.
    Crée une alerte statut 'NEW' et déclenchera (simulé) le worker d'analyse.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="Une URL est requise pour l'ingestion.")

    # Création de l'alerte
    new_alert = Alert(
        uuid=uuid.uuid4(),
        url=request.url,
        source_type=request.source_type,
        risk_score=0, # Sera calculé plus tard
        status="NEW",
        is_confirmed=False
    )
    
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    
    # Avoid MissingGreenlet error by setting relationships explicitly
    # Pydantic tries to access them, triggering a lazy load in async context which fails
    new_alert.evidences = []
    new_alert.analysis_results = None

    # Push task to Redis worker
    try:
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        task_payload = {
            "id": str(new_alert.uuid),
            "url": str(new_alert.url),
            "source_type": new_alert.source_type
        }
        await r.rpush("osint_to_scan", json.dumps(task_payload))
        await r.aclose() # Always close connection
    except Exception as e:
        print(f"ERROR: Failed to push to Redis: {e}")
        # We don't raise HTTP exception to not fail the request, but logging is critical
    
    return new_alert
