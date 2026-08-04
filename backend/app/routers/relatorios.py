import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_professor
from app.models.atividade import Atividade
from app.models.estagio import Estagio
from app.models.grupo import Grupo
from app.models.user import User
from app.routers.turmas import get_owned_turma
from app.schemas.relatorio import AtividadeAtrasadaOut, ConclusaoGrupoOut

router = APIRouter(prefix="/turmas/{turma_id}/relatorio", tags=["relatorios"])


def _max_ordem(db: Session, turma_id: uuid.UUID) -> int | None:
    resultado = (
        db.query(Estagio.ordem).filter(Estagio.turma_id == turma_id).order_by(Estagio.ordem.desc()).first()
    )
    return resultado[0] if resultado else None


@router.get("/conclusao", response_model=list[ConclusaoGrupoOut])
def relatorio_conclusao(
    turma_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    """RF31: % de atividades concluídas (no estágio final) por grupo da turma."""
    get_owned_turma(turma_id, current_user, db)
    max_ordem = _max_ordem(db, turma_id)

    grupos = db.query(Grupo).filter(Grupo.turma_id == turma_id).order_by(Grupo.nome).all()
    resultado = []
    for grupo in grupos:
        atividades = db.query(Atividade).filter(Atividade.grupo_id == grupo.id).all()
        total = len(atividades)
        concluidas = sum(1 for a in atividades if max_ordem is not None and a.estagio.ordem == max_ordem)
        percentual = round((concluidas / total) * 100, 1) if total > 0 else 0.0
        resultado.append(
            ConclusaoGrupoOut(
                grupo_id=grupo.id,
                grupo_nome=grupo.nome,
                total_atividades=total,
                concluidas=concluidas,
                percentual=percentual,
            )
        )
    return resultado


def _atividades_atrasadas(db: Session, turma_id: uuid.UUID) -> list[Atividade]:
    max_ordem = _max_ordem(db, turma_id)
    agora = datetime.now(timezone.utc)

    atividades = (
        db.query(Atividade)
        .join(Grupo, Atividade.grupo_id == Grupo.id)
        .filter(Grupo.turma_id == turma_id, Atividade.data_fim.isnot(None), Atividade.data_fim < agora)
        .all()
    )
    return [a for a in atividades if max_ordem is None or a.estagio.ordem != max_ordem]


@router.get("/atrasadas", response_model=list[AtividadeAtrasadaOut])
def relatorio_atrasadas(
    turma_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    """RF32: atividades atrasadas por grupo da turma."""
    get_owned_turma(turma_id, current_user, db)
    atividades = _atividades_atrasadas(db, turma_id)
    return [
        AtividadeAtrasadaOut(
            atividade_id=a.id,
            nome=a.nome,
            grupo_id=a.grupo_id,
            grupo_nome=a.grupo.nome,
            estagio_nome=a.estagio.nome,
            data_fim=a.data_fim,
            responsaveis=[r.user.name for r in a.responsaveis],
        )
        for a in atividades
    ]


@router.get("/atrasadas.csv")
def relatorio_atrasadas_csv(
    turma_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    """RF33: exportação em CSV (compatível com Excel) das atividades atrasadas."""
    turma = get_owned_turma(turma_id, current_user, db)
    atividades = _atividades_atrasadas(db, turma_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["Grupo", "Atividade", "Estágio", "Prazo", "Responsáveis"])
    for a in atividades:
        writer.writerow(
            [
                a.grupo.nome,
                a.nome,
                a.estagio.nome,
                a.data_fim.strftime("%d/%m/%Y"),
                ", ".join(r.user.name for r in a.responsaveis),
            ]
        )
    buffer.seek(0)

    nome_arquivo = f"atrasadas_{turma.nome}.csv".replace(" ", "_")
    bom = "﻿"  # garante que o Excel reconheça o CSV como UTF-8
    return StreamingResponse(
        iter([bom + buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )
