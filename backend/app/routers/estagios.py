import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_professor
from app.models.estagio import Estagio
from app.models.user import User
from app.routers.turmas import get_owned_turma
from app.schemas.estagio import (
    DuplicarEstagiosRequest,
    EstagioCreate,
    EstagioOut,
    EstagioUpdate,
    ReorderRequest,
)

router = APIRouter(tags=["estagios"])


def _get_owned_estagio(estagio_id: uuid.UUID, current_user: User, db: Session) -> Estagio:
    estagio = db.get(Estagio, estagio_id)
    if estagio is None or estagio.turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estágio não encontrado")
    return estagio


@router.get("/turmas/{turma_id}/estagios", response_model=list[EstagioOut])
def list_estagios(
    turma_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    get_owned_turma(turma_id, current_user, db)
    return db.query(Estagio).filter(Estagio.turma_id == turma_id).order_by(Estagio.ordem).all()


@router.post("/turmas/{turma_id}/estagios", response_model=EstagioOut, status_code=status.HTTP_201_CREATED)
def create_estagio(
    turma_id: uuid.UUID,
    payload: EstagioCreate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    get_owned_turma(turma_id, current_user, db)
    proxima_ordem = db.query(Estagio).filter(Estagio.turma_id == turma_id).count()
    estagio = Estagio(
        turma_id=turma_id,
        nome=payload.nome,
        cor=payload.cor,
        is_conclusao=payload.is_conclusao,
        ordem=proxima_ordem,
    )
    db.add(estagio)
    db.commit()
    db.refresh(estagio)
    return estagio


@router.patch("/estagios/{estagio_id}", response_model=EstagioOut)
def update_estagio(
    estagio_id: uuid.UUID,
    payload: EstagioUpdate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    estagio = _get_owned_estagio(estagio_id, current_user, db)
    if payload.nome is not None:
        estagio.nome = payload.nome
    if payload.cor is not None:
        estagio.cor = payload.cor
    if payload.is_conclusao is not None:
        estagio.is_conclusao = payload.is_conclusao
    db.commit()
    db.refresh(estagio)
    return estagio


@router.delete("/estagios/{estagio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_estagio(
    estagio_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    estagio = _get_owned_estagio(estagio_id, current_user, db)
    db.delete(estagio)
    db.commit()


@router.patch("/turmas/{turma_id}/estagios/reorder", response_model=list[EstagioOut])
def reorder_estagios(
    turma_id: uuid.UUID,
    payload: ReorderRequest,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    get_owned_turma(turma_id, current_user, db)
    estagios = db.query(Estagio).filter(Estagio.turma_id == turma_id).all()
    estagios_by_id = {e.id: e for e in estagios}

    if set(payload.estagio_ids) != set(estagios_by_id.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lista deve conter exatamente todos os estágios da turma",
        )

    for ordem, estagio_id in enumerate(payload.estagio_ids):
        estagios_by_id[estagio_id].ordem = ordem

    db.commit()
    return db.query(Estagio).filter(Estagio.turma_id == turma_id).order_by(Estagio.ordem).all()


@router.post("/turmas/{turma_id}/estagios/duplicar", response_model=list[EstagioOut])
def duplicar_estagios(
    turma_id: uuid.UUID,
    payload: DuplicarEstagiosRequest,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    destino = get_owned_turma(turma_id, current_user, db)
    origem = get_owned_turma(payload.origem_turma_id, current_user, db)

    if db.query(Estagio).filter(Estagio.turma_id == destino.id).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A turma de destino já possui estágios",
        )

    estagios_origem = (
        db.query(Estagio).filter(Estagio.turma_id == origem.id).order_by(Estagio.ordem).all()
    )
    novos = [
        Estagio(
            turma_id=destino.id,
            nome=e.nome,
            ordem=e.ordem,
            cor=e.cor,
            is_conclusao=e.is_conclusao,
        )
        for e in estagios_origem
    ]
    db.add_all(novos)
    db.commit()
    return db.query(Estagio).filter(Estagio.turma_id == destino.id).order_by(Estagio.ordem).all()
