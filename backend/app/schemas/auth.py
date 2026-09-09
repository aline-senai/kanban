from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole
from app.schemas.user import UserOut

__all__ = [
    "LoginRequest",
    "Token",
    "UserOut",
    "ChangePasswordRequest",
    "RegisterRequest",
    "RegisterOut",
    "ForgotPasswordRequest",
]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    senha_atual: str
    senha_nova: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.ALUNO


class RegisterOut(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    pendente_aprovacao: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
