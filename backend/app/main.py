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
        content={"success": False, "message": "Internal Server Error", "error": str(exc)},
    )

from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Construct a clear message from validation errors
    errors = exc.errors()
    msg = "; ".join([f"{e['loc'][-1]}: {e['msg']}" for e in errors])
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": f"Erreur de validation: {msg}", "data": errors},
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
