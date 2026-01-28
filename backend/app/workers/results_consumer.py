import asyncio
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import Alert, Evidence, AnalysisResult
from app.core.config import settings
import redis.asyncio as redis
from datetime import datetime

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

QUEUE_RESULTS = "osint_results"

async def save_report_to_db(report: dict, db: AsyncSession):
    """Transforme un rapport JSON en entrées DB."""
    try:
        # 1. Création de l'Alerte
        alert = Alert(
            url=report.get("url"),
            source_type="WEB", # À affiner selon la source
            risk_score=report.get("risk_score"),
            status="NEW" if report.get("is_alert") else "Closed",
            is_confirmed=False
        )
        db.add(alert)
        await db.flush() # Pour avoir l'ID

        # 2. Création de la Preuve
        evidence_data = report.get("details", {}).get("evidence_metadata", {})
        evidence = Evidence(
            alert_id=alert.id,
            file_path=f"evidence_{report.get('evidence_hash')}.png", # Placeholder S3
            file_hash=report.get("evidence_hash"),
            content_text_preview=report.get("details", {}).get("analysis", {}).get("text_preview", "N/A"),
            metadata_json=evidence_data,
            captured_at=datetime.fromisoformat(report.get("timestamp")) if report.get("timestamp") else None
        )
        db.add(evidence)

        # 3. Création des Résultats d'Analyse
        analysis_data = report.get("details", {}).get("analysis", {})
        analysis = AnalysisResult(
            alert_id=alert.id,
            categories=analysis_data.get("categories", []),
            entities=analysis_data.get("entities", [])
        )
        db.add(analysis)

        await db.commit()
        logger.info(f"✅ Rapport sauvegardé pour {alert.url} (ID: {alert.id})")

    except Exception as e:
        logger.error(f"❌ Erreur sauvegarde DB : {e}")
        await db.rollback()

async def consume_results():
    logger.info("🚀 Démarrage du Consommateur de Résultats OSINT...")
    
    # Connexion Redis
    r = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    try:
        while True:
            # Attente bloquante
            item = await r.blpop(QUEUE_RESULTS, timeout=1)
            if not item:
                continue
            
            _, data_raw = item
            logger.info("📥 Nouveau résultat reçu !")
            
            try:
                report = json.loads(data_raw)
                
                # Connexion DB (Scope par message)
                async with AsyncSessionLocal() as db:
                    await save_report_to_db(report, db)
                    
            except json.JSONDecodeError:
                logger.error("❌ JSON invalide")
                
    except asyncio.CancelledError:
        logger.info("Arrêt demandé...")
    finally:
        await r.aclose()

if __name__ == "__main__":
    asyncio.run(consume_results())
