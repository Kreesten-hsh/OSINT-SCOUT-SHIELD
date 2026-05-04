"""Align legacy reports columns with ORM model

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-05-04 16:25:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    columns = _column_names("reports")

    if "snapshot_version" not in columns:
        op.add_column(
            "reports",
            sa.Column("snapshot_version", sa.String(), nullable=False, server_default="1.0"),
        )

    if "snapshot_hash_sha256" not in columns:
        op.add_column(
            "reports",
            sa.Column("snapshot_hash_sha256", sa.String(), nullable=True),
        )

    if "generated_by" not in columns:
        op.add_column(
            "reports",
            sa.Column("generated_by", sa.String(), nullable=True),
        )


def downgrade() -> None:
    columns = _column_names("reports")

    if "generated_by" in columns:
        op.drop_column("reports", "generated_by")

    if "snapshot_hash_sha256" in columns:
        op.drop_column("reports", "snapshot_hash_sha256")

    if "snapshot_version" in columns:
        op.drop_column("reports", "snapshot_version")
