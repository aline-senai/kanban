"""redesign: numero/prioridade/estimativa, descricao, cronograma, notif prefs

Revision ID: 9f3a2c7d1b44
Revises: 54a76494d2fd
Create Date: 2026-08-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f3a2c7d1b44'
down_revision = '54a76494d2fd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # atividades: numero (sequencial por turma), prioridade, estimativa_horas
    op.add_column('atividades', sa.Column('numero', sa.Integer(), nullable=True))

    prioridade_enum = sa.Enum('BAIXA', 'MEDIA', 'ALTA', name='prioridade')
    prioridade_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'atividades',
        sa.Column('prioridade', prioridade_enum, nullable=False, server_default='MEDIA'),
    )
    op.add_column('atividades', sa.Column('estimativa_horas', sa.Integer(), nullable=True))

    # backfill numero por turma, respeitando a ordem de criação já existente
    op.execute(
        """
        WITH numerados AS (
            SELECT a.id,
                   ROW_NUMBER() OVER (PARTITION BY g.turma_id ORDER BY a.data_criacao) AS rn
            FROM atividades a
            JOIN grupos g ON g.id = a.grupo_id
        )
        UPDATE atividades
        SET numero = numerados.rn
        FROM numerados
        WHERE atividades.id = numerados.id
        """
    )
    op.alter_column('atividades', 'numero', nullable=False)

    # grupos: descricao
    op.add_column('grupos', sa.Column('descricao', sa.String(), nullable=True))

    # turmas: campos de cronograma
    op.add_column('turmas', sa.Column('cronograma_inicio', sa.Date(), nullable=True))
    op.add_column(
        'turmas',
        sa.Column('duracao_sprint_semanas', sa.Integer(), nullable=False, server_default='2'),
    )
    op.add_column('turmas', sa.Column('total_sprints', sa.Integer(), nullable=False, server_default='8'))
    op.add_column('turmas', sa.Column('sprint_atual', sa.Integer(), nullable=False, server_default='1'))

    # users: preferências de notificação
    op.add_column(
        'users', sa.Column('notif_atribuicao', sa.Boolean(), nullable=False, server_default=sa.true())
    )
    op.add_column('users', sa.Column('notif_prazo', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(
        'users', sa.Column('notif_comentario', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    op.drop_column('users', 'notif_comentario')
    op.drop_column('users', 'notif_prazo')
    op.drop_column('users', 'notif_atribuicao')

    op.drop_column('turmas', 'sprint_atual')
    op.drop_column('turmas', 'total_sprints')
    op.drop_column('turmas', 'duracao_sprint_semanas')
    op.drop_column('turmas', 'cronograma_inicio')

    op.drop_column('grupos', 'descricao')

    op.drop_column('atividades', 'estimativa_horas')
    op.drop_column('atividades', 'prioridade')
    op.drop_column('atividades', 'numero')
    op.execute('DROP TYPE IF EXISTS prioridade')
