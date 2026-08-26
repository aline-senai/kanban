"""add atividade vinculos

Revision ID: f7a1c9d3e246
Revises: d4f6a8c2b915
Create Date: 2026-08-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7a1c9d3e246'
down_revision = 'd4f6a8c2b915'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'atividade_vinculos',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('atividade_id', sa.UUID(), nullable=False),
        sa.Column('vinculada_id', sa.UUID(), nullable=False),
        sa.Column('criado_por_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['atividade_id'], ['atividades.id']),
        sa.ForeignKeyConstraint(['vinculada_id'], ['atividades.id']),
        sa.ForeignKeyConstraint(['criado_por_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('atividade_id', 'vinculada_id', name='uq_atividade_vinculo'),
    )


def downgrade() -> None:
    op.drop_table('atividade_vinculos')
