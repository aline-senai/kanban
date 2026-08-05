import uuid

from pydantic import BaseModel

from app.schemas.user import UserOut


class GrupoCreate(BaseModel):
    nome: str
    descricao: str | None = None


class GrupoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None


class GrupoMembroCreate(BaseModel):
    user_id: uuid.UUID
    is_gestor: bool = False


class GrupoMembroUpdate(BaseModel):
    is_gestor: bool


class GrupoMembroOut(BaseModel):
    id: uuid.UUID
    is_gestor: bool
    user: UserOut

    class Config:
        from_attributes = True


class GrupoOut(BaseModel):
    id: uuid.UUID
    turma_id: uuid.UUID
    nome: str
    descricao: str | None = None
    membros: list[GrupoMembroOut] = []

    class Config:
        from_attributes = True
