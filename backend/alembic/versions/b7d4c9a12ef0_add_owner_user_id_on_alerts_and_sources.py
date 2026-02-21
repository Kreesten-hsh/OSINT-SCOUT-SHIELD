"""Add owner_user_id on alerts and monitoring_sources

Revision ID: b7d4c9a12ef0
Revises: a1b2c3d4e5f6
Create Date: 2026-02-21 14:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7d4c9a12ef0"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("owner_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_alerts_owner_user_id_users",
        "alerts",
        "users",
        ["owner_user_id"],
        ["id"],
    )
    op.create_index("ix_alerts_owner_user_id", "alerts", ["owner_user_id"])

    op.add_column("monitoring_sources", sa.Column("owner_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_monitoring_sources_owner_user_id_users",
        "monitoring_sources",
        "users",
        ["owner_user_id"],
        ["id"],
    )
    op.create_index("ix_monitoring_sources_owner_user_id", "monitoring_sources", ["owner_user_id"])


def downgrade() -> None:
    op.drop_index("ix_monitoring_sources_owner_user_id", table_name="monitoring_sources")
    op.drop_constraint("fk_monitoring_sources_owner_user_id_users", "monitoring_sources", type_="foreignkey")
    op.drop_column("monitoring_sources", "owner_user_id")

    op.drop_index("ix_alerts_owner_user_id", table_name="alerts")
    op.drop_constraint("fk_alerts_owner_user_id_users", "alerts", type_="foreignkey")
    op.drop_column("alerts", "owner_user_id")
