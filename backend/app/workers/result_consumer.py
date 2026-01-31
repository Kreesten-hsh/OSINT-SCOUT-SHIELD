import asyncio
import json
import logging
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models import Alert, Evidence, AnalysisResult
from app.models.source import ScrapingRun, MonitoringSource

logger = logging.getLogger(__name__)

async def process_result(result_data: dict):
    """
    Traite un résultat de scraping et met à jour la base de données.
    Gère les modes MANUEL (Mise à jour Alerte) et AUTOMATIQUE (Création Alerte si Menace).
    """
    task_id = result_data.get("task_id")
    if not task_id:
        logger.error("Result without task_id received")
        return

    logger.info(f"Processing result for Task UUID: {task_id}")

    async with AsyncSessionLocal() as db:
        try:
            # 1. Essayer de trouver une Alerte existante (Mode Manuel/Ingestion Directe)
            stmt_alert = select(Alert).where(Alert.uuid == task_id)
            res_alert = await db.execute(stmt_alert)
            alert = res_alert.scalars().first()

            # 2. Si pas d'alerte, c'est peut-être un Run Automatique (Scraping Run)
            scraping_run = None
            if not alert:
                stmt_run = select(ScrapingRun).where(ScrapingRun.uuid == task_id)
                res_run = await db.execute(stmt_run)
                scraping_run = res_run.scalars().first()
                
                if scraping_run:
                    # Traitement Mode AUTOMATIQUE
                    # On crée une alerte SEULEMENT si des signaux sont détectés
                    if result_data.get("is_alert", False):
                        logger.info(f"Auto-Scraping: Threat detected for Run {task_id}. Creating Alert.")
                        alert = Alert(
                            url=result_data.get("url"),
                            source_type="AUTOMATIC_SCRAPING",
                            status="AUTO_DETECTED",
                            risk_score=result_data.get("risk_score", 0),
                            is_confirmed=False
                        )
                        db.add(alert)
                        await db.commit()
                        await db.refresh(alert)
                        
                        # Update Run Stats
                        scraping_run.alerts_generated_count += 1
                        scraping_run.log_message = f"Menace détectée sur {result_data.get('url')}"
                    else:
                        logger.info(f"Auto-Scraping: No threat for Run {task_id}. Skipping Alert.")
                        scraping_run.status = "COMPLETED"
                        scraping_run.log_message = "RAS - Analyse terminée"
                        await db.commit()
                        return # Stop here if no alert created

            if not alert:
                logger.error(f"Task {task_id} corresponds to neither Alert nor ScrapingRun. Ignored.")
                return

            # --- Reste du flux (Création Preuve & Analyse) ---
            # S'applique à l'alerte (existante ou fraîchement créée)

            # 3. Créer l'Evidence
            file_hash = result_data.get("evidence_hash")
            file_path = f"evidence_{file_hash[:8]}.png" if file_hash else "unknown.png"
            
            # Extract summary safely
            summary = result_data.get("details", {}).get("analysis", {}).get("summary", "") or ""

            new_evidence = Evidence(
                alert_id=alert.id,
                file_path=file_path,
                file_hash=file_hash or "N/A",
                content_text_preview=summary[:500],
                metadata_json=result_data.get("details", {}).get("evidence_metadata", {})
            )
            db.add(new_evidence)

            # 4. Créer AnalysisResult
            analysis_data = result_data.get("details", {}).get("analysis", {})
            
            new_analysis = AnalysisResult(
                alert_id=alert.id,
                risk_score=result_data.get("risk_score", 0),
                categories=analysis_data.get("categories", []),
                entities=analysis_data.get("entities", []),
                technical_details=analysis_data
            )
            db.add(new_analysis)

            # 5. Mettre à jour l'Alerte (Si mode manuel, update score/status)
            # En mode auto, elle vient d'être créée avec les bons scores, mais ça ne fait pas de mal
            alert.risk_score = result_data.get("risk_score", 0)
            if alert.status == "NEW": # Update only if still new (Manual)
                alert.status = "ANALYZED"
            
            await db.commit()
            logger.info(f"Alert {alert.uuid} updated successfully/created with evidence.")

        except Exception as e:
            logger.error(f"Error processing result for {task_id}: {e}")
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
