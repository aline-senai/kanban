import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.atividade import Atividade, AtividadeResponsavel
from app.models.estagio import Estagio
from app.models.grupo import Grupo, GrupoMembro
from app.models.user import User, UserRole
from app.schemas.atividade import AtividadeCreate, AtividadeOut, AtividadeUpdate

router = APIRouter(tags=["atividades"])


def _get_grupo_or_404(grupo_id: uuid.UUID, db: Session) -> Grupo:
    grupo = db.get(Grupo, grupo_id)
    if grupo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo não encontrado")
    return grupo


def _can_manage_grupo(grupo: Grupo, user: User, db: Session) -> bool:
    if user.role == UserRole.PROFESSOR and grupo.turma.professor_id == user.id:
        return True
    return (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo.id, GrupoMembro.user_id == user.id, GrupoMembro.is_gestor.is_(True))
        .first()
        is not None
    )


def _is_member_or_manager(grupo: Grupo, user: User, db: Session) -> bool:
    if _can_manage_grupo(grupo, user, db):
        return True
    return (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo.id, GrupoMembro.user_id == user.id)
        .first()
        is not None
    )


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
    if not _is_member_or_manager(grupo, current_user, db):
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
    if not _can_manage_grupo(grupo, current_user, db):
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
    if not _can_manage_grupo(atividade.grupo, current_user, db):
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
