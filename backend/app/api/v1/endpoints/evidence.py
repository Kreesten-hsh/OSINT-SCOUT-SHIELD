from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import os
from app.core.config import settings

router = APIRouter()

# TODO: Configurer le chemin réel via une variable d'env ou un volume partagé
# Pour l'instant, on suppose que les preuves sont montées dans /app/preuves_temp
EVIDENCE_DIR = "/app/preuves_temp"

@router.get("/{file_name}")
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
