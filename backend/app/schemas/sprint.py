import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class SprintCreate(BaseModel):
    nome: str
    data_inicio: date | None = None
    data_fim: date | None = None


class SprintUpdate(BaseModel):
    nome: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None


class SprintReorderRequest(BaseModel):
    sprint_ids: list[uuid.UUID]


class PlanningCreate(BaseModel):
    grupo_id: uuid.UUID
    data: datetime | None = None
    texto: str | None = None


class PlanningUpdate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class PlanningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sprint_id: uuid.UUID
    grupo_id: uuid.UUID
    grupo_nome: str
    data: datetime | None
    texto: str | None
    criado_por: UserOut
    created_at: datetime
    updated_at: datetime | None


class ReviewCreate(BaseModel):
    grupo_id: uuid.UUID
    data: datetime | None = None
    texto: str | None = None


class ReviewUpdate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sprint_id: uuid.UUID
    grupo_id: uuid.UUID
    grupo_nome: str
    data: datetime | None
    texto: str | None
    criado_por: UserOut
    created_at: datetime
    updated_at: datetime | None


class SprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    turma_id: uuid.UUID
    nome: str
    ordem: int
    data_inicio: date | None
    data_fim: date | None
    created_at: datetime
    plannings: list[PlanningOut] = []
    reviews: list[ReviewOut] = []
