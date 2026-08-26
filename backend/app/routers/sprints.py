import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_professor
from app.core.permissions import can_manage_grupo, has_turma_access
from app.models.atividade import Atividade
from app.models.grupo import Grupo, GrupoMembro
from app.models.sprint import Sprint, SprintPlanning, SprintReview
from app.models.turma import Turma
from app.models.user import User, UserRole
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
    SprintReorderRequest,
    SprintUpdate,
)

router = APIRouter(tags=["sprints"])


def _get_turma_or_404(turma_id: uuid.UUID, db: Session) -> Turma:
    turma = db.get(Turma, turma_id)
    if turma is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")
    return turma


def _grupo_ids_acessiveis(turma: Turma, user: User, db: Session) -> set[uuid.UUID]:
    """Professor dono vê o planning/review de todas as equipes da turma; os demais só o
    da própria equipe (RF25/RF26 aplicado também a Planning/Review)."""
    if user.role == UserRole.PROFESSOR and turma.professor_id == user.id:
        return {g.id for g in db.query(Grupo).filter(Grupo.turma_id == turma.id).all()}
    return {
        gm.grupo_id
        for gm in db.query(GrupoMembro)
        .join(Grupo, GrupoMembro.grupo_id == Grupo.id)
        .filter(Grupo.turma_id == turma.id, GrupoMembro.user_id == user.id)
        .all()
    }


def _sprint_out(sprint: Sprint, grupo_ids_visiveis: set[uuid.UUID]) -> SprintOut:
    return SprintOut(
        id=sprint.id,
        turma_id=sprint.turma_id,
        nome=sprint.nome,
        ordem=sprint.ordem,
        data_inicio=sprint.data_inicio,
        data_fim=sprint.data_fim,
        created_at=sprint.created_at,
        plannings=[p for p in sprint.plannings if p.grupo_id in grupo_ids_visiveis],
        reviews=[r for r in sprint.reviews if r.grupo_id in grupo_ids_visiveis],
    )


