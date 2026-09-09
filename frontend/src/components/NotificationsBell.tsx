"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SenhaTemporariaModal } from "@/components/SenhaTemporariaModal";
import { api, type Notificacao } from "@/lib/api";

const TIPO_LABEL: Record<Notificacao["tipo"], string> = {
  atribuicao: "Atribuição",
  mencao: "Menção",
  comentario: "Comentário",
  prazo_proximo: "Prazo",
  prazo_hoje: "Vence hoje",
  solicitacao_senha: "Redefinir senha",
  solicitacao_professor: "Novo professor",
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [senhaModal, setSenhaModal] = useState<{ nome: string; senha: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    try {
      const dados = await api.listNotificacoes();
      setNotificacoes(dados);
    } catch {
      // silencioso: notificações não são críticas para o uso da página
    }
  }

  useEffect(() => {
    if (!user) return;
    carregar();
    const interval = setInterval(carregar, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarcarLida(notificacao: Notificacao) {
    if (notificacao.lida) return;
    setNotificacoes((prev) => prev.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n)));
    try {
      await api.marcarNotificacaoLida(notificacao.id);
    } catch {
      carregar();
    }
  }

  async function handleAprovarProfessor(notificacao: Notificacao) {
    if (!notificacao.referencia_user_id) return;
    try {
      await api.aprovarProfessor(notificacao.referencia_user_id);
      await handleMarcarLida(notificacao);
    } catch {
      carregar();
    }
  }

  async function handleResetarSenha(notificacao: Notificacao) {
    if (!notificacao.referencia_user_id) return;
    try {
      const { senha_temporaria } = await api.resetSenhaAluno(notificacao.referencia_user_id);
      const nome = notificacao.texto.split(" (")[0];
      setSenhaModal({ nome, senha: senha_temporaria });
      await handleMarcarLida(notificacao);
    } catch {
      carregar();
    }
  }

  async function handleMarcarTodasLidas() {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    try {
      await api.marcarTodasNotificacoesLidas();
    } catch {
      carregar();
    }
  }

  if (!user) return null;

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div ref={containerRef} className="relative">
      {senhaModal && (
        <SenhaTemporariaModal
          nome={senhaModal.nome}
          senha={senhaModal.senha}
          onClose={() => setSenhaModal(null)}
        />
      )}

      <button
        onClick={() => setAberto((prev) => !prev)}
        className="relative rounded-full border border-black/15 bg-background px-3 py-1.5 text-sm dark:border-white/15"
        aria-label="Notificações"
      >
        🔔
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-lg border border-black/10 bg-background p-3 shadow-lg dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {naoLidas > 0 && (
              <button onClick={handleMarcarTodasLidas} className="text-xs underline">
                marcar todas como lidas
              </button>
            )}
          </div>

          {notificacoes.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Nenhuma notificação ainda.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {notificacoes.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-md px-2 py-1.5 text-sm ${n.lida ? "opacity-60" : "bg-black/[.03] dark:bg-white/[.06]"}`}
                >
                  <button onClick={() => handleMarcarLida(n)} className="w-full text-left">
                    <span className="text-xs font-medium text-black/60 dark:text-white/60">
                      {TIPO_LABEL[n.tipo]} · {new Date(n.created_at).toLocaleString("pt-BR")}
                    </span>
                    <p>{n.texto}</p>
                  </button>
                  {n.tipo === "solicitacao_professor" && n.referencia_user_id && (
                    <button
                      onClick={() => handleAprovarProfessor(n)}
                      className="mt-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white"
                    >
                      Aprovar professor
                    </button>
                  )}
                  {n.tipo === "solicitacao_senha" && n.referencia_user_id && (
                    <button
                      onClick={() => handleResetarSenha(n)}
                      className="mt-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white"
                    >
                      Resetar senha
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
