import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=False)
    autor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    texto = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    atividade = relationship("Atividade", back_populates="comentarios")
    autor = relationship("User")
