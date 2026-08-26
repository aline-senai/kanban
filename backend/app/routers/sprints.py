import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_professor
from app.core.permissions import has_turma_access, is_professor_ou_gestor_da_turma
from app.models.atividade import Atividade
from app.models.sprint import Sprint, SprintPlanning, SprintReview
from app.models.turma import Turma
from app.models.user import User
from app.routers.turmas import get_owned_turma
from app.schemas.sprint import (
    PlanningCreate,
    PlanningOut,
    PlanningUpdate,
    ReviewCreate,
    ReviewOut,
    ReviewUpdate,
    SprintCreate,
    SprintOut,
    SprintUpdate,
)

router = APIRouter(tags=["sprints"])


def _get_turma_or_404(turma_id: uuid.UUID, db: Session) -> Turma:
    turma = db.get(Turma, turma_id)
    if turma is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")
    return turma


def _get_sprint_para_gerenciar(sprint_id: uuid.UUID, current_user: User, db: Session) -> Sprint:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint não encontrada")
    if not is_professor_ou_gestor_da_turma(sprint.turma, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Apenas professor ou gestor podem gerenciar a sprint"
        )
    return sprint


@router.get("/turmas/{turma_id}/sprints", response_model=list[SprintOut])
def list_sprints(
    turma_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    turma = _get_turma_or_404(turma_id, db)
    if not has_turma_access(turma, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta turma")
    return db.query(Sprint).filter(Sprint.turma_id == turma_id).order_by(Sprint.ordem).all()


@router.post("/turmas/{turma_id}/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
def create_sprint(
    turma_id: uuid.UUID,
    payload: SprintCreate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    get_owned_turma(turma_id, current_user, db)
    proxima_ordem = db.query(Sprint).filter(Sprint.turma_id == turma_id).count()
    sprint = Sprint(turma_id=turma_id, nome=payload.nome, ordem=proxima_ordem)
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def _get_sprint_do_professor(sprint_id: uuid.UUID, current_user: User, db: Session) -> Sprint:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None or sprint.turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint não encontrada")
    return sprint


@router.patch("/sprints/{sprint_id}", response_model=SprintOut)
def update_sprint(
    sprint_id: uuid.UUID,
    payload: SprintUpdate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    sprint = _get_sprint_do_professor(sprint_id, current_user, db)
    if payload.nome is not None:
        sprint.nome = payload.nome
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(
    sprint_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    sprint = _get_sprint_do_professor(sprint_id, current_user, db)
    db.query(Atividade).filter(Atividade.sprint_id == sprint_id).update({"sprint_id": None})
    db.delete(sprint)
    db.commit()


@router.post("/sprints/{sprint_id}/planning", response_model=PlanningOut, status_code=status.HTTP_201_CREATED)
def create_planning(
    sprint_id: uuid.UUID,
    payload: PlanningCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.planning is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta sprint já tem uma planning")

    planning = SprintPlanning(
        sprint_id=sprint_id, data=payload.data, texto=payload.texto, criado_por_id=current_user.id
    )
    db.add(planning)
    db.commit()
    db.refresh(planning)
    return planning


@router.patch("/sprints/{sprint_id}/planning", response_model=PlanningOut)
def update_planning(
    sprint_id: uuid.UUID,
    payload: PlanningUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.planning is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta sprint ainda não tem planning")

    if payload.data is not None:
        sprint.planning.data = payload.data
    if payload.texto is not None:
        sprint.planning.texto = payload.texto
    db.commit()
    db.refresh(sprint.planning)
    return sprint.planning


@router.delete("/sprints/{sprint_id}/planning", status_code=status.HTTP_204_NO_CONTENT)
def delete_planning(
    sprint_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.planning is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta sprint ainda não tem planning")
    db.delete(sprint.planning)
    db.commit()


@router.post("/sprints/{sprint_id}/review", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    sprint_id: uuid.UUID,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.review is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta sprint já tem uma review")

    review = SprintReview(
        sprint_id=sprint_id, data=payload.data, texto=payload.texto, criado_por_id=current_user.id
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.patch("/sprints/{sprint_id}/review", response_model=ReviewOut)
def update_review(
    sprint_id: uuid.UUID,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta sprint ainda não tem review")

    if payload.data is not None:
        sprint.review.data = payload.data
    if payload.texto is not None:
        sprint.review.texto = payload.texto
    db.commit()
    db.refresh(sprint.review)
    return sprint.review


@router.delete("/sprints/{sprint_id}/review", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    sprint_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    sprint = _get_sprint_para_gerenciar(sprint_id, current_user, db)
    if sprint.review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta sprint ainda não tem review")
    db.delete(sprint.review)
    db.commit()
