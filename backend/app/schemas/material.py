import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class MaterialOut(BaseModel):
    id: uuid.UUID
    turma_id: uuid.UUID
    nome: str
    is_modelo: bool
    uploaded_by: UserOut
    created_at: datetime

    class Config:
        from_attributes = True
