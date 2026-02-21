from datetime import datetime
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.models import Alert
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder
from app.services.detection import score_signal

SNAPSHOT_VERSION = "1.0"
ENGINE_VERSION = "v1.0.3"

async def create_alert_snapshot(alert_id: int, db: AsyncSession) -> dict:
    """
    Crée une copie figée et intégrale de l'alerte et de ses relations.
    Retourne un dictionnaire prêt à être stocké en JSONB.
    """
    
    # 1. Charger l'alerte avec TOUTES les relations
    query = select(Alert).where(Alert.id == alert_id).options(
        selectinload(Alert.evidences),
        selectinload(Alert.analysis_results)
    )
    result = await db.execute(query)
    alert = result.scalars().first()
    
    if not alert:
        raise ValueError(f"Alert ID {alert_id} not found")

    # 2. Sérialisation Manuelle (Pour contrôle total)
    # On n'utilise pas Pydantic ici pour éviter d'être couplé aux schémas d'API qui évoluent.
    # On veut une représentation brute DB.
    
    # Evidence Data
    evidence_data = []
    if alert.evidences:
        for ev in alert.evidences:
            evidence_data.append({
                "id": ev.id,
                "type": ev.type,
                "file_path": ev.file_path,
                "file_hash": ev.file_hash,
                "status": ev.status,
                "captured_at": ev.captured_at.isoformat() if ev.captured_at else None,
                "metadata": ev.metadata_json,
                "content_preview": ev.content_text_preview
            })
        
    # Analysis Data
    computed_detection = score_signal(
        message=alert.reported_message or "",
        url=alert.url,
        phone=alert.phone_number,
    )
    categories_from_detection = [
        {"name": category, "score": alert.risk_score or computed_detection["risk_score"]}
        for category in computed_detection.get("categories_detected", [])
    ]

    analysis_data = {
        "risk_score": alert.risk_score or computed_detection["risk_score"] or 0,
        "categories": categories_from_detection,
        "entities": [],
        "factors_detected": computed_detection.get("explanation", []),
        "matched_rules": computed_detection.get("matched_rules", []),
        "generated_at": datetime.utcnow().isoformat(), # Approx, car pas de created_at sur analysis
    }

    if alert.analysis_results:
        existing_categories = alert.analysis_results.categories or []
        existing_entities = alert.analysis_results.entities or []
        if existing_categories:
            analysis_data["categories"] = existing_categories
        analysis_data["entities"] = existing_entities

    # Core Alert Data
    alert_core = {
        "uuid": str(alert.uuid),
        "url": alert.url,
        "source_type": alert.source_type or "",
        "phone_number": alert.phone_number or "",
        "citizen_channel": alert.citizen_channel or "",
        "reported_message": alert.reported_message or "",
        "risk_score": alert.risk_score or 0,
        "status_at_snapshot": alert.status or "UNKNOWN",
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "updated_at": alert.updated_at.isoformat() if alert.updated_at else None,
        "analysis_note": alert.analysis_note or ""
    }

    # 3. Assemblage Versionné
    snapshot = {
        "snapshot_version": SNAPSHOT_VERSION,
        "engine_version": ENGINE_VERSION,
        "generated_at": datetime.utcnow().isoformat(),
        "data": {
            "alert": alert_core,
            "evidences": evidence_data,
            "analysis": analysis_data
        }
    }
    
    # 4. Nettoyage JSON via FastAPI encoder pour gérer les types complexes restants si besoin
    return jsonable_encoder(snapshot)
