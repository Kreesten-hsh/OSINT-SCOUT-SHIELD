"""Add threat indicators table

Revision ID: c1d2e3f4
Revises: b7d4c9a12ef0
Create Date: 2026-03-07 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4"
down_revision: Union[str, None] = "b7d4c9a12ef0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "threat_indicators",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("indicator_type", sa.String(length=10), nullable=False),
        sa.Column("raw_value_masked", sa.String(length=50), nullable=False),
        sa.Column("phone_hash", sa.String(length=64), nullable=True),
        sa.Column("url_hash", sa.String(length=64), nullable=True),
        sa.Column("occurrence_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("danger_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("region", sa.String(length=50), nullable=True),
        sa.Column("dominant_category", sa.String(length=50), nullable=True),
        sa.Column("alert_triggered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("indicator_type IN ('phone', 'url')", name="ck_threat_indicators_type"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_threat_indicators_phone_hash", "threat_indicators", ["phone_hash"], unique=False)
    op.create_index("ix_threat_indicators_url_hash", "threat_indicators", ["url_hash"], unique=False)
    op.create_index("ix_threat_indicators_region", "threat_indicators", ["region"], unique=False)
    op.create_index(
        "ix_threat_indicators_phone_hash_region",
        "threat_indicators",
        ["phone_hash", "region"],
        unique=False,
    )
    op.create_index(
        "ix_threat_indicators_url_hash_region",
        "threat_indicators",
        ["url_hash", "region"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("threat_indicators")
