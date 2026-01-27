from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="OSINT-SCOUT & SHIELD API",
    description="API de veille OSINT proactive contre la fraude numérique au Bénin.",
    version="0.1.0"
)

# Configuration CORS pour autoriser le frontend React
origins = [
    "http://localhost:5173", # Frontend Vite
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API OSINT-SCOUT & SHIELD", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "api"}
