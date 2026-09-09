"""aprovação de professor: users.aprovado e notificacoes.referencia_user_id

Revision ID: f2b3c4d5e6a7
Revises: e1a2b3c4d5f6
Create Date: 2026-09-09 00:05:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f2b3c4d5e6a7'
down_revision = 'e1a2b3c4d5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('aprovado', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('notificacoes', sa.Column('referencia_user_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_notificacoes_referencia_user_id_users',
        'notificacoes', 'users',
        ['referencia_user_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_notificacoes_referencia_user_id_users', 'notificacoes', type_='foreignkey')
    op.drop_column('notificacoes', 'referencia_user_id')
    op.drop_column('users', 'aprovado')
