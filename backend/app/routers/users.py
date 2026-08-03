from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_professor
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_alunos(_: User = Depends(require_professor), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.ALUNO).order_by(User.name).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_aluno(payload: UserCreate, _: User = Depends(require_professor), db: Session = Depends(get_db)):
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
    return user
