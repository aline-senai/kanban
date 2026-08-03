import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Turma(Base):
    __tablename__ = "turmas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String, nullable=False)
    professor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    arquivada = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    professor = relationship("User")
    grupos = relationship("Grupo", back_populates="turma", cascade="all, delete-orphan")
    estagios = relationship("Estagio", back_populates="turma", cascade="all, delete-orphan")
