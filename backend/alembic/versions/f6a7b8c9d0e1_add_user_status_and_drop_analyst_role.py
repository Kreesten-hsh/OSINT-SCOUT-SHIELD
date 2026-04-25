"""Add user status and remove analyst role

Revision ID: f6a7b8c9d0e1
Revises: d4e5f6a7
Create Date: 2026-04-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
    )
    op.create_index(op.f("ix_users_status"), "users", ["status"], unique=False)

    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'ANALYST'")

    op.drop_constraint("check_users_role", "users", type_="check")
    op.create_check_constraint(
        "check_users_role",
        "users",
        "role IN ('ADMIN', 'SME')",
    )
    op.create_check_constraint(
        "check_users_status",
        "users",
        "status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'DISABLED')",
    )
    op.alter_column("users", "role", server_default="SME")


def downgrade() -> None:
    op.alter_column("users", "role", server_default="ANALYST")
    op.drop_constraint("check_users_status", "users", type_="check")
    op.drop_constraint("check_users_role", "users", type_="check")
    op.create_check_constraint(
        "check_users_role",
        "users",
        "role IN ('ADMIN', 'ANALYST', 'SME')",
    )
    op.drop_index(op.f("ix_users_status"), table_name="users")
    op.drop_column("users", "status")
