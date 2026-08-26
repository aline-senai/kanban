import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class SprintCreate(BaseModel):
    nome: str


class SprintUpdate(BaseModel):
    nome: str | None = None


class PlanningCreate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class PlanningUpdate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class PlanningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sprint_id: uuid.UUID
    data: datetime | None
    texto: str | None
    criado_por: UserOut
    created_at: datetime
    updated_at: datetime | None


class ReviewCreate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class ReviewUpdate(BaseModel):
    data: datetime | None = None
    texto: str | None = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sprint_id: uuid.UUID
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
    created_at: datetime
    planning: PlanningOut | None = None
    review: ReviewOut | None = None
