from typing import Literal, Optional
from pydantic import BaseModel

UserRole = Literal["ADMIN", "SME"]
UserStatus = Literal["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED"]


class Token(BaseModel):
    access_token: str
    token_type: str


class AuthUser(BaseModel):
    id: int
    email: str
    role: UserRole
    status: UserStatus


class LoginResponse(Token):
    user: AuthUser


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    uid: Optional[int] = None
    role: Optional[UserRole] = None
