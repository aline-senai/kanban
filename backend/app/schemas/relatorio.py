import uuid
from datetime import datetime

from pydantic import BaseModel


class ConclusaoGrupoOut(BaseModel):
    grupo_id: uuid.UUID
    grupo_nome: str
    total_atividades: int
    concluidas: int
    percentual: float


class AtividadeAtrasadaOut(BaseModel):
    atividade_id: uuid.UUID
    nome: str
    grupo_id: uuid.UUID
    grupo_nome: str
    estagio_nome: str
    data_fim: datetime
    responsaveis: list[str]
