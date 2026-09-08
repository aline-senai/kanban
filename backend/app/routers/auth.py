import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.password_reset import PasswordResetToken
from app.models.user import User, UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    Token,
    UserOut,
)
from app.schemas.user import UserMeUpdate
from app.services.email import enviar_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _email_redefinicao_senha_html(nome: str, link: str, validade_minutos: int) -> str:
    nome_seguro = escape(nome)
    link_seguro = escape(link)
    return f"""\
<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background-color:#1d4ed8;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">Quadro SENAI</span>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.5;">
          <p style="margin:0 0 16px;">Olá, {nome_seguro}.</p>
          <p style="margin:0 0 24px;">
            Recebemos um pedido para redefinir sua senha no Quadro SENAI.
            Clique no botão abaixo para escolher uma nova senha
            (válido por {validade_minutos} minutos):
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="{link_seguro}"
               style="display:inline-block;background-color:#1d4ed8;color:#ffffff;text-decoration:none;
                      padding:12px 28px;border-radius:6px;font-weight:bold;">
              Redefinir senha
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
            Se o botão não funcionar, copie e cole este link no navegador:
          </p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
            <a href="{link_seguro}" style="color:#1d4ed8;">{link_seguro}</a>
          </p>
          <p style="margin:0;font-size:13px;color:#6b7280;">
            Se você não pediu isso, pode ignorar este e-mail.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Autocadastro: qualquer pessoa pode criar sua própria conta, sempre como aluno."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.ALUNO,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Gera um link de redefinição e envia por e-mail.

    A resposta é sempre a mesma exista ou não o e-mail na base, para não
    permitir que alguém descubra quais e-mails têm conta só tentando aqui.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.password_reset_token_expire_minutes
        )
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_token(raw_token),
                expires_at=expires_at,
            )
        )
        db.commit()

        link = f"{settings.frontend_url}/redefinir-senha?token={raw_token}"
        enviar_email(
            user.email,
            "Recuperação de senha — Quadro SENAI",
            (
                f"Olá, {user.name}.\n\n"
                "Recebemos um pedido para redefinir sua senha no Quadro SENAI.\n"
                f"Use o link abaixo (válido por {settings.password_reset_token_expire_minutes} minutos):\n\n"
                f"{link}\n\n"
                "Se você não pediu isso, pode ignorar este e-mail."
            ),
            _email_redefinicao_senha_html(user.name, link, settings.password_reset_token_expire_minutes),
        )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserMeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email is not None and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")
        current_user.email = payload.email
    if payload.name is not None:
        current_user.name = payload.name
    if payload.notif_atribuicao is not None:
        current_user.notif_atribuicao = payload.notif_atribuicao
    if payload.notif_prazo is not None:
        current_user.notif_prazo = payload.notif_prazo
    if payload.notif_comentario is not None:
        current_user.notif_comentario = payload.notif_comentario

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.senha_atual, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta")

    current_user.hashed_password = hash_password(payload.senha_nova)
    db.commit()


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    invalido = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido ou expirado"
    )

    registro = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash_token(payload.token))
        .first()
    )
    if registro is None or registro.used_at is not None:
        raise invalido
    if registro.expires_at < datetime.now(timezone.utc):
        raise invalido

    user = db.get(User, registro.user_id)
    if user is None:
        raise invalido

    user.hashed_password = hash_password(payload.senha_nova)
    registro.used_at = datetime.now(timezone.utc)
    db.commit()
