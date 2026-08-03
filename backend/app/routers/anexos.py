import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import is_member_or_manager
from app.models.anexo import Anexo, AnexoVersao
from app.models.atividade import Atividade
from app.models.user import User
from app.schemas.anexo import AnexoOut

router = APIRouter(tags=["anexos"])


def _get_atividade_or_404(atividade_id: uuid.UUID, db: Session) -> Atividade:
    atividade = db.get(Atividade, atividade_id)
    if atividade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
    return atividade


@router.get("/atividades/{atividade_id}/anexos", response_model=list[AnexoOut])
def list_anexos(
    atividade_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a esta atividade")
    return db.query(Anexo).filter(Anexo.atividade_id == atividade_id).order_by(Anexo.created_at).all()


@router.post("/atividades/{atividade_id}/anexos", response_model=AnexoOut, status_code=status.HTTP_201_CREATED)
async def upload_anexo(
    atividade_id: uuid.UUID,
    file: UploadFile = File(...),
    nome_referencia: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    atividade = _get_atividade_or_404(atividade_id, db)
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Apenas integrantes do grupo podem anexar arquivos"
        )

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

    referencia = nome_referencia or original_name
    anexo = (
        db.query(Anexo)
        .filter(Anexo.atividade_id == atividade_id, Anexo.nome_referencia == referencia)
        .first()
    )
    if anexo is None:
        anexo = Anexo(atividade_id=atividade_id, nome_referencia=referencia)
        db.add(anexo)
        db.flush()

    proxima_versao = len(anexo.versoes) + 1

    destino_dir = Path(settings.storage_dir) / "anexos" / str(atividade_id) / str(anexo.id)
    destino_dir.mkdir(parents=True, exist_ok=True)
    destino_path = destino_dir / f"v{proxima_versao}__{original_name}"
    destino_path.write_bytes(conteudo)

    versao = AnexoVersao(
        anexo_id=anexo.id,
        versao_numero=proxima_versao,
        arquivo_path=str(destino_path),
        uploaded_by_id=current_user.id,
    )
    db.add(versao)
    db.commit()
    db.refresh(anexo)
    return anexo


@router.get("/anexo-versoes/{versao_id}/download")
def download_versao(
    versao_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    versao = db.get(AnexoVersao, versao_id)
    if versao is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão não encontrada")

    atividade = versao.anexo.atividade
    if not is_member_or_manager(atividade.grupo, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem acesso a este arquivo")

    if not os.path.isfile(versao.arquivo_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no servidor")

    return FileResponse(versao.arquivo_path, filename=versao.nome_arquivo)
