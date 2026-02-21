from typing import Literal, Optional
from pydantic import BaseModel

UserRole = Literal["ADMIN", "ANALYST", "SME"]


class Token(BaseModel):
    access_token: str
    token_type: str


class AuthUser(BaseModel):
    id: int
    email: str
    role: UserRole


class LoginResponse(Token):
    user: AuthUser


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    uid: Optional[int] = None
    role: Optional[UserRole] = None
