import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Atividade(Base):
    __tablename__ = "atividades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    estagio_id = Column(UUID(as_uuid=True), ForeignKey("estagios.id"), nullable=False)
    criador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    nome = Column(String, nullable=False)
    texto = Column(Text, nullable=True)

    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    data_inicio = Column(DateTime(timezone=True), nullable=True)
    data_inicio_estagio = Column(DateTime(timezone=True), server_default=func.now())
    data_fim = Column(DateTime(timezone=True), nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    grupo = relationship("Grupo")
    estagio = relationship("Estagio")
    criador = relationship("User")
    responsaveis = relationship("AtividadeResponsavel", back_populates="atividade", cascade="all, delete-orphan")
    checklist_itens = relationship("ChecklistItem", back_populates="atividade", cascade="all, delete-orphan")
    anexos = relationship("Anexo", back_populates="atividade", cascade="all, delete-orphan")
    comentarios = relationship("Comentario", back_populates="atividade", cascade="all, delete-orphan")

    @property
    def responsaveis_users(self):
        return [r.user for r in self.responsaveis]


class AtividadeResponsavel(Base):
    __tablename__ = "atividade_responsaveis"
    __table_args__ = (
        UniqueConstraint("atividade_id", "user_id", name="uq_atividade_responsavel"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    atividade = relationship("Atividade", back_populates="responsaveis")
    user = relationship("User")


class AtividadeHistorico(Base):
    __tablename__ = "atividade_historico"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    estagio_de_id = Column(UUID(as_uuid=True), ForeignKey("estagios.id"), nullable=True)
    estagio_para_id = Column(UUID(as_uuid=True), ForeignKey("estagios.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
