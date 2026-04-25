"""Add department fields to memory domain messages

Revision ID: c3d4e5f60718
Revises: b1c2d3e4f506
Create Date: 2026-04-25 23:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f60718"
down_revision: Union[str, None] = "b1c2d3e4f506"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("department", sa.String(length=32), nullable=True))
    op.add_column(
        "messages",
        sa.Column("department_source", sa.String(length=24), nullable=False, server_default="UNKNOWN"),
    )
    op.create_index(op.f("ix_messages_department"), "messages", ["department"], unique=False)
    op.create_index(op.f("ix_messages_department_source"), "messages", ["department_source"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_messages_department_source"), table_name="messages")
    op.drop_index(op.f("ix_messages_department"), table_name="messages")
    op.drop_column("messages", "department_source")
    op.drop_column("messages", "department")
