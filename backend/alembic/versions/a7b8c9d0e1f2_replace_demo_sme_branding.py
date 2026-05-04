"""Replace placeholder SME branding in demo data

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-05-04 18:45:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_SME_OFFICIAL_NAME = "Kreesten Technologies SARL"
DEFAULT_SME_DOMAIN_SLUG = "kreesten-technologies-sarl"
PLACEHOLDER_NAMES = ("PME Demo Benin", "PME Benin")
PLACEHOLDER_NAMES_NORMALIZED = tuple(name.lower() for name in PLACEHOLDER_NAMES)
DEFAULT_KEYWORDS = [
    DEFAULT_SME_OFFICIAL_NAME,
    f"support {DEFAULT_SME_OFFICIAL_NAME}",
    f"service client {DEFAULT_SME_OFFICIAL_NAME}",
    "remboursement urgent",
    "paiement bloque",
]


def upgrade() -> None:
    bind = op.get_bind()

    business_profiles = sa.table(
        "business_profiles",
        sa.column("official_name", sa.String()),
        sa.column("keywords_json", postgresql.JSON(astext_type=sa.Text())),
    )
    messages = sa.table(
        "messages",
        sa.column("content", sa.Text()),
        sa.column("submitted_url", sa.String()),
    )

    bind.execute(
        sa.update(business_profiles)
        .where(sa.func.lower(sa.func.trim(business_profiles.c.official_name)).in_(PLACEHOLDER_NAMES_NORMALIZED))
        .values(
            official_name=DEFAULT_SME_OFFICIAL_NAME,
            keywords_json=DEFAULT_KEYWORDS,
        )
    )

    for placeholder_name in PLACEHOLDER_NAMES:
        bind.execute(
            sa.update(messages)
            .where(messages.c.content.ilike(f"%{placeholder_name}%"))
            .values(content=sa.func.replace(messages.c.content, placeholder_name, DEFAULT_SME_OFFICIAL_NAME))
        )

    for placeholder_slug in ("pme-demo-benin", "pme-benin"):
        bind.execute(
            sa.update(messages)
            .where(messages.c.content.ilike(f"%{placeholder_slug}%"))
            .values(content=sa.func.replace(messages.c.content, placeholder_slug, DEFAULT_SME_DOMAIN_SLUG))
        )
        bind.execute(
            sa.update(messages)
            .where(messages.c.submitted_url.ilike(f"%{placeholder_slug}%"))
            .values(submitted_url=sa.func.replace(messages.c.submitted_url, placeholder_slug, DEFAULT_SME_DOMAIN_SLUG))
        )


def downgrade() -> None:
    return None
