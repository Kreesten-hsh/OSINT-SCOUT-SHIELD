from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Global Error: {str(exc)}\n{traceback.format_exc()}\n{'-'*50}\n"
    try:
        with open("/app/global_error.log", "a") as f:
            f.write(error_msg)
    except:
        print(error_msg) # Fallback to stdout
        
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

# Configuration CORS (Pour le Frontend React)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montage des routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.workers.result_consumer import start_result_consumer
    from app.workers.scheduler import start_scheduler
    
    asyncio.create_task(start_result_consumer())
    asyncio.create_task(start_scheduler())
    
    # Auto-create tables if missing (Emergency Fix)
    from app.database import engine, Base
    from app.models import Alert, Evidence, MonitoringSource, Report # Ensure models loaded
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "OSINT-SCOUT Shield API"}
