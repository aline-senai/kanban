"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { ROLE_LABEL, useViewAs, type EffectiveRole } from "@/lib/view-as-context";
import { podeGerenciarAtividades } from "@/lib/permissions";
import { sprintAtualRange, formatCurto, cronogramaRestante } from "@/lib/cronograma";
import { ApiError, type Prioridade } from "@/lib/api";
import { Avatar } from "./Avatar";
import { NotificationsBell } from "./NotificationsBell";

const NAV_ITEMS = [
  { slug: "quadro", label: "Quadro" },
  { slug: "lista", label: "Lista" },
  { slug: "sprints", label: "Sprints" },
  { slug: "cronograma", label: "Cronograma" },
  { slug: "equipe", label: "Equipe e grupos" },
  { slug: "materiais", label: "Materiais" },
  { slug: "conta", label: "Minha conta" },
] as const;

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  quadro: { title: "Quadro da turma", subtitle: "Arraste os cards entre os estágios" },
  lista: { title: "Lista de atividades", subtitle: "Ordenada por prazo · clique para abrir o detalhe" },
  sprints: { title: "Sprints", subtitle: "Planning, review e atividades de cada sprint" },
  cronograma: { title: "Cronograma", subtitle: "Linha do tempo das sprints" },
  equipe: { title: "Equipe e grupos", subtitle: "Grupos, gestores e estágios do quadro" },
  materiais: { title: "Materiais", subtitle: "Pasta da turma com os arquivos modelo" },
  conta: { title: "Minha conta", subtitle: "Dados de acesso e preferências de notificação" },
  relatorios: { title: "Relatórios", subtitle: "Conclusão por grupo e atividades atrasadas" },
};

export function AppShell({ turmaId, children }: { turmaId: string; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { turma, grupos, atividades } = useTurmaBoard();
  const { effectiveRole, allowedRoles, setEffectiveRole } = useViewAs();
  const [novaAtividadeAberta, setNovaAtividadeAberta] = useState(false);

  if (!user) return null;

  const slugAtivo = pathname.split("/").pop() ?? "quadro";
  const meta = PAGE_META[slugAtivo] ?? PAGE_META.quadro;
  const totalMembros = grupos.reduce((acc, g) => acc + g.membros.length, 0);
  const restante = turma ? cronogramaRestante(turma) : null;
  const sprintAtual = turma ? sprintAtualRange(turma) : null;
  const meuGrupo = grupos.find((g) => g.membros.some((m) => m.user.id === user.id));

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-black/10 bg-white p-4 print:hidden dark:border-white/10 dark:bg-slate-900">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-600" />
            <span className="font-semibold">Quadro SENAI</span>
          </div>

          {turma && (
            <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
              <p className="font-medium uppercase tracking-wide text-black/50 dark:text-white/50">Turma</p>
              <p className="mt-1 text-sm font-semibold">{turma.nome}</p>
              {sprintAtual && (
                <p className="mt-1 text-black/60 dark:text-white/60">
                  Sprint {turma.sprint_atual} · {formatCurto(sprintAtual.inicio)}–{formatCurto(sprintAtual.fim)}
                </p>
              )}
            </div>
          )}

          <nav className="space-y-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const ativo = item.slug === slugAtivo;
              const count =
                item.slug === "quadro" || item.slug === "lista"
                  ? atividades.length
                  : item.slug === "cronograma"
                    ? restante
                      ? `${restante.semanas} sem`
                      : null
                    : item.slug === "equipe"
                      ? totalMembros
                      : null;
              return (
                <Link
                  key={item.slug}
                  href={`/turmas/${turmaId}/${item.slug}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 ${
                    ativo
                      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                  }`}
                >
                  <span>{item.label}</span>
                  {count != null && <span className="text-xs text-black/40 dark:text-white/40">{count}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-black/10 pt-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Avatar id={user.id} name={user.name} size="md" />
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-black/50 dark:text-white/50">
                {ROLE_LABEL[effectiveRole]}
                {meuGrupo ? ` · ${meuGrupo.nome}` : ""}
              </p>
            </div>
          </div>
          <button onClick={logout} className="text-xs underline">
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-6 py-4 print:hidden dark:border-white/10 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold">{meta.title}</h1>
            <p className="text-sm text-black/50 dark:text-white/50">{meta.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-black/50 dark:text-white/50">Ver como</span>
              <select
                value={effectiveRole}
                onChange={(e) => setEffectiveRole(e.target.value as EffectiveRole)}
                className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              >
                {allowedRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <NotificationsBell />
            {podeGerenciarAtividades(effectiveRole) && grupos.length > 0 && (
              <button
                onClick={() => setNovaAtividadeAberta(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Nova atividade
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {novaAtividadeAberta && <NovaAtividadeModal onClose={() => setNovaAtividadeAberta(false)} />}
    </div>
  );
}

function NovaAtividadeModal({ onClose }: { onClose: () => void }) {
  const { grupos, estagios, sprints, createAtividade } = useTurmaBoard();
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [estagioId, setEstagioId] = useState(estagios[0]?.id ?? "");
  const [nome, setNome] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [estimativa, setEstimativa] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const grupoAtual = grupos.find((g) => g.id === grupoId);

  function toggleResponsavel(userId: string) {
    setResponsaveis((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !grupoId || !estagioId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createAtividade(grupoId, {
        estagio_id: estagioId,
        nome: nome.trim(),
        prioridade,
        estimativa_horas: estimativa ? Number(estimativa) : null,
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
        sprint_id: sprintId || null,
        responsavel_ids: responsaveis,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar atividade");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg bg-background p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nova atividade</h2>
          <button type="button" onClick={onClose} className="text-sm underline">
            Fechar
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {grupos.length > 1 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Grupo</label>
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            >
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Estágio</label>
            <select
              value={estagioId}
              onChange={(e) => setEstagioId(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            >
              {estagios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as Prioridade)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Prazo</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Estimativa (h)</label>
            <input
              type="number"
              min={0}
              value={estimativa}
              onChange={(e) => setEstimativa(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
        </div>

        {sprints.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Sprint</label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            >
              <option value="">Nenhuma</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {grupoAtual && grupoAtual.membros.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Responsáveis</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {grupoAtual.membros.map((m) => (
                <label key={m.user.id} className="flex items-center gap-1.5 rounded-md border border-black/10 px-2 py-1 dark:border-white/10">
                  <input
                    type="checkbox"
                    checked={responsaveis.includes(m.user.id)}
                    onChange={() => toggleResponsavel(m.user.id)}
                  />
                  <Avatar id={m.user.id} name={m.user.name} />
                  {m.user.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !nome.trim() || !grupoId || !estagioId}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Criando..." : "Criar atividade"}
        </button>
      </form>
    </div>
  );
}
