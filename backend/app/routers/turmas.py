import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_professor
from app.models.turma import Turma
from app.models.user import User
from app.schemas.turma import TurmaCreate, TurmaOut, TurmaUpdate

router = APIRouter(prefix="/turmas", tags=["turmas"])


@router.get("", response_model=list[TurmaOut])
def list_turmas(current_user: User = Depends(require_professor), db: Session = Depends(get_db)):
    return db.query(Turma).filter(Turma.professor_id == current_user.id).order_by(Turma.created_at.desc()).all()


@router.post("", response_model=TurmaOut, status_code=status.HTTP_201_CREATED)
def create_turma(payload: TurmaCreate, current_user: User = Depends(require_professor), db: Session = Depends(get_db)):
    turma = Turma(nome=payload.nome, professor_id=current_user.id)
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


def get_owned_turma(turma_id: uuid.UUID, current_user: User, db: Session) -> Turma:
    turma = db.get(Turma, turma_id)
    if turma is None or turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")
    return turma


@router.patch("/{turma_id}", response_model=TurmaOut)
def update_turma(
    turma_id: uuid.UUID,
    payload: TurmaUpdate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    turma = get_owned_turma(turma_id, current_user, db)
    if payload.nome is not None:
        turma.nome = payload.nome
    if payload.arquivada is not None:
        turma.arquivada = payload.arquivada
    db.commit()
    db.refresh(turma)
    return turma
