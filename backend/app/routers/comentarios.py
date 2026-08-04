import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import is_member_or_manager
from app.models.atividade import Atividade
from app.models.comentario import Comentario
from app.models.user import User
from app.schemas.comentario import ComentarioCreate, ComentarioOut
from app.services.notificacoes import notificar_comentario

router = APIRouter(tags=["comentarios"])


def _get_atividade_or_404(atividade_id: uuid.UUID, db: Session) -> Atividade:
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
    return atividade


@router.get("/atividades/{atividade_id}/comentarios", response_model=list[ComentarioOut])
def list_comentarios(
    atividade_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta atividade")
    return (
        db.query(Comentario)
        .filter(Comentario.atividade_id == atividade_id)
        .order_by(Comentario.created_at)
        .all()
    )


@router.post(
    "/atividades/{atividade_id}/comentarios", response_model=ComentarioOut, status_code=status.HTTP_201_CREATED
)
def create_comentario(
    atividade_id: uuid.UUID,
    payload: ComentarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta atividade")

    if not payload.texto.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comentário não pode ser vazio")

    texto = payload.texto.strip()
    comentario = Comentario(atividade_id=atividade_id, autor_id=current_user.id, texto=texto)
    db.add(comentario)

    notificar_comentario(db, atividade, current_user, texto)

    db.commit()
    db.refresh(comentario)
    return comentario
