import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.atividade import Atividade, AtividadeResponsavel
from app.models.estagio import Estagio
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.user import User


def notificar_atribuicao(db: Session, atividade: Atividade, responsavel_ids: list[uuid.UUID]) -> None:
    """RF28: avisa quem foi atribuído como responsável por uma atividade."""
    if not responsavel_ids:
        return
    usuarios = {
        u.id: u for u in db.query(User).filter(User.id.in_(responsavel_ids), User.notif_atribuicao.is_(True)).all()
    }
    for user_id in responsavel_ids:
        if user_id not in usuarios:
            continue
        db.add(
            Notificacao(
                user_id=user_id,
                atividade_id=atividade.id,
                tipo=NotificacaoTipo.ATRIBUICAO,
                texto=f'Você foi atribuído à atividade "{atividade.nome}".',
            )
        )


def _mencionados_no_texto(texto: str, membros) -> set[uuid.UUID]:
    texto_lower = texto.lower()
    mencionados = set()
    for membro in membros:
        primeiro_nome = membro.user.name.split()[0].lower()
        if f"@{primeiro_nome}" in texto_lower:
            mencionados.add(membro.user.id)
    return mencionados


def notificar_comentario(db: Session, atividade: Atividade, autor: User, texto: str) -> None:
    """RF24 (menções) + RF30 (novo comentário para responsáveis/criador)."""
    membros = atividade.grupo.membros
    mencionados = _mencionados_no_texto(texto, membros) - {autor.id}

    for user_id in mencionados:
        db.add(
            Notificacao(
                user_id=user_id,
                atividade_id=atividade.id,
                tipo=NotificacaoTipo.MENCAO,
                texto=f'{autor.name} mencionou você em um comentário na atividade "{atividade.nome}".',
            )
        )

    interessados = {r.user_id for r in atividade.responsaveis} | {atividade.criador_id}
    destinatarios_comentario = interessados - {autor.id} - mencionados
    if destinatarios_comentario:
        destinatarios_comentario = {
            u.id
            for u in db.query(User)
            .filter(User.id.in_(destinatarios_comentario), User.notif_comentario.is_(True))
            .all()
        }

    for user_id in destinatarios_comentario:
        db.add(
            Notificacao(
                user_id=user_id,
                atividade_id=atividade.id,
                tipo=NotificacaoTipo.COMENTARIO,
                texto=f'{autor.name} comentou na atividade "{atividade.nome}".',
            )
        )


def gerar_notificacoes_prazo_proximo(db: Session, user: User, janela_horas: int = 48) -> None:
    """RF29: gera (uma única vez por atividade) um aviso de prazo próximo do vencimento.

    Sem infraestrutura de cron neste MVP, a checagem roda de forma preguiçosa (lazy)
    sempre que o usuário consulta suas notificações.
    """
    if not user.notif_prazo:
        return

    agora = datetime.now(timezone.utc)
    limite = agora + timedelta(hours=janela_horas)

    atividades = (
        db.query(Atividade)
        .join(AtividadeResponsavel, AtividadeResponsavel.atividade_id == Atividade.id)
        .filter(
            AtividadeResponsavel.user_id == user.id,
            Atividade.data_fim.isnot(None),
            Atividade.data_fim >= agora,
            Atividade.data_fim <= limite,
        )
        .all()
    )

    for atividade in atividades:
        max_ordem = (
            db.query(Estagio.ordem)
            .filter(Estagio.turma_id == atividade.grupo.turma_id)
            .order_by(Estagio.ordem.desc())
            .first()
        )
        if max_ordem is not None and atividade.estagio.ordem == max_ordem[0]:
            continue  # já está no estágio final, não precisa alertar

        ja_notificado = (
            db.query(Notificacao)
            .filter(
                Notificacao.user_id == user.id,
                Notificacao.atividade_id == atividade.id,
                Notificacao.tipo == NotificacaoTipo.PRAZO_PROXIMO,
            )
            .first()
        )
        if ja_notificado is not None:
            continue

        db.add(
            Notificacao(
                user_id=user.id,
                atividade_id=atividade.id,
                tipo=NotificacaoTipo.PRAZO_PROXIMO,
                texto=f'O prazo da atividade "{atividade.nome}" vence em breve.',
            )
        )

    db.commit()
