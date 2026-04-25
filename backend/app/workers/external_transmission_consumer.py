import asyncio
import logging
import uuid

import redis.asyncio as redis

from app.core.config import settings
from app.database import AsyncSessionLocal
from app.services.external_transmissions import TRANSMISSION_QUEUE, process_external_transmission


logger = logging.getLogger(__name__)


async def _requeue_after_delay(redis_client, transmission_uuid: uuid.UUID, wait_seconds: int) -> None:
    await asyncio.sleep(max(1, wait_seconds))
    await redis_client.rpush(TRANSMISSION_QUEUE, str(transmission_uuid))


async def start_external_transmission_consumer() -> None:
    logger.info("Starting external transmission consumer")
    redis_client = None

    try:
        while True:
            try:
                if redis_client is None:
                    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                    await redis_client.ping()
                    logger.info("External transmission consumer connected to Redis")

                item = await redis_client.blpop(TRANSMISSION_QUEUE, timeout=1)
                if item:
                    _, raw_uuid = item
                    try:
                        transmission_uuid = uuid.UUID(str(raw_uuid))
                    except ValueError:
                        logger.error("Invalid transmission uuid on queue", extra={"value": raw_uuid})
                        continue

                    async with AsyncSessionLocal() as db:
                        transmission = await process_external_transmission(
                            db=db,
                            transmission_uuid=transmission_uuid,
                        )

                    if transmission is not None and transmission.status == "RETRYING":
                        asyncio.create_task(
                            _requeue_after_delay(
                                redis_client,
                                transmission_uuid,
                                int(settings.EXTERNAL_RETRY_DELAY_SECONDS),
                            )
                        )

                await asyncio.sleep(0.05)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("External transmission consumer loop error, reconnecting")
                if redis_client is not None:
                    try:
                        await redis_client.aclose()
                    except Exception:
                        pass
                    redis_client = None
                await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("External transmission consumer cancelled")
    finally:
        if redis_client is not None:
            await redis_client.aclose()
