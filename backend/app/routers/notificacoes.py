import secrets
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notificacao import Notificacao
from app.models.user import User
from app.schemas.notificacao import NotificacaoOut
from app.services.notificacoes import gerar_notificacoes_prazo_proximo, notificar_atividades_vencendo_hoje

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


@router.get("", response_model=list[NotificacaoOut])
def list_notificacoes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gerar_notificacoes_prazo_proximo(db, current_user)
    return (
        db.query(Notificacao)
        .filter(Notificacao.user_id == current_user.id)
        .order_by(Notificacao.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notificacao_id}", response_model=NotificacaoOut)
def marcar_lida(
    notificacao_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    notificacao = db.get(Notificacao, notificacao_id)
    if notificacao is None or notificacao.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")
    notificacao.lida = True
    db.commit()
    db.refresh(notificacao)
    return notificacao


@router.post("/marcar-todas-lidas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas_lidas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notificacao).filter(Notificacao.user_id == current_user.id, Notificacao.lida.is_(False)).update(
        {"lida": True}
    )
    db.commit()


@router.post("/jobs/vencendo-hoje")
def job_notificar_vencendo_hoje(
    x_cron_secret: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Dispara o e-mail de "vence hoje" para todos os responsáveis com prazo no dia.

    Não é uma rota de usuário: é feita para ser chamada 1x/dia por um agendador externo
    (cron do servidor, GitHub Actions com schedule, etc.), autenticada por um segredo
    compartilhado (header X-Cron-Secret) em vez de login de usuário.
    """
    if not settings.cron_secret or not secrets.compare_digest(x_cron_secret, settings.cron_secret):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    enviados = notificar_atividades_vencendo_hoje(db)
    return {"emails_enviados": enviados}
