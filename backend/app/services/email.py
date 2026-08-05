import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def enviar_email(destinatario: str, assunto: str, corpo_texto: str) -> None:
    """Envia um e-mail transacional via SMTP.

    Sem SMTP_HOST configurado (dev/local), o envio é ignorado — a rota que
    chama esta função nunca deve depender do retorno para decidir sua resposta,
    para não vazar se o e-mail existe ou não na base.
    """
    if not settings.smtp_host:
        logger.warning("SMTP não configurado: e-mail para %s não foi enviado.", destinatario)
        return

    msg = EmailMessage()
    msg["Subject"] = assunto
    msg["From"] = settings.smtp_from
    msg["To"] = destinatario
    msg.set_content(corpo_texto)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError):
        logger.exception("Falha ao enviar e-mail para %s.", destinatario)
