from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.user import User, UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterOut,
    RegisterRequest,
    Token,
    UserOut,
)
from app.schemas.user import UserMeUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")
    if user.role == UserRole.PROFESSOR and not user.aprovado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cadastro de professor aguardando aprovação de outro professor.",
        )

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


@router.post("/register", response_model=RegisterOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Autocadastro como aluno (liberado na hora) ou professor (pendente de
    aprovação de outro professor — o primeiro professor do sistema é auto-aprovado,
    pra não travar o bootstrap)."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    aprovado = True
    if payload.role == UserRole.PROFESSOR:
        existe_professor = db.query(User).filter(User.role == UserRole.PROFESSOR).first() is not None
        aprovado = not existe_professor

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        aprovado=aprovado,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if payload.role == UserRole.PROFESSOR and not aprovado:
        professores = (
            db.query(User)
            .filter(User.role == UserRole.PROFESSOR, User.aprovado.is_(True), User.id != user.id)
            .all()
        )
        for professor in professores:
            db.add(
                Notificacao(
                    user_id=professor.id,
                    tipo=NotificacaoTipo.SOLICITACAO_PROFESSOR,
                    referencia_user_id=user.id,
                    texto=f'{user.name} ({user.email}) pediu para se cadastrar como professor.',
                )
            )
        db.commit()
        return RegisterOut(pendente_aprovacao=True)

    token = create_access_token(subject=str(user.id))
    return RegisterOut(access_token=token)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Não depende de e-mail: notifica os outros professores (aprovados), que
    resetam a senha de quem pediu pelo botão "resetar senha" — na tela de
    Equipe (aluno) ou na própria notificação (professor).

    A resposta é sempre a mesma exista ou não o e-mail na base, para não
    permitir que alguém descubra quais e-mails têm conta só tentando aqui.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        professores = (
            db.query(User)
            .filter(User.role == UserRole.PROFESSOR, User.aprovado.is_(True), User.id != user.id)
            .all()
        )
        for professor in professores:
            db.add(
                Notificacao(
                    user_id=professor.id,
                    tipo=NotificacaoTipo.SOLICITACAO_SENHA,
                    referencia_user_id=user.id,
                    texto=f'{user.name} ({user.email}) pediu para redefinir a senha.',
                )
            )
        db.commit()


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
    current_user.deve_trocar_senha = False
    db.commit()
