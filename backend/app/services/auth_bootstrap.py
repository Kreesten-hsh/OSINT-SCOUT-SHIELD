from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import BusinessProfile, User


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
            email=settings.AUTH_SME_EMAIL.strip().lower(),
            password=settings.AUTH_SME_PASSWORD,
            role="SME",
        ),
    )


def _seed_business_name(email: str) -> str:
    local_part = email.split("@", 1)[0].replace(".", " ").replace("_", " ").strip()
    if local_part.lower() == "sme":
        return "PME Demo Benin"
    title = " ".join(part.capitalize() for part in local_part.split() if part)
    return title or "PME Demo Benin"


def _build_seed_business_profile(user: User) -> BusinessProfile:
    validated_at = datetime.now(timezone.utc) if user.status == "ACTIVE" else None
    return BusinessProfile(
        user_id=user.id,
        official_name=_seed_business_name(user.email),
        keywords_json=[],
        legit_numbers_json=[],
        contact_email=user.email,
        contact_phone=None,
        validation_status=user.status,
        validated_at=validated_at,
    )


async def ensure_default_auth_users(db: AsyncSession) -> None:
    seeded_users: dict[str, User] = {}
    for seed in _default_seed_users():
        existing = await db.scalar(select(User).where(User.email == seed.email))
        if existing is not None:
            seeded_users[seed.email] = existing
            continue

        user = User(
            email=seed.email,
            password_hash=get_password_hash(seed.password),
            role=seed.role,
            status="ACTIVE",
        )
        db.add(user)
        seeded_users[seed.email] = user

    await db.flush()

    sme_email = settings.AUTH_SME_EMAIL.strip().lower()
    sme_user = seeded_users.get(sme_email) or await db.scalar(select(User).where(User.email == sme_email))
    if sme_user is not None and sme_user.id is not None:
        existing_profile = await db.scalar(select(BusinessProfile).where(BusinessProfile.user_id == sme_user.id))
        if existing_profile is None:
            db.add(_build_seed_business_profile(sme_user))
        else:
            desired_name = _seed_business_name(sme_user.email)
            if (existing_profile.official_name or "").strip().lower() in {"sme", "sme demo"}:
                existing_profile.official_name = desired_name
            if not existing_profile.contact_email:
                existing_profile.contact_email = sme_user.email
            existing_profile.validation_status = sme_user.status
            if sme_user.status == "ACTIVE" and existing_profile.validated_at is None:
                existing_profile.validated_at = datetime.now(timezone.utc)
            db.add(existing_profile)

    await db.commit()
