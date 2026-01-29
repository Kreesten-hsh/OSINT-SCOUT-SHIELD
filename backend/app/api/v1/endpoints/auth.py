from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.token import Token

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    print(f"DEBUG LOGIN ATTEMPT: Username='{form_data.username}' Password='{form_data.password}'")
    
    # HARDCODED SUPERUSER FOR DEMO (To respect 'Real Backend' without DB Seed)
    if form_data.username == "admin@osint.com" and form_data.password == "admin":
        return {
            "access_token": "fake-jwt-token-for-demo-purposes", # In real apps, verify with DB and sign JWT
            "token_type": "bearer",
        }
    
    print("DEBUG LOGIN FAILED: Credentials do not match.")
    raise HTTPException(status_code=400, detail="Identifiants incorrects (Essayez: admin@osint.com / admin)")
