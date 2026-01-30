import asyncio
import json
import logging
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models import Alert, Evidence, AnalysisResult

logger = logging.getLogger(__name__)

async def process_result(result_data: dict):
    """
    Traite un résultat de scraping et met à jour la base de données.
    """
    alert_uuid = result_data.get("task_id")
    if not alert_uuid:
        logger.error("Result without task_id received")
        return

    logger.info(f"Processing result for Alert UUID: {alert_uuid}")

    async with AsyncSessionLocal() as db:
        try:
            # 1. Récupérer l'alerte
            stmt = select(Alert).where(Alert.uuid == alert_uuid)
            result = await db.execute(stmt)
            alert = result.scalars().first()

            if not alert:
                logger.error(f"Alert {alert_uuid} not found in DB")
                return

            # 2. Créer l'Evidence
            evidence_data = result_data.get("details", {}).get("evidence_metadata", {})
            # Fix: evidence_metadata might vary, assume mapped from worker
            # worker sends: "evidence_hash", "url", "timestamp" in root, and "evidence_metadata" inside details
            
            # Reconstruct file path based on hash (as per Scraper engine Logic)
            file_hash = result_data.get("evidence_hash")
            file_path = f"evidence_{file_hash[:8]}.png" if file_hash else "unknown.png"

            new_evidence = Evidence(
                alert_id=alert.id,
                file_path=file_path,
                file_hash=file_hash or "N/A",
                content_text_preview=result_data.get("details", {}).get("analysis", {}).get("summary", "")[:500], # Mock summary extraction
                captured_at=None, # Should parse timestamp
                metadata_json=result_data.get("details", {}).get("evidence_metadata", {})
            )
            db.add(new_evidence)

            # 3. Créer AnalysisResult
            analysis_data = result_data.get("details", {}).get("analysis", {})
            
            new_analysis = AnalysisResult(
                alert_id=alert.id,
                risk_score=result_data.get("risk_score", 0),
                categories=analysis_data.get("categories", []),
                entities=analysis_data.get("entities", []),
                sentiment_score=0.0, # Not provided by worker yet
                technical_details=analysis_data
            )
            db.add(new_analysis)

            # 4. Mettre à jour l'Alerte
            alert.risk_score = result_data.get("risk_score", 0)
            alert.status = "ANALYZED" # ou INVESTIGATING
            # alert.updated_at updated via trigger/orm defaults usually

            await db.commit()
            logger.info(f"Alert {alert_uuid} updated successfully with evidence and analysis.")

        except Exception as e:
            logger.error(f"Error processing result for {alert_uuid}: {e}")
            await db.rollback()


async def start_result_consumer():
    """
    Tâche de fond qui écoute Redis pour les résultats.
    """
    logger.info("Starting Result Consumer...")
    r = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    try:
        while True:
            # Bloquant avec timeout pour ne pas bloquer la boucle d'événements indéfiniment
            # Mais en async, on utilise await, donc ça va.
            # blpop retourne un tuple (queue, element)
            item = await r.blpop("osint_results", timeout=1)
            
            if item:
                _, data_raw = item
                try:
                    current_data = json.loads(data_raw)
                    await process_result(current_data)
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON: {data_raw}")
                except Exception as e:
                    logger.error(f"Error processing item: {e}")
            
            # Petit sleep pour rendre la main si boucle vide ou erreur
            await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        logger.info("Result Consumer cancelled.")
    except Exception as e:
        logger.error(f"Result Consumer crashed: {e}")
    finally:
        await r.aclose()
