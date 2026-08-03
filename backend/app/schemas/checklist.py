import uuid

from pydantic import BaseModel


class ChecklistItemCreate(BaseModel):
    texto: str


class ChecklistItemUpdate(BaseModel):
    texto: str | None = None
    concluido: bool | None = None


class ChecklistItemOut(BaseModel):
    id: uuid.UUID
    atividade_id: uuid.UUID
    texto: str
    concluido: bool
    ordem: int

    class Config:
        from_attributes = True


class ReorderChecklistRequest(BaseModel):
    item_ids: list[uuid.UUID]
