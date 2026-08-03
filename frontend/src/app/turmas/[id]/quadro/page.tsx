"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Atividade, type Estagio, type Grupo, type Turma } from "@/lib/api";

export default function QuadroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [outrasTurmas, setOutrasTurmas] = useState<Turma[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("");
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoIsConclusao, setNovoIsConclusao] = useState(false);
  const [origemDuplicar, setOrigemDuplicar] = useState("");
  const [novaAtividadeEstagio, setNovaAtividadeEstagio] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  async function loadAll() {
    setFetching(true);
    try {
      const [estagiosData, turmasData, gruposData] = await Promise.all([
        api.listEstagios(turmaId),
        api.listTurmas(),
        api.listGrupos(turmaId),
      ]);
      setEstagios(estagiosData);
      setOutrasTurmas(turmasData.filter((t) => t.id !== turmaId));
      setGrupos(gruposData);
      setGrupoSelecionado((prev) => prev || gruposData[0]?.id || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar o quadro");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, turmaId]);

  useEffect(() => {
    if (!grupoSelecionado) {
      setAtividades([]);
      return;
    }
    api
      .listAtividades(grupoSelecionado)
      .then(setAtividades)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar atividades"));
  }, [grupoSelecionado]);

  async function handleCreateEstagio(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setError(null);
    try {
      const estagio = await api.createEstagio(turmaId, novoNome.trim(), novoIsConclusao);
      setEstagios((prev) => [...prev, estagio]);
      setNovoNome("");
      setNovoIsConclusao(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar estágio");
    }
  }

  async function handleRename(estagio: Estagio) {
    const novoNomeInput = window.prompt("Novo nome do estágio", estagio.nome);
    if (!novoNomeInput || !novoNomeInput.trim() || novoNomeInput === estagio.nome) return;
    setError(null);
    try {
      const updated = await api.updateEstagio(estagio.id, { nome: novoNomeInput.trim() });
      setEstagios((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao renomear estágio");
    }
  }

  async function handleToggleConclusao(estagio: Estagio) {
    setError(null);
    try {
      const updated = await api.updateEstagio(estagio.id, { is_conclusao: !estagio.is_conclusao });
      setEstagios((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar estágio");
    }
  }

  async function handleDelete(estagio: Estagio) {
    if (!window.confirm(`Remover o estágio "${estagio.nome}"?`)) return;
    setError(null);
    try {
      await api.deleteEstagio(estagio.id);
      setEstagios((prev) => prev.filter((e) => e.id !== estagio.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover estágio");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= estagios.length) return;
    const reordered = [...estagios];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEstagios(reordered);
    setError(null);
    try {
      const updated = await api.reorderEstagios(
        turmaId,
        reordered.map((e) => e.id)
      );
      setEstagios(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao reordenar estágios");
      loadAll();
    }
  }

  async function handleDuplicar(e: React.FormEvent) {
    e.preventDefault();
    if (!origemDuplicar) return;
    setError(null);
    try {
      const estagiosDuplicados = await api.duplicarEstagios(turmaId, origemDuplicar);
      setEstagios(estagiosDuplicados);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao duplicar estágios");
    }
  }

  async function handleCreateAtividade(estagioId: string, nome: string, responsavelIds: string[]) {
    if (!grupoSelecionado || !nome.trim()) return;
    setError(null);
    try {
      const atividade = await api.createAtividade(grupoSelecionado, {
        estagio_id: estagioId,
        nome: nome.trim(),
        responsavel_ids: responsavelIds,
      });
      setAtividades((prev) => [...prev, atividade]);
      setNovaAtividadeEstagio(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar atividade");
    }
  }

  if (loading || !user) return null;

  const grupoAtual = grupos.find((g) => g.id === grupoSelecionado);
  const podeGerenciar =
    user.role === "professor" ||
    grupoAtual?.membros.some((m) => m.user.id === user.id && m.is_gestor) ||
    false;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href={`/turmas/${turmaId}`} className="text-sm underline">
          ← Grupos da turma
        </Link>
        <h1 className="text-xl font-semibold">Quadro Kanban</h1>
        <span />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {grupos.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Grupo:</label>
          <select
            value={grupoSelecionado}
            onChange={(e) => setGrupoSelecionado(e.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          >
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {podeGerenciar && (
        <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-semibold">Adicionar estágio</h2>
          <form onSubmit={handleCreateEstagio} className="flex flex-wrap items-center gap-2">
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do estágio"
              className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={novoIsConclusao}
                onChange={(e) => setNovoIsConclusao(e.target.checked)}
              />
              Estágio de aprovação/conclusão
            </label>
            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Adicionar
            </button>
          </form>
        </section>
      )}

      {podeGerenciar && estagios.length === 0 && outrasTurmas.length > 0 && (
        <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-semibold">Duplicar estágios de outra turma</h2>
          <form onSubmit={handleDuplicar} className="flex gap-2">
            <select
              value={origemDuplicar}
              onChange={(e) => setOrigemDuplicar(e.target.value)}
              className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            >
              <option value="">Selecionar turma de origem...</option>
              {outrasTurmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!origemDuplicar}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/15"
            >
              Duplicar
            </button>
          </form>
        </section>
      )}

      {fetching ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : estagios.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Nenhum estágio criado ainda.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {estagios.map((estagio, index) => (
            <div
              key={estagio.id}
              className="w-72 shrink-0 rounded-lg border border-black/10 p-3 dark:border-white/10"
            >
              <div className="mb-2 flex items-center justify-between">
                {podeGerenciar ? (
                  <button onClick={() => handleRename(estagio)} className="text-left text-sm font-medium hover:underline">
                    {estagio.nome}
                  </button>
                ) : (
                  <span className="text-sm font-medium">{estagio.nome}</span>
                )}
                {estagio.is_conclusao && (
                  <span className="rounded bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
                    aprovação
                  </span>
                )}
              </div>

              {podeGerenciar && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="underline disabled:opacity-30">
                    ← mover
                  </button>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === estagios.length - 1}
                    className="underline disabled:opacity-30"
                  >
                    mover →
                  </button>
                  <button onClick={() => handleToggleConclusao(estagio)} className="underline">
                    {estagio.is_conclusao ? "desmarcar aprovação" : "marcar aprovação"}
                  </button>
                  <button onClick={() => handleDelete(estagio)} className="underline">
                    remover
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {atividades
                  .filter((a) => a.estagio_id === estagio.id)
                  .map((atividade) => (
                    <div
                      key={atividade.id}
                      className="rounded-md border border-black/10 bg-black/[.02] p-2 text-sm dark:border-white/10 dark:bg-white/[.03]"
                    >
                      <p className="font-medium">{atividade.nome}</p>
                      {atividade.data_fim && (
                        <p className="text-xs text-black/60 dark:text-white/60">
                          Prazo: {new Date(atividade.data_fim).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {atividade.responsaveis.length > 0 && (
                        <p className="text-xs text-black/60 dark:text-white/60">
                          {atividade.responsaveis.map((r) => r.name).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
              </div>

              {podeGerenciar && grupoSelecionado && (
                <div className="mt-3">
                  {novaAtividadeEstagio === estagio.id ? (
                    <NovaAtividadeForm
                      membros={grupoAtual?.membros ?? []}
                      onCancel={() => setNovaAtividadeEstagio(null)}
                      onCreate={(nome, responsavelIds) =>
                        handleCreateAtividade(estagio.id, nome, responsavelIds)
                      }
                    />
                  ) : (
                    <button
                      onClick={() => setNovaAtividadeEstagio(estagio.id)}
                      className="text-xs underline"
                    >
                      + Nova atividade
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NovaAtividadeForm({
  membros,
  onCreate,
  onCancel,
}: {
  membros: Grupo["membros"];
  onCreate: (nome: string, responsavelIds: string[]) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);

  function toggleResponsavel(userId: string) {
    setResponsaveis((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-black/10 p-2 dark:border-white/10">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da atividade"
        className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        autoFocus
      />
      {membros.length > 0 && (
        <div className="space-y-1 text-xs">
          {membros.map((m) => (
            <label key={m.user.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={responsaveis.includes(m.user.id)}
                onChange={() => toggleResponsavel(m.user.id)}
              />
              {m.user.name}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onCreate(nome, responsaveis);
            setNome("");
            setResponsaveis([]);
          }}
          disabled={!nome.trim()}
          className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
        >
          Criar
        </button>
        <button onClick={onCancel} className="text-xs underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
