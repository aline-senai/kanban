from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut

__all__ = ["LoginRequest", "Token", "UserOut", "ChangePasswordRequest"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    senha_atual: str
    senha_nova: str = Field(min_length=8)
