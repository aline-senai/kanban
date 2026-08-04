from sqlalchemy.orm import Session

from app.models.grupo import Grupo, GrupoMembro
from app.models.turma import Turma
from app.models.user import User, UserRole


def can_manage_grupo(grupo: Grupo, user: User, db: Session) -> bool:
    if user.role == UserRole.PROFESSOR and grupo.turma.professor_id == user.id:
        return True
    return (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo.id, GrupoMembro.user_id == user.id, GrupoMembro.is_gestor.is_(True))
        .first()
        is not None
    )


def is_member_or_manager(grupo: Grupo, user: User, db: Session) -> bool:
    if can_manage_grupo(grupo, user, db):
        return True
    return (
        db.query(GrupoMembro)
        .filter(GrupoMembro.grupo_id == grupo.id, GrupoMembro.user_id == user.id)
        .first()
        is not None
    )


def has_turma_access(turma: Turma, user: User, db: Session) -> bool:
    """RF25/RF26: professor vê todas as suas turmas; gestor/integrante só a turma do próprio grupo."""
    if user.role == UserRole.PROFESSOR and turma.professor_id == user.id:
        return True
    return (
        db.query(GrupoMembro)
        .join(Grupo, GrupoMembro.grupo_id == Grupo.id)
        .filter(Grupo.turma_id == turma.id, GrupoMembro.user_id == user.id)
        .first()
        is not None
    )
