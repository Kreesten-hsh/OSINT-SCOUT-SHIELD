from pathlib import Path
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, Response
from typing import List, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Alert, Report
from app.core.security import get_current_token_payload, resolve_scope_owner_user_id
from app.schemas.token import TokenPayload
from app.services.snapshot import create_alert_snapshot
from app.services.hashing import compute_snapshot_hash
from app.services.pdf_generator import generate_forensic_pdf
from sqlalchemy.sql import func
import os
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    scope: str | None = Query(default=None, pattern="^me$"),
    db: AsyncSession = Depends(get_db),
    token_data: TokenPayload = Depends(get_current_token_payload),
):
    """
    Liste les rapports générés (Table 'reports').
    """
    scope_owner_user_id = resolve_scope_owner_user_id(token_data, scope)

    query = select(Report)
    if scope_owner_user_id is not None:
        query = query.join(Alert, Report.alert_id == Alert.id).where(Alert.owner_user_id == scope_owner_user_id)
    query = query.offset(skip).limit(limit).order_by(Report.generated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

from app.schemas.response import APIResponse

@router.post("/generate/{alert_uuid}", response_model=APIResponse[Any])
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

    # Enrichissement: nombre de signalements similaires sur le meme numero.
    alert_data = (snapshot.get("data") or {}).get("alert") or {}
    phone_number = str(alert_data.get("phone_number") or "").strip()
    recurrence_count = 0
    if phone_number:
        recurrence_stmt = select(func.count(Alert.id)).where(Alert.phone_number == phone_number)
        recurrence_count = int((await db.execute(recurrence_stmt)).scalar_one() or 0)
    alert_data["recurrence_count"] = recurrence_count
    
    # 3. Calculer le Hash global
    report_hash = compute_snapshot_hash(snapshot)
    
    # Check Idempotence (Optionnel, ici on autorise N rapports, mais on pourrait check le hash)
    # ...
    
    # 4. Générer le PDF
    filename = f"report_{report_hash[:8]}.pdf"
    output_dir = "/app/evidences_store/reports"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, filename)
    
    try:
        generate_forensic_pdf(snapshot, pdf_path, report_hash)
    except Exception as e:
        logger.exception("PDF generation failed", extra={"alert_uuid": str(alert_uuid)})
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
    
    # Manually construction response data to avoid serialization issues of SQLA model
    report_data = {
        "id": new_report.id,
        "uuid": new_report.uuid,
        "report_hash": new_report.report_hash,
        "snapshot_hash_sha256": new_report.snapshot_hash_sha256,
        "snapshot_version": new_report.snapshot_version,
        "generated_at": new_report.generated_at,
        "pdf_path": new_report.pdf_path
    }

    return APIResponse(
        success=True,
        message="Rapport généré et preuves scellées avec succès.",
        data=report_data
    )

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
        
    candidate_paths: list[Path] = []
    raw_pdf = Path(str(report.pdf_path))
    if raw_pdf.is_absolute():
        candidate_paths.append(raw_pdf)
    else:
        candidate_paths.append(Path("/app/evidences_store/reports") / raw_pdf)
        candidate_paths.append(Path("evidences_store/reports") / raw_pdf)
        candidate_paths.append(Path("/app/evidences_store") / raw_pdf)
        candidate_paths.append(Path("evidences_store") / raw_pdf)

    full_path = next((path for path in candidate_paths if path.exists()), None)
    if not full_path:
        raise HTTPException(status_code=404, detail="PDF file missing on disk")

    return FileResponse(
        str(full_path),
        media_type="application/pdf",
        filename=f"report_{report.uuid}.pdf",
    )

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
        
    payload = jsonable_encoder(report.snapshot_json)
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report.uuid}.json"
        },
    )
