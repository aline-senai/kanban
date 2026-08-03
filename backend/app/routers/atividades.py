import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import can_manage_grupo, is_member_or_manager
from app.models.atividade import Atividade, AtividadeHistorico, AtividadeResponsavel
from app.models.estagio import Estagio
from app.models.grupo import Grupo, GrupoMembro
from app.models.user import User
from app.schemas.atividade import (
    AtividadeCreate,
    AtividadeOut,
    AtividadeUpdate,
    HistoricoEntryOut,
    MoverAtividadeRequest,
)

router = APIRouter(tags=["atividades"])


def _get_grupo_or_404(grupo_id: uuid.UUID, db: Session) -> Grupo:
    grupo = db.get(Grupo, grupo_id)
    if grupo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo não encontrado")
    return grupo


def _validate_responsaveis(grupo_id: uuid.UUID, responsavel_ids: list[uuid.UUID], db: Session):
    if not responsavel_ids:
        return
    membros_validos = {
        m.user_id
        for m in db.query(GrupoMembro).filter(GrupoMembro.grupo_id == grupo_id).all()
    }
    invalidos = set(responsavel_ids) - membros_validos
    if invalidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Responsável deve ser integrante do grupo",
        )


@router.get("/grupos/{grupo_id}/atividades", response_model=list[AtividadeOut])
def list_atividades(
    grupo_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    grupo = _get_grupo_or_404(grupo_id, db)
    if not is_member_or_manager(grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a este grupo")
    return db.query(Atividade).filter(Atividade.grupo_id == grupo_id).order_by(Atividade.data_criacao).all()


@router.post("/grupos/{grupo_id}/atividades", response_model=AtividadeOut, status_code=status.HTTP_201_CREATED)
def create_atividade(
    grupo_id: uuid.UUID,
    payload: AtividadeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grupo = _get_grupo_or_404(grupo_id, db)
    if not can_manage_grupo(grupo, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Apenas professor ou gestor podem criar atividades"
        )

    estagio = db.get(Estagio, payload.estagio_id)
    if estagio is None or estagio.turma_id != grupo.turma_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estágio inválido para esta turma")

    _validate_responsaveis(grupo_id, payload.responsavel_ids, db)

    atividade = Atividade(
        grupo_id=grupo_id,
        estagio_id=payload.estagio_id,
        criador_id=current_user.id,
        nome=payload.nome,
        texto=payload.texto,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
    )
    db.add(atividade)
    db.flush()

    for user_id in payload.responsavel_ids:
        db.add(AtividadeResponsavel(atividade_id=atividade.id, user_id=user_id))

    db.commit()
    db.refresh(atividade)
    return atividade


def _get_manageable_atividade(atividade_id: uuid.UUID, current_user: User, db: Session) -> Atividade:
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
    if not can_manage_grupo(atividade.grupo, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Apenas professor ou gestor podem editar esta atividade"
        )
    return atividade


@router.patch("/atividades/{atividade_id}", response_model=AtividadeOut)
def update_atividade(
    atividade_id: uuid.UUID,
    payload: AtividadeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = _get_manageable_atividade(atividade_id, current_user, db)

    if payload.nome is not None:
        atividade.nome = payload.nome
    if payload.texto is not None:
        atividade.texto = payload.texto
    if payload.data_inicio is not None:
        atividade.data_inicio = payload.data_inicio
    if payload.data_fim is not None:
        atividade.data_fim = payload.data_fim

    if payload.responsavel_ids is not None:
        _validate_responsaveis(atividade.grupo_id, payload.responsavel_ids, db)
        db.query(AtividadeResponsavel).filter(AtividadeResponsavel.atividade_id == atividade.id).delete()
        for user_id in payload.responsavel_ids:
            db.add(AtividadeResponsavel(atividade_id=atividade.id, user_id=user_id))

    db.commit()
    db.refresh(atividade)
    return atividade


def _can_move_atividade(atividade: Atividade, user: User, db: Session) -> bool:
    if can_manage_grupo(atividade.grupo, user, db):
        return True

    is_responsavel = (
        db.query(AtividadeResponsavel)
        .filter(AtividadeResponsavel.atividade_id == atividade.id, AtividadeResponsavel.user_id == user.id)
        .first()
        is not None
    )
    if not is_responsavel:
        return False

    # RF19a: uma vez no estágio de aprovação, só professor/gestor avançam o card.
    if atividade.estagio.is_conclusao:
        return False
    return True


@router.patch("/atividades/{atividade_id}/mover", response_model=AtividadeOut)
def mover_atividade(
    atividade_id: uuid.UUID,
    payload: MoverAtividadeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")

    if not _can_move_atividade(atividade, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para mover esta atividade para o estágio informado",
        )

    novo_estagio = db.get(Estagio, payload.estagio_id)
    if novo_estagio is None or novo_estagio.turma_id != atividade.grupo.turma_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estágio inválido para esta turma")

    if novo_estagio.id == atividade.estagio_id:
        return atividade

    db.add(
        AtividadeHistorico(
            atividade_id=atividade.id,
            user_id=current_user.id,
            estagio_de_id=atividade.estagio_id,
            estagio_para_id=novo_estagio.id,
        )
    )
    atividade.estagio_id = novo_estagio.id
    atividade.data_inicio_estagio = datetime.now(timezone.utc)

    db.commit()
    db.refresh(atividade)
    return atividade


@router.get("/atividades/{atividade_id}/historico", response_model=list[HistoricoEntryOut])
def historico_atividade(
    atividade_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta atividade")

    entradas = (
        db.query(AtividadeHistorico)
        .filter(AtividadeHistorico.atividade_id == atividade_id)
        .order_by(AtividadeHistorico.created_at)
        .all()
    )

    agora = datetime.now(timezone.utc)
    resultado = []
    for i, entrada in enumerate(entradas):
        fim = entradas[i + 1].created_at if i + 1 < len(entradas) else agora
        resultado.append(
            HistoricoEntryOut(
                id=entrada.id,
                estagio_de_id=entrada.estagio_de_id,
                estagio_de_nome=entrada.estagio_de.nome if entrada.estagio_de else None,
                estagio_para_id=entrada.estagio_para_id,
                estagio_para_nome=entrada.estagio_para.nome,
                user_id=entrada.user_id,
                user_name=entrada.user.name,
                created_at=entrada.created_at,
                duracao_segundos=int((fim - entrada.created_at).total_seconds()),
            )
        )
    return resultado
