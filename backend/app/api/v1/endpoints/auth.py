from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.security import create_access_token, verify_login_credentials
from app.schemas.token import Token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest = Body(...)) -> Token:
    """JSON login used by the frontend."""
    if verify_login_credentials(login_data.username, login_data.password):
        access_token = create_access_token(subject=login_data.username)
        return Token(access_token=access_token, token_type="bearer")

    raise HTTPException(status_code=400, detail="Identifiants incorrects.")


@router.post("/login/access-token", response_model=Token)
def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    """OAuth2 compatible token endpoint."""
    if verify_login_credentials(form_data.username, form_data.password):
        access_token = create_access_token(subject=form_data.username)
        return Token(access_token=access_token, token_type="bearer")

    raise HTTPException(status_code=400, detail="Identifiants incorrects")
