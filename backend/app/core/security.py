from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import hmac
from collections.abc import Sequence

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
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login/access-token",
    auto_error=False,
)
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


async def get_current_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    return _decode_token_or_raise(token)


def _decode_token_or_raise(token: str) -> TokenPayload:
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

    token_data.role = normalize_role(token_data.role)
    return token_data


async def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme_optional),
) -> AuthenticatedPrincipal | None:
    if token is None:
        return None

    token_data = _decode_token_or_raise(token)
    if token_data.uid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedPrincipal(
        id=int(token_data.uid),
        email=token_data.sub,
        role=normalize_role(token_data.role),
    )


def require_role(allowed_roles: Sequence[str]):
    normalized_allowed_roles = {normalize_role(role) for role in allowed_roles}

    async def _require_role(
        token_data: TokenPayload = Depends(get_current_token_payload),
    ) -> TokenPayload:
        if normalize_role(token_data.role) not in normalized_allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return token_data

    return _require_role


def resolve_scope_owner_user_id(
    token_data: TokenPayload,
    scope: str | None,
) -> int | None:
    role = normalize_role(token_data.role)
    if role == "SME" or scope == "me":
        if token_data.uid is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return int(token_data.uid)
    return None


async def get_current_subject(
    token_data: TokenPayload = Depends(get_current_token_payload),
) -> str:
    if not token_data.sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data.sub
