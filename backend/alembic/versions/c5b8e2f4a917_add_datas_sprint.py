"""add data_inicio/data_fim em sprints

Revision ID: c5b8e2f4a917
Revises: a3d8f1c9b0e2
Create Date: 2026-08-26 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5b8e2f4a917'
down_revision = 'a3d8f1c9b0e2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sprints', sa.Column('data_inicio', sa.Date(), nullable=True))
    op.add_column('sprints', sa.Column('data_fim', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('sprints', 'data_fim')
    op.drop_column('sprints', 'data_inicio')
