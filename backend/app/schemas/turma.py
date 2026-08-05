import uuid
from datetime import date, datetime

from pydantic import BaseModel


class TurmaCreate(BaseModel):
    nome: str


class TurmaUpdate(BaseModel):
    nome: str | None = None
    arquivada: bool | None = None
    cronograma_inicio: date | None = None
    duracao_sprint_semanas: int | None = None
    total_sprints: int | None = None
    sprint_atual: int | None = None


class TurmaOut(BaseModel):
    id: uuid.UUID
    nome: str
    professor_id: uuid.UUID
    arquivada: bool
    created_at: datetime
    cronograma_inicio: date | None
    duracao_sprint_semanas: int
    total_sprints: int
    sprint_atual: int

    class Config:
        from_attributes = True
