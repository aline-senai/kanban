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
    sprint_id: uuid.UUID | None = None


class AtividadeUpdate(BaseModel):
    nome: str | None = None
    texto: str | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None
    responsavel_ids: list[uuid.UUID] | None = None
    prioridade: Prioridade | None = None
    estimativa_horas: int | None = None
    sprint_id: uuid.UUID | None = None


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
    sprint_id: uuid.UUID | None
    sprint_nome: str | None


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


class AtividadeVinculoCreate(BaseModel):
    atividade_vinculada_id: uuid.UUID


class AtividadeResumoOut(BaseModel):
    id: uuid.UUID
    numero: int
    nome: str
    grupo_id: uuid.UUID
    grupo_nome: str
    estagio_id: uuid.UUID
    estagio_nome: str


class AtividadeVinculoOut(BaseModel):
    id: uuid.UUID
    atividade: AtividadeResumoOut
