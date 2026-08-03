import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class AnexoVersaoOut(BaseModel):
    id: uuid.UUID
    versao_numero: int
    nome_arquivo: str
    uploaded_by: UserOut
    created_at: datetime

    class Config:
        from_attributes = True


class AnexoOut(BaseModel):
    id: uuid.UUID
    atividade_id: uuid.UUID
    nome_referencia: str
    created_at: datetime
    versoes: list[AnexoVersaoOut]

    class Config:
        from_attributes = True
