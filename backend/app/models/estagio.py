import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Estagio(Base):
    __tablename__ = "estagios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turma_id = Column(UUID(as_uuid=True), ForeignKey("turmas.id"), nullable=False)
    nome = Column(String, nullable=False)
    ordem = Column(Integer, nullable=False)
    cor = Column(String, nullable=True)
    is_conclusao = Column(Boolean, nullable=False, default=False)

    turma = relationship("Turma", back_populates="estagios")
