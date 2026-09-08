"""backfill grupo_id em plannings/reviews órfãos (criados antes do split por equipe)

Revision ID: b3c6d8e0f1a2
Revises: d91a4c7f6b23
Create Date: 2026-09-08 10:00:00.000000

A migração d91a4c7f6b23 adicionou grupo_id (nullable) a sprint_plannings/sprint_reviews,
mas não migrou os registros já existentes, que ficaram com grupo_id NULL. Como a API
filtra plannings/reviews pelo conjunto de equipes visíveis ao usuário (nunca contendo
NULL), esses registros antigos ficaram invisíveis para todo mundo, inclusive o
professor. Esta migração distribui cada registro órfão para as equipes da turma:
a primeira equipe "herda" a linha existente e as demais recebem uma cópia, preservando
o conteúdo que existia antes do planning/review passar a ser por equipe.
"""
import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b3c6d8e0f1a2'
down_revision = 'd91a4c7f6b23'
branch_labels = None
depends_on = None


def _backfill(table_name: str) -> None:
    conn = op.get_bind()
    metadata = sa.MetaData()
    tabela = sa.Table(table_name, metadata, autoload_with=conn)
    sprints = sa.Table("sprints", metadata, autoload_with=conn)
    grupos = sa.Table("grupos", metadata, autoload_with=conn)

    orfaos = conn.execute(
        sa.select(tabela).where(tabela.c.grupo_id.is_(None))
    ).fetchall()

    for orfao in orfaos:
        turma_id = conn.execute(
            sa.select(sprints.c.turma_id).where(sprints.c.id == orfao.sprint_id)
        ).scalar()
        grupo_ids = [
            row[0]
            for row in conn.execute(
                sa.select(grupos.c.id).where(grupos.c.turma_id == turma_id).order_by(grupos.c.nome)
            ).fetchall()
        ]

        if not grupo_ids:
            conn.execute(sa.delete(tabela).where(tabela.c.id == orfao.id))
            continue

        conn.execute(
            sa.update(tabela).where(tabela.c.id == orfao.id).values(grupo_id=grupo_ids[0])
        )
        for grupo_id in grupo_ids[1:]:
            conn.execute(
                sa.insert(tabela).values(
                    id=uuid.uuid4(),
                    sprint_id=orfao.sprint_id,
                    grupo_id=grupo_id,
                    data=orfao.data,
                    texto=orfao.texto,
                    criado_por_id=orfao.criado_por_id,
                    created_at=orfao.created_at,
                    updated_at=orfao.updated_at,
                )
            )


def upgrade() -> None:
    _backfill("sprint_plannings")
    _backfill("sprint_reviews")

    op.alter_column('sprint_plannings', 'grupo_id', nullable=False)
    op.alter_column('sprint_reviews', 'grupo_id', nullable=False)


def downgrade() -> None:
    op.alter_column('sprint_plannings', 'grupo_id', nullable=True)
    op.alter_column('sprint_reviews', 'grupo_id', nullable=True)
    # Os registros duplicados/reatribuídos pelo upgrade não são desfeitos:
    # não há como distinguir com segurança quais linhas eram cópias.
