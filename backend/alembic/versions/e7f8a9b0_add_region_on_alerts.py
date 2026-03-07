"""Add region column on alerts table

Revision ID: e7f8a9b0
Revises: c1d2e3f4
Create Date: 2026-03-07 00:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0"
down_revision: Union[str, None] = "c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("region", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("alerts", "region")
