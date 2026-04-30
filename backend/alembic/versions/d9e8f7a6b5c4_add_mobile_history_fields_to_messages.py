"""Add mobile history fields to messages

Revision ID: d9e8f7a6b5c4
Revises: c3d4e5f60718
Create Date: 2026-04-29 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d9e8f7a6b5c4"
down_revision: Union[str, None] = "c3d4e5f60718"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("device_install_id", sa.String(length=128), nullable=True))
    op.add_column(
        "messages",
        sa.Column("history_entry_type", sa.String(length=16), nullable=False, server_default="VERIFY"),
    )
    op.add_column("messages", sa.Column("submitted_phone_masked", sa.String(length=32), nullable=True))
    op.create_index(op.f("ix_messages_device_install_id"), "messages", ["device_install_id"], unique=False)
    op.create_index(op.f("ix_messages_history_entry_type"), "messages", ["history_entry_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_messages_history_entry_type"), table_name="messages")
    op.drop_index(op.f("ix_messages_device_install_id"), table_name="messages")
    op.drop_column("messages", "submitted_phone_masked")
    op.drop_column("messages", "history_entry_type")
    op.drop_column("messages", "device_install_id")
