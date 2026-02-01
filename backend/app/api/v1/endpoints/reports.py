from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from typing import List, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert, Report
from app.services.snapshot import create_alert_snapshot
from app.services.hashing import compute_snapshot_hash
from app.services.pdf_generator import generate_forensic_pdf
from sqlalchemy.sql import func
import uuid
import os

router = APIRouter()

@router.get("/")
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Liste les rapports générés (Table 'reports').
    """
    query = select(Report).offset(skip).limit(limit).order_by(Report.generated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/generate/{alert_uuid}")
async def generate_report(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    GÉNÈRE UN RAPPORT FORENSIQUE FIGÉ.
    1. Snapshot (Copie des données)
    2. Hash (Signature)
    3. PDF (Document)
    4. Stockage DB
    """
    # 1. Récupérer l'ID numérique de l'alerte
    stmt = select(Alert.id).where(Alert.uuid == alert_uuid)
    res = await db.execute(stmt)
    alert_id = res.scalar()
    
    if not alert_id:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # 2. Créer le Snapshot
    snapshot = await create_alert_snapshot(alert_id, db)
    
    # 3. Calculer le Hash global
    report_hash = compute_snapshot_hash(snapshot)
    
    # Check Idempotence (Optionnel, ici on autorise N rapports, mais on pourrait check le hash)
    # ...
    
    # 4. Générer le PDF
    filename = f"report_{report_hash[:8]}.pdf"
    output_dir = "/app/evidences_store/reports" # Dans le volume partagé
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, filename)
    
    try:
        generate_forensic_pdf(snapshot, pdf_path, report_hash)
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {e}")
    
    # 5b. Sauvegarder en Base
    new_report = Report(
        uuid=uuid.uuid4(),
        alert_id=alert_id,
        snapshot_json=snapshot,
        report_hash=report_hash,
        snapshot_hash_sha256=report_hash, # Redondant mais explicite pour Lot 7
        snapshot_version=snapshot.get("snapshot_version", "1.0"),
        pdf_path=filename # Relatif au dossier reports
    )
    db.add(new_report)
    await db.commit()
    
    # 6. SEALING ACTUEL
    if snapshot.get("data") and snapshot["data"].get("evidences"):
        evidence_ids = [ev["id"] for ev in snapshot["data"]["evidences"]]
        if evidence_ids:
            from app.models import Evidence # Lazy import to avoid circular if any
            from sqlalchemy import update
            stmt = update(Evidence).where(Evidence.id.in_(evidence_ids)).values(status="SEALED", sealed_at=func.now())
            await db.execute(stmt)
            await db.commit()

    await db.refresh(new_report)
    
    return new_report

@router.get("/{report_uuid}/download/pdf")
async def download_pdf(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    query = select(Report).where(Report.uuid == report_uuid)
    result = await db.execute(query)
    report = result.scalars().first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Path absolu dans le conteneur
    full_path = os.path.join("/app/evidences_store/reports", report.pdf_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="PDF file missing on disk")
        
    return FileResponse(full_path, media_type="application/pdf", filename=f"report_{report.uuid}.pdf")

@router.get("/{report_uuid}/download/json")
async def download_json(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    query = select(Report).where(Report.uuid == report_uuid)
    result = await db.execute(query)
    report = result.scalars().first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return report.snapshot_json
