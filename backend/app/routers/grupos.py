import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_professor
from app.models.atividade import Atividade
from app.models.grupo import Grupo, GrupoMembro
from app.models.turma import Turma
from app.models.user import User, UserRole
from app.routers.turmas import get_owned_turma
from app.schemas.grupo import GrupoCreate, GrupoMembroCreate, GrupoMembroUpdate, GrupoOut, GrupoUpdate

router = APIRouter(tags=["grupos"])


def _get_owned_grupo(grupo_id: uuid.UUID, current_user: User, db: Session) -> Grupo:
    grupo = db.get(Grupo, grupo_id)
    if grupo is None or grupo.turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo não encontrado")
    return grupo


@router.get("/turmas/{turma_id}/grupos", response_model=list[GrupoOut])
def list_grupos(
    turma_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """RF25: professor vê todos os grupos da turma. RF26: gestor/integrante só o próprio grupo."""
    turma = db.get(Turma, turma_id)
    if turma is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")

    if current_user.role == UserRole.PROFESSOR and turma.professor_id == current_user.id:
        return db.query(Grupo).filter(Grupo.turma_id == turma_id).order_by(Grupo.nome).all()

    grupos = (
        db.query(Grupo)
        .join(GrupoMembro, GrupoMembro.grupo_id == Grupo.id)
        .filter(Grupo.turma_id == turma_id, GrupoMembro.user_id == current_user.id)
        .distinct()
        .order_by(Grupo.nome)
        .all()
    )
    if not grupos:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta turma")
    return grupos


@router.post("/turmas/{turma_id}/grupos", response_model=GrupoOut, status_code=status.HTTP_201_CREATED)
def create_grupo(
    turma_id: uuid.UUID,
    payload: GrupoCreate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    get_owned_turma(turma_id, current_user, db)
    grupo = Grupo(turma_id=turma_id, nome=payload.nome, descricao=payload.descricao)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.patch("/grupos/{grupo_id}", response_model=GrupoOut)
def update_grupo(
    grupo_id: uuid.UUID,
    payload: GrupoUpdate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    grupo = _get_owned_grupo(grupo_id, current_user, db)
    if payload.nome is not None:
        grupo.nome = payload.nome
    if payload.descricao is not None:
        grupo.descricao = payload.descricao
    db.commit()
    db.refresh(grupo)
    return grupo


@router.delete("/grupos/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grupo(
    grupo_id: uuid.UUID,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    grupo = _get_owned_grupo(grupo_id, current_user, db)
    if len(grupo.membros) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível remover um grupo sem integrantes",
        )
    tem_atividades = db.query(Atividade).filter(Atividade.grupo_id == grupo_id).first() is not None
    if tem_atividades:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível remover um grupo sem atividades",
        )
    db.delete(grupo)
    db.commit()


@router.post(
    "/grupos/{grupo_id}/membros", response_model=GrupoOut, status_code=status.HTTP_201_CREATED
)
def add_membro(
    grupo_id: uuid.UUID,
    payload: GrupoMembroCreate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    grupo = _get_owned_grupo(grupo_id, current_user, db)

    user = db.get(User, payload.user_id)
    if user is None or user.role != UserRole.ALUNO:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aluno inválido")

    ja_em_outro_grupo = (
        db.query(GrupoMembro)
        .join(Grupo, GrupoMembro.grupo_id == Grupo.id)
        .filter(Grupo.turma_id == grupo.turma_id, GrupoMembro.user_id == payload.user_id)
        .first()
    )
    if ja_em_outro_grupo is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integrante já pertence a um grupo desta turma",
        )

    membro = GrupoMembro(grupo_id=grupo_id, user_id=payload.user_id, is_gestor=payload.is_gestor)
    db.add(membro)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.patch("/grupos/{grupo_id}/membros/{user_id}", response_model=GrupoOut)
def update_membro(
    grupo_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: GrupoMembroUpdate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    grupo = _get_owned_grupo(grupo_id, current_user, db)
    membro = (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo_id, GrupoMembro.user_id == user_id)
        .first()
    )
    if membro is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integrante não encontrado no grupo")

    membro.is_gestor = payload.is_gestor
    db.commit()
    db.refresh(grupo)
    return grupo


@router.delete("/grupos/{grupo_id}/membros/{user_id}", response_model=GrupoOut)
def remove_membro(
    grupo_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    grupo = _get_owned_grupo(grupo_id, current_user, db)
    membro = (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo_id, GrupoMembro.user_id == user_id)
        .first()
    )
    if membro is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integrante não encontrado no grupo")

    db.delete(membro)
    db.commit()
    db.refresh(grupo)
    return grupo
