"""adiciona users.deve_trocar_senha (força troca de senha após reset por professor)

Revision ID: b5c6d7e8f9a0
Revises: a4c5d6e7f8b9
Create Date: 2026-09-09 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b5c6d7e8f9a0'
down_revision = 'a4c5d6e7f8b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('deve_trocar_senha', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('users', 'deve_trocar_senha')
