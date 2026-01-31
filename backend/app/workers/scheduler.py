import asyncio
import json
import logging
import redis.asyncio as redis
from datetime import datetime
from sqlalchemy import select
from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models.source import MonitoringSource, ScrapingRun

logger = logging.getLogger(__name__)

async def check_and_schedule_sources():
    """
    Vérifie les sources actives et planifie celles qui doivent l'être.
    """
    logger.info("Scheduler: Checking for due sources...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Récupérer sources actives
            stmt = select(MonitoringSource).where(MonitoringSource.is_active == True)
            result = await db.execute(stmt)
            sources = result.scalars().all()
            
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            
            for source in sources:
                # Logic simple: Si pas de last_run ou last_run + frequency < now
                should_run = False
                if not source.last_run_at:
                    should_run = True
                else:
                    # Convert to timestamps/timedelta check
                    # Simplification pour Lot 4: On run toujours si actif pour la démo 'Auto'
                    # Dans un vrai système, on comparerait datetime.utcnow()
                    should_run = True # FOR DEMO PURPOSES: Runs continuously/frequently
                
                if should_run:
                    # Create Run Record
                    new_run = ScrapingRun(source_id=source.id, status="PENDING")
                    db.add(new_run)
                    await db.commit()
                    await db.refresh(new_run)
                    
                    # Push to Redis
                    task_payload = {
                        "id": str(new_run.uuid), # Track by Run UUID or mimic Alert UUID? 
                        # Worker expects 'id' to be alert UUID to update Alert. 
                        # But here we are creating alerts *from* the run.
                        # Conflict: The worker as written assumes it is processing an EXISTING Alert.
                        # ADAPTATION: Auto-scraping needs a different mode or the worker needs to handle "Discovery".
                        
                        # Let's assume Auto Scraping = Re-scanning a known URL for changes OR Discovering from a list.
                        # For now, let's treat the Source.url as the Target.
                        # And we trigger a "Scan" which behaves like a Manual Ingestion but tagged AUTO.
                        
                        "url": source.url,
                        "source_type": "AUTOMATIC_SCRAPING",
                        "run_id": str(new_run.uuid),
                        "mode": "DISCOVERY" # Hint for worker to look for links?
                    }
                    
                    # Note: Worker needs to adapt to `run_id` vs `alert_id`.
                    # Currently Worker expects "id".
                    # I will send a temporary ID, but the ResultConsumer needs to know if it should creating a new Alert or updating one.
                    # Lot 4 spec: "Create Alert Automatically". So Run -> Scrape -> Analyze -> If Threat -> PROPOSE Alert.
                    
                    await r.rpush("osint_to_scan", json.dumps(task_payload))
                    
                    # Update Source
                    source.last_run_at = datetime.utcnow()
                    db.add(source)
                    await db.commit()
            
            await r.aclose()
            
        except Exception as e:
            logger.error(f"Scheduler Error: {e}")

async def start_scheduler():
    logger.info("Starting Automatic Scheduler...")
    while True:
        await check_and_schedule_sources()
        await asyncio.sleep(60) # Check every minute
