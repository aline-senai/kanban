import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"

_ALFABETO_SENHA_TEMPORARIA = "".join(c for c in string.ascii_letters + string.digits if c not in "0O1lI")


def gerar_senha_temporaria(tamanho: int = 10) -> str:
    """Gera uma senha aleatória para reset feito por um professor (RF: recuperação sem e-mail).

    Evita caracteres ambíguos (0/O, 1/l/I) para facilitar repassar por voz ou mensagem.
    """
    return "".join(secrets.choice(_ALFABETO_SENHA_TEMPORARIA) for _ in range(tamanho))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    return payload.get("sub")
