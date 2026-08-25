import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Material(Base):
    """Arquivo da pasta da turma, disponibilizado pelo professor (ex: modelos/templates)."""

    __tablename__ = "materiais"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)
    arquivo_path = Column(String, nullable=False)
    is_modelo = Column(Boolean, nullable=False, default=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    turma = relationship("Turma", back_populates="materiais")
    uploaded_by = relationship("User")
