import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, func
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

    cronograma_inicio = Column(Date, nullable=True)
    duracao_sprint_semanas = Column(Integer, nullable=False, default=2)
    total_sprints = Column(Integer, nullable=False, default=8)
    sprint_atual = Column(Integer, nullable=False, default=1)

    professor = relationship("User")
    grupos = relationship("Grupo", back_populates="turma", cascade="all, delete-orphan")
    estagios = relationship("Estagio", back_populates="turma", cascade="all, delete-orphan")
    materiais = relationship("Material", back_populates="turma", cascade="all, delete-orphan")
