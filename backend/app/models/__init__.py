from app.models.user import User, UserRole
from app.models.turma import Turma
from app.models.grupo import Grupo, GrupoMembro
from app.models.estagio import Estagio
from app.models.atividade import Atividade, AtividadeResponsavel, AtividadeHistorico
from app.models.checklist import ChecklistItem
from app.models.anexo import Anexo, AnexoVersao
from app.models.comentario import Comentario
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.password_reset import PasswordResetToken

__all__ = [
    "User",
    "UserRole",
    "Turma",
    "Grupo",
    "GrupoMembro",
    "Estagio",
    "Atividade",
    "AtividadeResponsavel",
    "AtividadeHistorico",
    "ChecklistItem",
    "Anexo",
    "AnexoVersao",
    "Comentario",
    "Notificacao",
    "NotificacaoTipo",
    "PasswordResetToken",
]
