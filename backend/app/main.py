from contextlib import asynccontextmanager
import asyncio

import redis.asyncio as redis
import sentry_sdk
import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging


setup_logging(json_logs=settings.LOG_JSON, log_level=settings.LOG_LEVEL)
logger = structlog.get_logger(__name__)

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=str(settings.SENTRY_DSN),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    from app.database import Base, engine
    from app.models import Alert, Evidence, MonitoringSource, Report  # noqa: F401
    from app.workers.result_consumer import start_result_consumer

    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.warning("AUTO_CREATE_TABLES is enabled; use Alembic migrations in production")

    background_tasks: list[asyncio.Task] = []
    if settings.ENABLE_RESULT_CONSUMER:
        background_tasks.append(asyncio.create_task(start_result_consumer(), name="result_consumer"))
        logger.info("Background worker started", worker="result_consumer")

    logger.info("OSINT-SCOUT Shield API started")
    try:
        yield
    finally:
        for task in background_tasks:
            task.cancel()
        if background_tasks:
            await asyncio.gather(*background_tasks, return_exceptions=True)
        logger.info("OSINT-SCOUT Shield API shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception", method=request.method, path=str(request.url.path))
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal Server Error"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    msg = "; ".join([f"{e['loc'][-1]}: {e['msg']}" for e in errors])
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": f"Erreur de validation: {msg}",
            "data": errors,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
Instrumentator().instrument(app).expose(app, include_in_schema=False)


@app.get("/health")
async def health_check() -> dict:
    """Detailed health check for readiness probes."""
    try:
        from app.database import engine

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.error("Healthcheck DB failed", error=str(e))
        db_status = "error"

    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        await redis_client.aclose()
        redis_status = "ok"
    except Exception as e:
        logger.error("Healthcheck Redis failed", error=str(e))
        redis_status = "error"

    status = "ok" if db_status == "ok" and redis_status == "ok" else "error"
    return {
        "status": status,
        "service": settings.PROJECT_NAME,
        "components": {
            "db": db_status,
            "redis": redis_status,
        },
    }
