import uuid

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    notif_atribuicao: bool
    notif_prazo: bool
    notif_comentario: bool

    class Config:
        from_attributes = True


class UserMeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    notif_atribuicao: bool | None = None
    notif_prazo: bool | None = None
    notif_comentario: bool | None = None
