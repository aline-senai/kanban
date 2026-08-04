import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.notificacao import NotificacaoTipo


class NotificacaoOut(BaseModel):
    id: uuid.UUID
    atividade_id: uuid.UUID | None
    tipo: NotificacaoTipo
    texto: str
    lida: bool
    created_at: datetime

    class Config:
        from_attributes = True
