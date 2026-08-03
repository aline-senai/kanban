import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Anexo(Base):
    """Referencia lógica de um anexo; cada upload gera uma AnexoVersao."""

    __tablename__ = "anexos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=False)
    nome_referencia = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    atividade = relationship("Atividade", back_populates="anexos")
    versoes = relationship(
        "AnexoVersao", back_populates="anexo", cascade="all, delete-orphan", order_by="AnexoVersao.versao_numero"
    )


class AnexoVersao(Base):
    __tablename__ = "anexo_versoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    anexo_id = Column(UUID(as_uuid=True), ForeignKey("anexos.id"), nullable=False)
    versao_numero = Column(Integer, nullable=False)
    arquivo_path = Column(String, nullable=False)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    anexo = relationship("Anexo", back_populates="versoes")
    uploaded_by = relationship("User")
