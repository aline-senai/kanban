import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import can_manage_grupo, is_member_or_manager
from app.models.atividade import Atividade, AtividadeResponsavel
from app.models.checklist import ChecklistItem
from app.models.user import User
from app.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    ReorderChecklistRequest,
)

router = APIRouter(tags=["checklist"])


def _get_atividade_or_404(atividade_id: uuid.UUID, db: Session) -> Atividade:
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
    return atividade


def _can_edit_checklist(atividade: Atividade, user: User, db: Session) -> bool:
    if can_manage_grupo(atividade.grupo, user, db):
        return True
    return (
        db.query(AtividadeResponsavel)
        .filter(AtividadeResponsavel.atividade_id == atividade.id, AtividadeResponsavel.user_id == user.id)
        .first()
        is not None
    )


@router.get("/atividades/{atividade_id}/checklist", response_model=list[ChecklistItemOut])
def list_checklist(
    atividade_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta atividade")
    return (
        db.query(ChecklistItem)
        .filter(ChecklistItem.atividade_id == atividade_id)
        .order_by(ChecklistItem.ordem)
        .all()
    )


@router.post(
    "/atividades/{atividade_id}/checklist", response_model=ChecklistItemOut, status_code=status.HTTP_201_CREATED
)
def create_checklist_item(
    atividade_id: uuid.UUID,
    payload: ChecklistItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not _can_edit_checklist(atividade, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas professor, gestor ou responsáveis podem editar o checklist",
        )

    proxima_ordem = db.query(ChecklistItem).filter(ChecklistItem.atividade_id == atividade_id).count()
    item = ChecklistItem(atividade_id=atividade_id, texto=payload.texto, ordem=proxima_ordem)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _get_editable_item(item_id: uuid.UUID, current_user: User, db: Session) -> ChecklistItem:
    item = db.get(ChecklistItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do checklist não encontrado")
    if not _can_edit_checklist(item.atividade, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas professor, gestor ou responsáveis podem editar o checklist",
        )
    return item


@router.patch("/checklist/{item_id}", response_model=ChecklistItemOut)
def update_checklist_item(
    item_id: uuid.UUID,
    payload: ChecklistItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_editable_item(item_id, current_user, db)
    if payload.texto is not None:
        item.texto = payload.texto
    if payload.concluido is not None:
        item.concluido = payload.concluido
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_item(
    item_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    item = _get_editable_item(item_id, current_user, db)
    db.delete(item)
    db.commit()


@router.patch("/atividades/{atividade_id}/checklist/reorder", response_model=list[ChecklistItemOut])
def reorder_checklist(
    atividade_id: uuid.UUID,
    payload: ReorderChecklistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not _can_edit_checklist(atividade, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas professor, gestor ou responsáveis podem editar o checklist",
        )

    itens = db.query(ChecklistItem).filter(ChecklistItem.atividade_id == atividade_id).all()
    itens_by_id = {i.id: i for i in itens}

    if set(payload.item_ids) != set(itens_by_id.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lista deve conter exatamente todos os itens do checklist",
        )

    for ordem, item_id in enumerate(payload.item_ids):
        itens_by_id[item_id].ordem = ordem

    db.commit()
    return (
        db.query(ChecklistItem)
        .filter(ChecklistItem.atividade_id == atividade_id)
        .order_by(ChecklistItem.ordem)
        .all()
    )
