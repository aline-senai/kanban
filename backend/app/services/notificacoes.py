import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.atividade import Atividade, AtividadeResponsavel
from app.models.estagio import Estagio
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.user import User
from app.services.email import enviar_email, montar_email_html


def _link_atividade(atividade: Atividade) -> str:
    turma_id = atividade.grupo.turma_id
    return f"{settings.frontend_url}/turmas/{turma_id}/quadro"


def _estagio_e_final(db: Session, atividade: Atividade) -> bool:
    max_ordem = (
        db.query(Estagio.ordem)
        .filter(Estagio.turma_id == atividade.grupo.turma_id)
        .order_by(Estagio.ordem.desc())
        .first()
    )
    return max_ordem is not None and atividade.estagio.ordem == max_ordem[0]


def notificar_atribuicao(db: Session, atividade: Atividade, responsavel_ids: list[uuid.UUID]) -> None:
    """RF28: avisa quem foi atribuído como responsável por uma atividade (in-app + e-mail)."""
    if not responsavel_ids:
        return
    usuarios = {
        u.id: u for u in db.query(User).filter(User.id.in_(responsavel_ids), User.notif_atribuicao.is_(True)).all()
    }
    link = _link_atividade(atividade)
    for user_id in responsavel_ids:
        usuario = usuarios.get(user_id)
        if usuario is None:
            continue
        db.add(
            Notificacao(
                user_id=user_id,
                atividade_id=atividade.id,
                tipo=NotificacaoTipo.ATRIBUICAO,
                texto=f'Você foi atribuído à atividade "{atividade.nome}".',
            )
        )
        paragrafos = [
            f"Olá, {usuario.name}.",
            f'Você foi atribuído(a) como responsável pela atividade "{atividade.nome}".',
        ]
        if atividade.data_fim is not None:
            paragrafos.append(f"Prazo: {atividade.data_fim.strftime('%d/%m/%Y')}.")
        enviar_email(
            usuario.email,
            f'Nova atividade: "{atividade.nome}" — Quadro SENAI',
            "\n".join(paragrafos) + f"\n\nAbra no app: {link}",
            montar_email_html("Nova atividade atribuída a você", paragrafos, cta_texto="Abrir atividade", cta_url=link),
        )


def _normalizar(texto: str) -> str:
    """Remove acentos e caixa para permitir mencionar sem digitar o nome exatamente
    (ex: "@Joao" deve encontrar "João")."""
    sem_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return sem_acentos.lower()


def _mencionados_no_texto(texto: str, membros) -> set[uuid.UUID]:
    texto_normalizado = _normalizar(texto)
    mencionados = set()
    for membro in membros:
        primeiro_nome = _normalizar(membro.user.name.split()[0])
        if not primeiro_nome:
            continue
        if re.search(rf"@{re.escape(primeiro_nome)}\b", texto_normalizado):
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
        if _estagio_e_final(db, atividade):
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


def notificar_atividades_vencendo_hoje(db: Session) -> int:
    """Envia e-mail (uma única vez por atividade+responsável) para quem tem uma atividade
    com prazo para hoje. Diferente de `gerar_notificacoes_prazo_proximo` (que roda de forma
    preguiçosa, só quando o usuário abre as notificações), esta função é pensada para rodar
    uma vez por dia via um agendador externo (ver POST /notificacoes/jobs/vencendo-hoje).

    Retorna quantos e-mails foram enviados.
    """
    agora = datetime.now(timezone.utc)
    inicio_do_dia = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    fim_do_dia = inicio_do_dia + timedelta(days=1)

    atividades = (
        db.query(Atividade)
        .filter(Atividade.data_fim.isnot(None), Atividade.data_fim >= inicio_do_dia, Atividade.data_fim < fim_do_dia)
        .all()
    )

    enviados = 0
    for atividade in atividades:
        if _estagio_e_final(db, atividade):
            continue

        for responsavel in atividade.responsaveis_users:
            if not responsavel.notif_prazo:
                continue

            ja_notificado = (
                db.query(Notificacao)
                .filter(
                    Notificacao.user_id == responsavel.id,
                    Notificacao.atividade_id == atividade.id,
                    Notificacao.tipo == NotificacaoTipo.PRAZO_HOJE,
                )
                .first()
            )
            if ja_notificado is not None:
                continue

            db.add(
                Notificacao(
                    user_id=responsavel.id,
                    atividade_id=atividade.id,
                    tipo=NotificacaoTipo.PRAZO_HOJE,
                    texto=f'O prazo da atividade "{atividade.nome}" vence hoje.',
                )
            )
            paragrafos = [
                f"Olá, {responsavel.name}.",
                f'A atividade "{atividade.nome}" vence hoje, {agora.strftime("%d/%m/%Y")}.',
            ]
            link = _link_atividade(atividade)
            enviar_email(
                responsavel.email,
                f'Vence hoje: "{atividade.nome}" — Quadro SENAI',
                "\n".join(paragrafos) + f"\n\nAbra no app: {link}",
                montar_email_html("Atividade vence hoje", paragrafos, cta_texto="Abrir atividade", cta_url=link),
            )
            enviados += 1

    db.commit()
    return enviados
