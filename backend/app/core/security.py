from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import hmac

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import User
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/access-token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALLOWED_ROLES = {"ADMIN", "ANALYST", "SME"}


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    id: int
    email: str
    role: str


def create_access_token(subject: str, uid: int | None = None, role: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": subject, "exp": expire}
    if uid is not None:
        to_encode["uid"] = uid
    if role:
        to_encode["role"] = role
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(password, hashed_password)
    except Exception:
        return False


def normalize_role(role: str | None) -> str:
    role_value = (role or "ANALYST").upper()
    return role_value if role_value in ALLOWED_ROLES else "ANALYST"


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> AuthenticatedPrincipal | None:
    normalized_username = username.strip().lower()

    try:
        db_user = await db.scalar(select(User).where(User.email == normalized_username))
    except SQLAlchemyError:
        db_user = None

    if db_user and verify_password(password, db_user.password_hash):
        return AuthenticatedPrincipal(
            id=db_user.id,
            email=db_user.email,
            role=normalize_role(db_user.role),
        )

    if hmac.compare_digest(normalized_username, settings.AUTH_ADMIN_EMAIL.strip().lower()) and hmac.compare_digest(
        password, settings.AUTH_ADMIN_PASSWORD
    ):
        return AuthenticatedPrincipal(
            id=0,
            email=normalized_username,
            role="ADMIN",
        )

    return None


async def get_current_subject(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        token_data = TokenPayload(
            sub=payload.get("sub"),
            uid=payload.get("uid"),
            role=payload.get("role"),
        )
    except (JWTError, ValidationError):
        raise credentials_exception

    if not token_data.sub:
        raise credentials_exception
    return token_data.sub
