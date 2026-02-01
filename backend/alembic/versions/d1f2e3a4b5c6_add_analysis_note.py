"""add analysis_note

Revision ID: d1f2e3a4b5c6
Revises: ca62c42e41a6
Create Date: 2026-02-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd1f2e3a4b5c6'
down_revision = 'ca62c42e41a6'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('alerts', sa.Column('analysis_note', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('alerts', 'analysis_note')
