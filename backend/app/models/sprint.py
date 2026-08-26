import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Sprint(Base):
    """Sprint nomeada pelo professor; cada equipe tem sua própria Planning e Review."""

    __tablename__ = "sprints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)
    ordem = Column(Integer, nullable=False)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    turma = relationship("Turma")
    plannings = relationship("SprintPlanning", back_populates="sprint", cascade="all, delete-orphan")
    reviews = relationship("SprintReview", back_populates="sprint", cascade="all, delete-orphan")


class SprintPlanning(Base):
    """Planning de uma equipe específica para uma sprint (uma por combinação sprint+equipe)."""

    __tablename__ = "sprint_plannings"
    __table_args__ = (UniqueConstraint("sprint_id", "grupo_id", name="uq_sprint_planning_grupo"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=True)
    data = Column(DateTime(timezone=True), nullable=True)
    texto = Column(Text, nullable=True)
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sprint = relationship("Sprint", back_populates="plannings")
    grupo = relationship("Grupo")
    criado_por = relationship("User")

    @property
    def grupo_nome(self):
        return self.grupo.nome if self.grupo else None


class SprintReview(Base):
    """Review de uma equipe específica para uma sprint (uma por combinação sprint+equipe)."""

    __tablename__ = "sprint_reviews"
    __table_args__ = (UniqueConstraint("sprint_id", "grupo_id", name="uq_sprint_review_grupo"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=True)
    data = Column(DateTime(timezone=True), nullable=True)
    texto = Column(Text, nullable=True)
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sprint = relationship("Sprint", back_populates="reviews")
    grupo = relationship("Grupo")
    criado_por = relationship("User")

    @property
    def grupo_nome(self):
        return self.grupo.nome if self.grupo else None
