import uuid

from pydantic import BaseModel


class EstagioCreate(BaseModel):
    nome: str
    cor: str | None = None
    is_conclusao: bool = False


class EstagioUpdate(BaseModel):
    nome: str | None = None
    cor: str | None = None
    is_conclusao: bool | None = None


class EstagioOut(BaseModel):
    id: uuid.UUID
    turma_id: uuid.UUID
    nome: str
    ordem: int
    cor: str | None
    is_conclusao: bool

    class Config:
        from_attributes = True


class ReorderRequest(BaseModel):
    estagio_ids: list[uuid.UUID]


class DuplicarEstagiosRequest(BaseModel):
    origem_turma_id: uuid.UUID
