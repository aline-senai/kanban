"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Estagio, type Turma } from "@/lib/api";

export default function QuadroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [outrasTurmas, setOutrasTurmas] = useState<Turma[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoIsConclusao, setNovoIsConclusao] = useState(false);
  const [origemDuplicar, setOrigemDuplicar] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  async function loadAll() {
    setFetching(true);
    try {
      const [estagiosData, turmasData] = await Promise.all([
        api.listEstagios(turmaId),
        api.listTurmas(),
      ]);
      setEstagios(estagiosData);
      setOutrasTurmas(turmasData.filter((t) => t.id !== turmaId));
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

  if (loading || !user) return null;

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

      {estagios.length === 0 && outrasTurmas.length > 0 && (
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
              className="w-64 shrink-0 rounded-lg border border-black/10 p-3 dark:border-white/10"
            >
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => handleRename(estagio)} className="text-left text-sm font-medium hover:underline">
                  {estagio.nome}
                </button>
                {estagio.is_conclusao && (
                  <span className="rounded bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
                    aprovação
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
