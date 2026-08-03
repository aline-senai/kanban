import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ChecklistItem(Base):
    __tablename__ = "checklist_itens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atividade_id = Column(UUID(as_uuid=True), ForeignKey("atividades.id"), nullable=False)
    texto = Column(String, nullable=False)
    concluido = Column(Boolean, nullable=False, default=False)
    ordem = Column(Integer, nullable=False, default=0)

    atividade = relationship("Atividade", back_populates="checklist_itens")
