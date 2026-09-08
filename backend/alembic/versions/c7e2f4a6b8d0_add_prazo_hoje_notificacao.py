"""adiciona tipo prazo_hoje ao enum de notificacoes

Revision ID: c7e2f4a6b8d0
Revises: b3c6d8e0f1a2
Create Date: 2026-09-08 14:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c7e2f4a6b8d0'
down_revision = 'b3c6d8e0f1a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificacaotipo ADD VALUE IF NOT EXISTS 'PRAZO_HOJE'")


def downgrade() -> None:
    # Postgres não suporta remover um valor de enum diretamente; como o valor
    # sozinho é inofensivo, o downgrade é um no-op (rows com PRAZO_HOJE, se
    # existirem, ficariam órfãs de uma migração futura que reconstrua o enum).
    pass
