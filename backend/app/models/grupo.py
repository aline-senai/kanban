import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Grupo(Base):
    __tablename__ = "grupos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)

    turma = relationship("Turma", back_populates="grupos")
    membros = relationship("GrupoMembro", back_populates="grupo", cascade="all, delete-orphan")


class GrupoMembro(Base):
    __tablename__ = "grupo_membros"
    __table_args__ = (
        UniqueConstraint("grupo_id", "user_id", name="uq_grupo_membro"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_gestor = Column(Boolean, nullable=False, default=False)

    grupo = relationship("Grupo", back_populates="membros")
    user = relationship("User")
