from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User


@dataclass(frozen=True)
class SeedUserSpec:
    email: str
    password: str
    role: str


def _default_seed_users() -> tuple[SeedUserSpec, ...]:
    return (
        SeedUserSpec(
            email=settings.AUTH_ADMIN_EMAIL.strip().lower(),
            password=settings.AUTH_ADMIN_PASSWORD,
            role="ADMIN",
        ),
        SeedUserSpec(
            email=settings.AUTH_ANALYST_EMAIL.strip().lower(),
            password=settings.AUTH_ANALYST_PASSWORD,
            role="ANALYST",
        ),
        SeedUserSpec(
            email=settings.AUTH_SME_EMAIL.strip().lower(),
            password=settings.AUTH_SME_PASSWORD,
            role="SME",
        ),
    )


async def ensure_default_auth_users(db: AsyncSession) -> None:
    for seed in _default_seed_users():
        existing = await db.scalar(select(User).where(User.email == seed.email))
        if existing is not None:
            continue

        db.add(
            User(
                email=seed.email,
                password_hash=get_password_hash(seed.password),
                role=seed.role,
            )
        )

    await db.commit()
