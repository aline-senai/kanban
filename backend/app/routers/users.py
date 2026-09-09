import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_professor
from app.core.security import gerar_senha_temporaria, hash_password
from app.models.user import User, UserRole
from app.schemas.user import SenhaTemporariaOut, UserCreate, UserOut

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


@router.post("/{user_id}/reset-senha", response_model=SenhaTemporariaOut)
def reset_senha_aluno(user_id: uuid.UUID, _: User = Depends(require_professor), db: Session = Depends(get_db)):
    """Alternativa ao "esqueci minha senha" por e-mail: o professor gera uma senha
    temporária e repassa ao aluno diretamente (ex: em sala, por WhatsApp)."""
    user = db.get(User, user_id)
    if user is None or user.role != UserRole.ALUNO:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    senha_temporaria = gerar_senha_temporaria()
    user.hashed_password = hash_password(senha_temporaria)
    db.commit()
    return SenhaTemporariaOut(senha_temporaria=senha_temporaria)


@router.post("/{user_id}/aprovar-professor", response_model=UserOut)
def aprovar_professor(user_id: uuid.UUID, _: User = Depends(require_professor), db: Session = Depends(get_db)):
    """Libera o acesso de um cadastro de professor pendente de aprovação."""
    user = db.get(User, user_id)
    if user is None or user.role != UserRole.PROFESSOR:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")

    user.aprovado = True
    db.commit()
    db.refresh(user)
    return user
