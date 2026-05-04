"""Backfill missing business profiles for SME users

Revision ID: b1c2d3e4f506
Revises: a9b8c7d6e5f4
Create Date: 2026-04-25 20:45:00.000000

"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f506"
down_revision: Union[str, None] = "a9b8c7d6e5f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_SME_OFFICIAL_NAME = "Kreesten Technologies SARL"


def _default_business_name(email: str | None) -> str:
    local_part = ((email or "").split("@", 1)[0]).replace(".", " ").replace("_", " ").strip()
    if local_part.lower() == "sme":
        return DEFAULT_SME_OFFICIAL_NAME
    title = " ".join(part.capitalize() for part in local_part.split() if part)
    return title or DEFAULT_SME_OFFICIAL_NAME


def upgrade() -> None:
    bind = op.get_bind()

    users = sa.table(
        "users",
        sa.column("id", sa.Integer()),
        sa.column("email", sa.String()),
        sa.column("role", sa.String()),
        sa.column("status", sa.String()),
    )
    business_profiles = sa.table(
        "business_profiles",
        sa.column("uuid", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", sa.Integer()),
        sa.column("official_name", sa.String()),
        sa.column("keywords_json", sa.JSON()),
        sa.column("legit_numbers_json", sa.JSON()),
        sa.column("contact_email", sa.String()),
        sa.column("contact_phone", sa.String()),
        sa.column("validation_status", sa.String()),
        sa.column("validated_at", sa.DateTime(timezone=True)),
    )

    existing_user_ids = {
        int(row.user_id)
        for row in bind.execute(sa.select(business_profiles.c.user_id)).all()
        if row.user_id is not None
    }

    sme_rows = bind.execute(
        sa.select(users.c.id, users.c.email, users.c.status).where(users.c.role == "SME")
    ).all()

    for row in sme_rows:
        if row.id is None or int(row.id) in existing_user_ids:
            continue
        status_value = str(row.status or "ACTIVE")
        bind.execute(
            business_profiles.insert().values(
                uuid=uuid.uuid4(),
                user_id=int(row.id),
                official_name=_default_business_name(row.email),
                keywords_json=[],
                legit_numbers_json=[],
                contact_email=row.email,
                contact_phone=None,
                validation_status=status_value,
                validated_at=datetime.now(timezone.utc) if status_value == "ACTIVE" else None,
            )
        )


def downgrade() -> None:
    # Backfill only. Downgrade intentionally keeps generated PME profiles in place.
    return None
