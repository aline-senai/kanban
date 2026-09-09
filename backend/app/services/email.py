import logging
import smtplib
import socket
from email.message import EmailMessage
from html import escape

from app.core.config import settings

logger = logging.getLogger(__name__)

GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


def _connect_ipv4(host: str, port: int, timeout: float) -> socket.socket:
    """Conecta forçando IPv4.

    O Render não tem rota IPv6 configurada; como o smtp.gmail.com também
    publica endereço IPv6 (AAAA), a tentativa de conexão por IPv6 falhava
    com "Network is unreachable" antes do fallback para IPv4 ocorrer.
    """
    last_exc: OSError | None = None
    for family, socktype, proto, _, sockaddr in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(timeout)
            sock.connect(sockaddr)
            return sock
        except OSError as exc:
            last_exc = exc
            if sock is not None:
                sock.close()
    assert last_exc is not None
    raise last_exc


class _IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        return _connect_ipv4(host, port, timeout)


def enviar_email(destinatario: str, assunto: str, corpo_texto: str, corpo_html: str | None = None) -> None:
    """Envia um e-mail transacional via SMTP do Gmail.

    Sem GMAIL_USER/GMAIL_APP_PASSWORD configurados (dev/local), o envio é
    ignorado — a rota que chama esta função nunca deve depender do retorno
    para decidir sua resposta, para não vazar se o e-mail existe ou não na
    base.
    """
    if not settings.gmail_user or not settings.gmail_app_password:
        logger.warning("GMAIL_USER/GMAIL_APP_PASSWORD não configurados: e-mail para %s não foi enviado.", destinatario)
        return

    msg = EmailMessage()
    msg["Subject"] = assunto
    msg["From"] = settings.gmail_user
    msg["To"] = destinatario
    msg.set_content(corpo_texto)
    if corpo_html is not None:
        msg.add_alternative(corpo_html, subtype="html")

    try:
        with _IPv4SMTP(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(settings.gmail_user, settings.gmail_app_password)
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError):
        logger.exception("Falha ao enviar e-mail para %s.", destinatario)


def montar_email_html(titulo: str, paragrafos: list[str], cta_texto: str | None = None, cta_url: str | None = None) -> str:
    """Monta um e-mail HTML com a identidade visual do Quadro SENAI (mesmo azul do app).

    `paragrafos` é uma lista de textos já prontos para exibição (serão escapados);
    passe `cta_texto`/`cta_url` para incluir um botão de ação (ex: abrir a atividade).
    """
    corpo_paragrafos = "".join(
        f'<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#334155;">{escape(p)}</p>'
        for p in paragrafos
    )

    botao = ""
    if cta_texto and cta_url:
        botao = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
          <tr>
            <td style="border-radius:8px;background-color:#2563eb;">
              <a href="{escape(cta_url)}"
                 style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;
                        color:#ffffff;text-decoration:none;border-radius:8px;">
                {escape(cta_texto)}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">
          Se o botão não funcionar, copie e cole este link no navegador: {escape(cta_url)}
        </p>
        """

    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                 style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;
                        overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:#2563eb;padding:18px 24px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;">Quadro SENAI</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 14px;font-size:18px;color:#0f172a;">{escape(titulo)}</h1>
                {corpo_paragrafos}
                {botao}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#64748b;">
                  Você recebeu este e-mail por causa das preferências de notificação da sua conta no
                  Quadro SENAI. Para ajustá-las, acesse "Minha conta" dentro do app.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
