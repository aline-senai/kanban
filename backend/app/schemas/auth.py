from pydantic import BaseModel, EmailStr

from app.schemas.user import UserOut

__all__ = ["LoginRequest", "Token", "UserOut"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
