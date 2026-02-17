"""Add citizen signal fields and extend alert status constraint

Revision ID: f4c8b21a9d10
Revises: e8f9a1b2c3d4
Create Date: 2026-02-17 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4c8b21a9d10"
down_revision: Union[str, None] = "e8f9a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("phone_number", sa.String(), nullable=True))
    op.add_column("alerts", sa.Column("reported_message", sa.Text(), nullable=True))
    op.add_column("alerts", sa.Column("citizen_channel", sa.String(), nullable=True))

    op.create_index(op.f("ix_alerts_phone_number"), "alerts", ["phone_number"], unique=False)
    op.create_index(op.f("ix_alerts_citizen_channel"), "alerts", ["citizen_channel"], unique=False)

    try:
        op.drop_constraint("check_alert_status", "alerts", type_="check")
    except Exception:
        pass

    op.create_check_constraint(
        "check_alert_status",
        "alerts",
        "status IN ('NEW', 'IN_REVIEW', 'CONFIRMED', 'DISMISSED', 'BLOCKED_SIMULATED')",
    )


def downgrade() -> None:
    op.drop_constraint("check_alert_status", "alerts", type_="check")
    op.create_check_constraint(
        "check_alert_status",
        "alerts",
        "status IN ('NEW', 'IN_REVIEW', 'CONFIRMED', 'DISMISSED')",
    )

    op.drop_index(op.f("ix_alerts_citizen_channel"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_phone_number"), table_name="alerts")

    op.drop_column("alerts", "citizen_channel")
    op.drop_column("alerts", "reported_message")
    op.drop_column("alerts", "phone_number")
