import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class NotificacaoTipo(str, enum.Enum):
    ATRIBUICAO = "atribuicao"
    MENCAO = "mencao"
    COMENTARIO = "comentario"
    PRAZO_PROXIMO = "prazo_proximo"


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=True)
    tipo = Column(Enum(NotificacaoTipo), nullable=False)
    texto = Column(String, nullable=False)
    lida = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    atividade = relationship("Atividade")
