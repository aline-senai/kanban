import uuid
from datetime import datetime

from pydantic import BaseModel


class TurmaCreate(BaseModel):
    nome: str


class TurmaUpdate(BaseModel):
    nome: str | None = None
    arquivada: bool | None = None


class TurmaOut(BaseModel):
    id: uuid.UUID
    nome: str
    professor_id: uuid.UUID
    arquivada: bool
    created_at: datetime

    class Config:
        from_attributes = True
