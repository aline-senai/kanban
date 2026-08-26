import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class PastaCompartilhadaCreate(BaseModel):
    nome: str
    url: str

    @field_validator("url")
    @classmethod
    def validar_url(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor.lower().startswith(("http://", "https://")):
            raise ValueError("Link deve começar com http:// ou https://")
        return valor


class PastaCompartilhadaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    turma_id: uuid.UUID
    nome: str
    url: str
    created_at: datetime
