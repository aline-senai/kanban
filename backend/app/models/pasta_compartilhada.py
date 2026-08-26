import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PastaCompartilhada(Base):
    """Atalho para uma pasta externa (ex: Google Drive) disponibilizado pelo professor na turma."""

    __tablename__ = "pastas_compartilhadas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)
    url = Column(String, nullable=False)
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    turma = relationship("Turma")
    criado_por = relationship("User")
