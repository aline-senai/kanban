import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class ComentarioCreate(BaseModel):
    texto: str


class ComentarioOut(BaseModel):
    id: uuid.UUID
    atividade_id: uuid.UUID
    autor: UserOut
    texto: str
    created_at: datetime

    class Config:
        from_attributes = True
