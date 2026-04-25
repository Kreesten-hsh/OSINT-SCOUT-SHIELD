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


def _get_inspector():
    bind = op.get_bind()
    return sa.inspect(bind)


def _has_table(table_name: str) -> bool:
    inspector = _get_inspector()
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = _get_inspector()
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = _get_inspector()
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _has_foreign_key(table_name: str, constraint_name: str) -> bool:
    inspector = _get_inspector()
    return any(foreign_key["name"] == constraint_name for foreign_key in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    if _has_table("alerts"):
        if not _has_column("alerts", "owner_user_id"):
            op.add_column("alerts", sa.Column("owner_user_id", sa.Integer(), nullable=True))
        if not _has_foreign_key("alerts", "fk_alerts_owner_user_id_users"):
            op.create_foreign_key(
                "fk_alerts_owner_user_id_users",
                "alerts",
                "users",
                ["owner_user_id"],
                ["id"],
            )
        if not _has_index("alerts", "ix_alerts_owner_user_id"):
            op.create_index("ix_alerts_owner_user_id", "alerts", ["owner_user_id"])

    if _has_table("monitoring_sources"):
        if not _has_column("monitoring_sources", "owner_user_id"):
            op.add_column("monitoring_sources", sa.Column("owner_user_id", sa.Integer(), nullable=True))
        if not _has_foreign_key("monitoring_sources", "fk_monitoring_sources_owner_user_id_users"):
            op.create_foreign_key(
                "fk_monitoring_sources_owner_user_id_users",
                "monitoring_sources",
                "users",
                ["owner_user_id"],
                ["id"],
            )
        if not _has_index("monitoring_sources", "ix_monitoring_sources_owner_user_id"):
            op.create_index("ix_monitoring_sources_owner_user_id", "monitoring_sources", ["owner_user_id"])


def downgrade() -> None:
    if _has_table("monitoring_sources"):
        if _has_index("monitoring_sources", "ix_monitoring_sources_owner_user_id"):
            op.drop_index("ix_monitoring_sources_owner_user_id", table_name="monitoring_sources")
        if _has_foreign_key("monitoring_sources", "fk_monitoring_sources_owner_user_id_users"):
            op.drop_constraint("fk_monitoring_sources_owner_user_id_users", "monitoring_sources", type_="foreignkey")
        if _has_column("monitoring_sources", "owner_user_id"):
            op.drop_column("monitoring_sources", "owner_user_id")

    if _has_table("alerts"):
        if _has_index("alerts", "ix_alerts_owner_user_id"):
            op.drop_index("ix_alerts_owner_user_id", table_name="alerts")
        if _has_foreign_key("alerts", "fk_alerts_owner_user_id_users"):
            op.drop_constraint("fk_alerts_owner_user_id_users", "alerts", type_="foreignkey")
        if _has_column("alerts", "owner_user_id"):
            op.drop_column("alerts", "owner_user_id")
