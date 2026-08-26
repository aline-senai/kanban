"""add sprints, planning, review, sprint_id em atividades e pastas compartilhadas

Revision ID: a3d8f1c9b0e2
Revises: f7a1c9d3e246
Create Date: 2026-08-26 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3d8f1c9b0e2'
down_revision = 'f7a1c9d3e246'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sprints',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('turma_id', sa.UUID(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['turma_id'], ['turmas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'sprint_plannings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sprint_id', sa.UUID(), nullable=False),
        sa.Column('data', sa.DateTime(timezone=True), nullable=True),
        sa.Column('texto', sa.Text(), nullable=True),
        sa.Column('criado_por_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['sprint_id'], ['sprints.id']),
        sa.ForeignKeyConstraint(['criado_por_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sprint_id', name='uq_sprint_planning'),
    )
    op.create_table(
        'sprint_reviews',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sprint_id', sa.UUID(), nullable=False),
        sa.Column('data', sa.DateTime(timezone=True), nullable=True),
        sa.Column('texto', sa.Text(), nullable=True),
        sa.Column('criado_por_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['sprint_id'], ['sprints.id']),
        sa.ForeignKeyConstraint(['criado_por_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sprint_id', name='uq_sprint_review'),
    )
    op.create_table(
        'pastas_compartilhadas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('turma_id', sa.UUID(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('criado_por_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['turma_id'], ['turmas.id']),
        sa.ForeignKeyConstraint(['criado_por_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('atividades', sa.Column('sprint_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_atividades_sprint_id', 'atividades', 'sprints', ['sprint_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_atividades_sprint_id', 'atividades', type_='foreignkey')
    op.drop_column('atividades', 'sprint_id')
    op.drop_table('pastas_compartilhadas')
    op.drop_table('sprint_reviews')
    op.drop_table('sprint_plannings')
    op.drop_table('sprints')
