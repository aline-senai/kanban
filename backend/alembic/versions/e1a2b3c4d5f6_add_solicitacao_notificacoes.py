"""adiciona tipos solicitacao_senha e solicitacao_professor ao enum de notificacoes

Revision ID: e1a2b3c4d5f6
Revises: c7e2f4a6b8d0
Create Date: 2026-09-09 00:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e1a2b3c4d5f6'
down_revision = 'c7e2f4a6b8d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificacaotipo ADD VALUE IF NOT EXISTS 'SOLICITACAO_SENHA'")
        op.execute("ALTER TYPE notificacaotipo ADD VALUE IF NOT EXISTS 'SOLICITACAO_PROFESSOR'")


def downgrade() -> None:
    # Postgres não suporta remover um valor de enum diretamente; como o valor
    # sozinho é inofensivo, o downgrade é um no-op.
    pass