@router.get("/turmas/{turma_id}/sprints", response_model=list[SprintOut])
def list_sprints(
    turma_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    turma = _get_turma_or_404(turma_id, db)
    if not has_turma_access(turma, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta turma")
    grupo_ids_visiveis = _grupo_ids_acessiveis(turma, current_user, db)
    sprints = db.query(Sprint).filter(Sprint.turma_id == turma_id).order_by(Sprint.ordem).all()
    return [_sprint_out(s, grupo_ids_visiveis) for s in sprints]


def _validar_periodo(data_inicio, data_fim):
    if data_inicio is not None and data_fim is not None and data_fim < data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Data final não pode ser anterior à data inicial"
        )


@router.post("/turmas/{turma_id}/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
def create_sprint(
    turma_id: uuid.UUID,
    payload: SprintCreate,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    turma = get_owned_turma(turma_id, current_user, db)
    _validar_periodo(payload.data_inicio, payload.data_fim)
    proxima_ordem = db.query(Sprint).filter(Sprint.turma_id == turma_id).count()
    sprint = Sprint(
        turma_id=turma_id,
        nome=payload.nome,
        ordem=proxima_ordem,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return _sprint_out(sprint, _grupo_ids_acessiveis(turma, current_user, db))


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

    novo_inicio = payload.data_inicio if "data_inicio" in payload.model_fields_set else sprint.data_inicio
    novo_fim = payload.data_fim if "data_fim" in payload.model_fields_set else sprint.data_fim
    _validar_periodo(novo_inicio, novo_fim)
    if "data_inicio" in payload.model_fields_set:
        sprint.data_inicio = payload.data_inicio
    if "data_fim" in payload.model_fields_set:
        sprint.data_fim = payload.data_fim

    db.commit()
    db.refresh(sprint)
    return _sprint_out(sprint, _grupo_ids_acessiveis(sprint.turma, current_user, db))


@router.delete("/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(
    sprint_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    sprint = _get_sprint_do_professor(sprint_id, current_user, db)
    db.query(Atividade).filter(Atividade.sprint_id == sprint_id).update({"sprint_id": None})
    db.delete(sprint)
    db.commit()


@router.patch("/turmas/{turma_id}/sprints/reorder", response_model=list[SprintOut])
def reorder_sprints(
    turma_id: uuid.UUID,
    payload: SprintReorderRequest,
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    turma = get_owned_turma(turma_id, current_user, db)
    sprints = db.query(Sprint).filter(Sprint.turma_id == turma_id).all()
    sprints_by_id = {s.id: s for s in sprints}

    if set(payload.sprint_ids) != set(sprints_by_id.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lista deve conter exatamente todas as sprints da turma",
        )

    for ordem, sprint_id in enumerate(payload.sprint_ids):
        sprints_by_id[sprint_id].ordem = ordem

    db.commit()
    grupo_ids_visiveis = _grupo_ids_acessiveis(turma, current_user, db)
    sprints = db.query(Sprint).filter(Sprint.turma_id == turma_id).order_by(Sprint.ordem).all()
    return [_sprint_out(s, grupo_ids_visiveis) for s in sprints]


def _get_sprint_e_grupo_para_gerenciar(
    sprint_id: uuid.UUID, grupo_id: uuid.UUID, current_user: User, db: Session
) -> tuple[Sprint, Grupo]:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint não encontrada")
    grupo = db.get(Grupo, grupo_id)
    if grupo is None or grupo.turma_id != sprint.turma_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Equipe inválida para esta sprint")
    if not can_manage_grupo(grupo, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas professor ou gestor desta equipe podem gerenciar o planning/review",
        )
    return sprint, grupo


@router.post("/sprints/{sprint_id}/planning", response_model=PlanningOut, status_code=status.HTTP_201_CREATED)
def create_planning(
    sprint_id: uuid.UUID,
    payload: PlanningCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, payload.grupo_id, current_user, db)
    ja_existe = (
        db.query(SprintPlanning)
        .filter(SprintPlanning.sprint_id == sprint_id, SprintPlanning.grupo_id == grupo.id)
        .first()
    )
    if ja_existe is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Esta equipe já tem uma planning nesta sprint"
        )

    planning = SprintPlanning(
        sprint_id=sprint_id, grupo_id=grupo.id, data=payload.data, texto=payload.texto, criado_por_id=current_user.id
    )
    db.add(planning)
    db.commit()
    db.refresh(planning)
    return planning


@router.patch("/sprints/{sprint_id}/planning/{grupo_id}", response_model=PlanningOut)
def update_planning(
    sprint_id: uuid.UUID,
    grupo_id: uuid.UUID,
    payload: PlanningUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, grupo_id, current_user, db)
    planning = (
        db.query(SprintPlanning)
        .filter(SprintPlanning.sprint_id == sprint_id, SprintPlanning.grupo_id == grupo.id)
        .first()
    )
    if planning is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta equipe ainda não tem planning")

    if payload.data is not None:
        planning.data = payload.data
    if payload.texto is not None:
        planning.texto = payload.texto
    db.commit()
    db.refresh(planning)
    return planning


@router.delete("/sprints/{sprint_id}/planning/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_planning(
    sprint_id: uuid.UUID,
    grupo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, grupo_id, current_user, db)
    planning = (
        db.query(SprintPlanning)
        .filter(SprintPlanning.sprint_id == sprint_id, SprintPlanning.grupo_id == grupo.id)
        .first()
    )
    if planning is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta equipe ainda não tem planning")
    db.delete(planning)
    db.commit()


@router.post("/sprints/{sprint_id}/review", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    sprint_id: uuid.UUID,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, payload.grupo_id, current_user, db)
    ja_existe = (
        db.query(SprintReview)
        .filter(SprintReview.sprint_id == sprint_id, SprintReview.grupo_id == grupo.id)
        .first()
    )
    if ja_existe is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Esta equipe já tem uma review nesta sprint"
        )

    review = SprintReview(
        sprint_id=sprint_id, grupo_id=grupo.id, data=payload.data, texto=payload.texto, criado_por_id=current_user.id
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.patch("/sprints/{sprint_id}/review/{grupo_id}", response_model=ReviewOut)
def update_review(
    sprint_id: uuid.UUID,
    grupo_id: uuid.UUID,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, grupo_id, current_user, db)
    review = (
        db.query(SprintReview)
        .filter(SprintReview.sprint_id == sprint_id, SprintReview.grupo_id == grupo.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta equipe ainda não tem review")

    if payload.data is not None:
        review.data = payload.data
    if payload.texto is not None:
        review.texto = payload.texto
    db.commit()
    db.refresh(review)
    return review


@router.delete("/sprints/{sprint_id}/review/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    sprint_id: uuid.UUID,
    grupo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, grupo = _get_sprint_e_grupo_para_gerenciar(sprint_id, grupo_id, current_user, db)
    review = (
        db.query(SprintReview)
        .filter(SprintReview.sprint_id == sprint_id, SprintReview.grupo_id == grupo.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta equipe ainda não tem review")
    db.delete(review)
    db.commit()
