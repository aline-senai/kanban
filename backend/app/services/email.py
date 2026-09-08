import json
import logging
import urllib.error
import urllib.request

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def enviar_email(destinatario: str, assunto: str, corpo_texto: str) -> None:
    """Envia um e-mail transacional via API HTTPS da Resend.

    Sem RESEND_API_KEY configurada (dev/local), o envio é ignorado — a rota
    que chama esta função nunca deve depender do retorno para decidir sua
    resposta, para não vazar se o e-mail existe ou não na base.

    Usamos a API HTTPS da Resend em vez de SMTP porque serviços como o Render
    não garantem rota de saída para conexões SMTP brutas (a porta pode ficar
    inalcançável mesmo quando o tráfego HTTPS de saída funciona normalmente).
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY não configurada: e-mail para %s não foi enviado.", destinatario)
        return

    payload = json.dumps(
        {
            "from": settings.smtp_from,
            "to": [destinatario],
            "subject": assunto,
            "text": corpo_texto,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10):
            pass
    except (urllib.error.URLError, OSError):
        logger.exception("Falha ao enviar e-mail para %s.", destinatario)
