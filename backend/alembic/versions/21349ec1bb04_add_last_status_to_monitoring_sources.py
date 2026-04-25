"""Add last_status to monitoring_sources

Revision ID: 21349ec1bb04
Revises: 8798003efbda
Create Date: 2026-01-31 19:50:33.659597

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21349ec1bb04'
down_revision: Union[str, None] = '8798003efbda'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_table("monitoring_sources"):
        return
    if _has_column("monitoring_sources", "last_status"):
        return
    op.add_column("monitoring_sources", sa.Column("last_status", sa.String(), nullable=True))


def downgrade() -> None:
    if not _has_table("monitoring_sources"):
        return
    if not _has_column("monitoring_sources", "last_status"):
        return
    op.drop_column("monitoring_sources", "last_status")
