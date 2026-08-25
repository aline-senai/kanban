"""add materiais

Revision ID: d4f6a8c2b915
Revises: c1a7e5f9b2d3
Create Date: 2026-08-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4f6a8c2b915'
down_revision = 'c1a7e5f9b2d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'materiais',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('turma_id', sa.UUID(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('arquivo_path', sa.String(), nullable=False),
        sa.Column('is_modelo', sa.Boolean(), nullable=False),
        sa.Column('uploaded_by_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['turma_id'], ['turmas.id']),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('materiais')
