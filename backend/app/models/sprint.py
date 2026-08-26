import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Sprint(Base):
    """Sprint nomeada pelo professor, com uma Planning e uma Review opcionais."""

    __tablename__ = "sprints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)
    ordem = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    turma = relationship("Turma")
    planning = relationship(
        "SprintPlanning", back_populates="sprint", uselist=False, cascade="all, delete-orphan"
    )
    review = relationship("SprintReview", back_populates="sprint", uselist=False, cascade="all, delete-orphan")


class SprintPlanning(Base):
    __tablename__ = "sprint_plannings"
    __table_args__ = (UniqueConstraint("sprint_id", name="uq_sprint_planning"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False)
    data = Column(DateTime(timezone=True), nullable=True)
    texto = Column(Text, nullable=True)
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sprint = relationship("Sprint", back_populates="planning")
    criado_por = relationship("User")


class SprintReview(Base):
    __tablename__ = "sprint_reviews"
    __table_args__ = (UniqueConstraint("sprint_id", name="uq_sprint_review"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False)
    data = Column(DateTime(timezone=True), nullable=True)
    texto = Column(Text, nullable=True)
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sprint = relationship("Sprint", back_populates="review")
    criado_por = relationship("User")
