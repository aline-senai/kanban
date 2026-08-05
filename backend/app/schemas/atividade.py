import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.atividade import Prioridade
from app.schemas.user import UserOut


class AtividadeCreate(BaseModel):
    estagio_id: uuid.UUID
    nome: str
    texto: str | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None
    responsavel_ids: list[uuid.UUID] = []
    prioridade: Prioridade = Prioridade.MEDIA
    estimativa_horas: int | None = None


class AtividadeUpdate(BaseModel):
    nome: str | None = None
    texto: str | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None
    responsavel_ids: list[uuid.UUID] | None = None
    prioridade: Prioridade | None = None
    estimativa_horas: int | None = None


class AtividadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    grupo_id: uuid.UUID
    estagio_id: uuid.UUID
    criador_id: uuid.UUID
    numero: int
    nome: str
    texto: str | None
    prioridade: Prioridade
    estimativa_horas: int | None
    data_criacao: datetime
    data_inicio: datetime | None
    data_inicio_estagio: datetime
    data_fim: datetime | None
    responsaveis: list[UserOut] = Field(validation_alias="responsaveis_users")
    criador: UserOut


class MoverAtividadeRequest(BaseModel):
    estagio_id: uuid.UUID


class HistoricoEntryOut(BaseModel):
    id: uuid.UUID
    estagio_de_id: uuid.UUID | None
    estagio_de_nome: str | None
    estagio_para_id: uuid.UUID
    estagio_para_nome: str
    user_id: uuid.UUID
    user_name: str
    created_at: datetime
    duracao_segundos: int
