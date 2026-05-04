"""Align legacy evidences columns with ORM model

Revision ID: e1f2a3b4c5d6
Revises: d9e8f7a6b5c4
Create Date: 2026-05-03 23:35:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d9e8f7a6b5c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    columns = _column_names("evidences")

    if "type" not in columns:
        op.add_column(
            "evidences",
            sa.Column("type", sa.String(), nullable=False, server_default="SCREENSHOT"),
        )

    if "status" not in columns:
        op.add_column(
            "evidences",
            sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        )

    if "sealed_at" not in columns:
        op.add_column(
            "evidences",
            sa.Column("sealed_at", sa.DateTime(timezone=True), nullable=True),
        )

    indexes = _index_names("evidences")
    if "ix_evidences_type" not in indexes:
        op.create_index("ix_evidences_type", "evidences", ["type"], unique=False)
    if "ix_evidences_status" not in indexes:
        op.create_index("ix_evidences_status", "evidences", ["status"], unique=False)


def downgrade() -> None:
    indexes = _index_names("evidences")
    if "ix_evidences_status" in indexes:
        op.drop_index("ix_evidences_status", table_name="evidences")
    if "ix_evidences_type" in indexes:
        op.drop_index("ix_evidences_type", table_name="evidences")

    columns = _column_names("evidences")
    if "sealed_at" in columns:
        op.drop_column("evidences", "sealed_at")
    if "status" in columns:
        op.drop_column("evidences", "status")
    if "type" in columns:
        op.drop_column("evidences", "type")
