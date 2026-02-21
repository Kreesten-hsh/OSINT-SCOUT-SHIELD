from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    authenticate_user,
    create_access_token,
    get_current_token_payload,
    get_password_hash,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.schemas.response import APIResponse
from app.schemas.token import TokenPayload
from app.schemas.token import AuthUser, LoginResponse, Token
from app.services.auth_bootstrap import ensure_default_auth_users

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


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


@router.post("/change-password", response_model=APIResponse[dict[str, bool]])
async def change_password(
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    token_data: TokenPayload = Depends(get_current_token_payload),
) -> APIResponse[dict[str, bool]]:
    if token_data.uid is None or int(token_data.uid) <= 0:
        raise HTTPException(status_code=400, detail="Changement de mot de passe non disponible pour ce compte.")

    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="La confirmation du nouveau mot de passe ne correspond pas.")

    if request.current_password == request.new_password:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit etre different de l'actuel.")

    user = await db.scalar(select(User).where(User.id == int(token_data.uid)))
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

    user.password_hash = get_password_hash(request.new_password)
    db.add(user)
    await db.commit()

    return APIResponse(
        success=True,
        message="Mot de passe mis a jour avec succes.",
        data={"updated": True},
    )
