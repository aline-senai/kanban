"""planning/review passam a ser por sprint + equipe

Revision ID: d91a4c7f6b23
Revises: c5b8e2f4a917
Create Date: 2026-08-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd91a4c7f6b23'
down_revision = 'c5b8e2f4a917'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sprint_plannings', sa.Column('grupo_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_sprint_plannings_grupo_id', 'sprint_plannings', 'grupos', ['grupo_id'], ['id'])
    op.drop_constraint('uq_sprint_planning', 'sprint_plannings', type_='unique')
    op.create_unique_constraint(
        'uq_sprint_planning_grupo', 'sprint_plannings', ['sprint_id', 'grupo_id']
    )

    op.add_column('sprint_reviews', sa.Column('grupo_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_sprint_reviews_grupo_id', 'sprint_reviews', 'grupos', ['grupo_id'], ['id'])
    op.drop_constraint('uq_sprint_review', 'sprint_reviews', type_='unique')
    op.create_unique_constraint(
        'uq_sprint_review_grupo', 'sprint_reviews', ['sprint_id', 'grupo_id']
    )


def downgrade() -> None:
    op.drop_constraint('uq_sprint_review_grupo', 'sprint_reviews', type_='unique')
    op.create_unique_constraint('uq_sprint_review', 'sprint_reviews', ['sprint_id'])
    op.drop_constraint('fk_sprint_reviews_grupo_id', 'sprint_reviews', type_='foreignkey')
    op.drop_column('sprint_reviews', 'grupo_id')

    op.drop_constraint('uq_sprint_planning_grupo', 'sprint_plannings', type_='unique')
    op.create_unique_constraint('uq_sprint_planning', 'sprint_plannings', ['sprint_id'])
    op.drop_constraint('fk_sprint_plannings_grupo_id', 'sprint_plannings', type_='foreignkey')
    op.drop_column('sprint_plannings', 'grupo_id')
