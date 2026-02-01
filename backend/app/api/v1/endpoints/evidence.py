from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import os
from app.core.config import settings
from app.database import get_db
from app.models import Evidence
from app.schemas.alert import EvidenceResponse

router = APIRouter()

# TODO: Configurer le chemin réel via une variable d'env ou un volume partagé
# Pour l'instant, on suppose que les preuves sont montées dans /app/preuves_temp
EVIDENCE_DIR = "/app/evidences_store"

@router.get("/", response_model=List[EvidenceResponse])
async def read_evidences(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Récupère la liste globale des preuves (Evidences).
    """
    query = select(Evidence).offset(skip).limit(limit)
    result = await db.execute(query)
    evidences = result.scalars().all()
    return evidences

@router.get("/file/{file_name}")
async def get_evidence_file(file_name: str):
    """
    Sert un fichier de preuve (Screenshot) par son nom.
    Sécurisé basiquement contre le Path Traversal.
    """
    # Sécurité basique
    if ".." in file_name or "/" in file_name:
        raise HTTPException(status_code=400, detail="Invalid file name")
    
    file_path = os.path.join(EVIDENCE_DIR, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Evidence file not found")
            
    return FileResponse(file_path)
