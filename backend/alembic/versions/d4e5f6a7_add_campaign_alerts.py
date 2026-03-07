"""Add campaign alerts table

Revision ID: d4e5f6a7
Revises: e7f8a9b0
Create Date: 2026-03-07 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7"
down_revision: Union[str, None] = "e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_type", sa.String(length=100), nullable=False),
        sa.Column("matched_rules", sa.JSON(), nullable=True),
        sa.Column("incident_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("dominant_region", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaign_alerts_campaign_type", "campaign_alerts", ["campaign_type"], unique=False)
    op.create_index("ix_campaign_alerts_status", "campaign_alerts", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_campaign_alerts_status", table_name="campaign_alerts")
    op.drop_index("ix_campaign_alerts_campaign_type", table_name="campaign_alerts")
    op.drop_table("campaign_alerts")
