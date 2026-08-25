import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_professor
from app.core.permissions import has_turma_access
from app.models.material import Material
from app.models.turma import Turma
from app.models.user import User
from app.schemas.material import MaterialOut

router = APIRouter(tags=["materiais"])


def _get_turma_or_404(turma_id: uuid.UUID, db: Session) -> Turma:
    turma = db.get(Turma, turma_id)
    if turma is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")
    return turma


@router.get("/turmas/{turma_id}/materiais", response_model=list[MaterialOut])
def list_materiais(
    turma_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    turma = _get_turma_or_404(turma_id, db)
    if not has_turma_access(turma, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta turma")
    return (
        db.query(Material)
        .filter(Material.turma_id == turma_id)
        .order_by(Material.created_at.desc())
        .all()
    )


@router.post("/turmas/{turma_id}/materiais", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_material(
    turma_id: uuid.UUID,
    file: UploadFile = File(...),
    nome: str | None = Form(None),
    is_modelo: bool = Form(True),
    current_user: User = Depends(require_professor),
    db: Session = Depends(get_db),
):
    turma = _get_turma_or_404(turma_id, db)
    if turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Turma não encontrada")

    original_name = os.path.basename(file.filename or "arquivo")
    extensao = os.path.splitext(original_name)[1].lower()
    if extensao not in settings.allowed_upload_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não permitido: {extensao or '(sem extensão)'}",
        )

    conteudo = await file.read()
    tamanho_mb = len(conteudo) / (1024 * 1024)
    if tamanho_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Arquivo excede o limite de {settings.max_upload_size_mb}MB",
        )

    material = Material(
        turma_id=turma_id,
        nome=nome or original_name,
        is_modelo=is_modelo,
        uploaded_by_id=current_user.id,
        arquivo_path="",
    )
    db.add(material)
    db.flush()

    destino_dir = Path(settings.storage_dir) / "materiais" / str(turma_id)
    destino_dir.mkdir(parents=True, exist_ok=True)
    destino_path = destino_dir / f"{material.id}__{original_name}"
    destino_path.write_bytes(conteudo)
    material.arquivo_path = str(destino_path)

    db.commit()
    db.refresh(material)
    return material


@router.get("/materiais/{material_id}/download")
def download_material(
    material_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    material = db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    if not has_turma_access(material.turma, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a este arquivo")
    if not os.path.isfile(material.arquivo_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no servidor")

    nome_arquivo = os.path.basename(material.arquivo_path).split("__", 1)[-1]
    return FileResponse(material.arquivo_path, filename=nome_arquivo)


@router.delete("/materiais/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: uuid.UUID, current_user: User = Depends(require_professor), db: Session = Depends(get_db)
):
    material = db.get(Material, material_id)
    if material is None or material.turma.professor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    if os.path.isfile(material.arquivo_path):
        os.remove(material.arquivo_path)

    db.delete(material)
    db.commit()
