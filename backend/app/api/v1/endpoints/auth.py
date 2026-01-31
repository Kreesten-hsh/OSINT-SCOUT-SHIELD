from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import jwt
from app.schemas.token import Token
from app.core.config import settings

router = APIRouter()

# Configuration JWT simple (Déterministe)
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest = Body(...)) -> Any:
    """
    JSON Login for Frontend.
    """
    if login_data.username == "admin@osint.com" and login_data.password == "admin":
        access_token = create_access_token(data={"sub": login_data.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
    
    raise HTTPException(status_code=400, detail="Identifiants incorrects.")

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login.
    """
    if form_data.username == "admin@osint.com" and form_data.password == "admin":
        access_token = create_access_token(data={"sub": form_data.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
    
    raise HTTPException(status_code=400, detail="Identifiants incorrects (Essayez: admin@osint.com / admin)")
