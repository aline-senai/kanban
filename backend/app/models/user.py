import enum
import uuid

from sqlalchemy import Boolean, Column, Enum, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class UserRole(str, enum.Enum):
    PROFESSOR = "professor"
    ALUNO = "aluno"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.ALUNO)

    # Só relevante para professor: cadastro público de professor fica pendente até
    # outro professor aprovar (o primeiro professor do sistema é auto-aprovado).
    # Aluno é sempre True.
    aprovado = Column(Boolean, nullable=False, default=True)

    notif_atribuicao = Column(Boolean, nullable=False, default=True)
    notif_prazo = Column(Boolean, nullable=False, default=True)
    notif_comentario = Column(Boolean, nullable=False, default=False)
