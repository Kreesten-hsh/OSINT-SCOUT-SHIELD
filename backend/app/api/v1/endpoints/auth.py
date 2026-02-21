from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import authenticate_user, create_access_token
from app.database import get_db
from app.schemas.token import AuthUser, LoginResponse, Token
from app.services.auth_bootstrap import ensure_default_auth_users

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


async def _authenticate_or_raise(
    db: AsyncSession,
    username: str,
    password: str,
):
    try:
        await ensure_default_auth_users(db)
    except SQLAlchemyError:
        # Keep legacy login fallback path active when users table is not migrated yet.
        pass

    principal = await authenticate_user(db, username, password)
    if principal is None:
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")

    return principal


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest = Body(...),
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """JSON login used by the frontend."""
    principal = await _authenticate_or_raise(db, login_data.username, login_data.password)
    access_token = create_access_token(
        subject=principal.email,
        uid=principal.id,
        role=principal.role,
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=AuthUser(
            id=principal.id,
            email=principal.email,
            role=principal.role,
        ),
    )


@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """OAuth2 compatible token endpoint."""
    principal = await _authenticate_or_raise(db, form_data.username, form_data.password)
    access_token = create_access_token(
        subject=principal.email,
        uid=principal.id,
        role=principal.role,
    )
    return Token(access_token=access_token, token_type="bearer")
