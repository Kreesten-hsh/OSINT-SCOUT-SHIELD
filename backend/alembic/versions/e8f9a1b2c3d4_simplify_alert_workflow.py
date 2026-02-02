"""Simplify alert workflow to 4 statuses

Revision ID: e8f9a1b2c3d4
Revises: d1f2e3a4b5c6
Create Date: 2026-02-01 08:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8f9a1b2c3d4'
down_revision = 'd1f2e3a4b5c6'
branch_labels = None
depends_on = None


def upgrade():
    """
    Simplify alert workflow:
    - Map old statuses to new ones
    - Remove is_confirmed column
    - Add CHECK constraint for status
    """
    # 1. Map old statuses to new 4-status system
    op.execute("""
        UPDATE alerts 
        SET status = CASE
            WHEN status = 'INVESTIGATING' THEN 'IN_REVIEW'
            WHEN status = 'ANALYZED' THEN 'IN_REVIEW'
            WHEN status IN ('CLEAN', 'FALSE_POSITIVE', 'CLOSED') THEN 'DISMISSED'
            ELSE status
        END
        WHERE status NOT IN ('NEW', 'IN_REVIEW', 'CONFIRMED', 'DISMISSED')
    """)
    
    # 2. Remove is_confirmed column (redundant with status)
    op.drop_column('alerts', 'is_confirmed')
    
    # 3. Add CHECK constraint for status (PostgreSQL)
    op.create_check_constraint(
        'check_alert_status',
        'alerts',
        "status IN ('NEW', 'IN_REVIEW', 'CONFIRMED', 'DISMISSED')"
    )


def downgrade():
    """
    Revert changes - restore old workflow
    """
    # 1. Remove CHECK constraint
    op.drop_constraint('check_alert_status', 'alerts', type_='check')
    
    # 2. Restore is_confirmed column
    op.add_column('alerts', sa.Column('is_confirmed', sa.Boolean(), nullable=True))
    
    # Set is_confirmed based on status
    op.execute("""
        UPDATE alerts 
        SET is_confirmed = CASE
            WHEN status = 'CONFIRMED' THEN TRUE
            ELSE FALSE
        END
    """)
    
    # Make is_confirmed NOT NULL with default
    op.alter_column('alerts', 'is_confirmed', nullable=False, server_default='false')
    
    # 3. Restore old statuses (best effort - some info is lost)
    op.execute("""
        UPDATE alerts 
        SET status = CASE
            WHEN status = 'IN_REVIEW' THEN 'INVESTIGATING'
            WHEN status = 'DISMISSED' THEN 'CLOSED'
            ELSE status
        END
    """)
