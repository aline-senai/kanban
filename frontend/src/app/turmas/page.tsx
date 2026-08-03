"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Turma } from "@/lib/api";

export default function TurmasPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api
      .listTurmas()
      .then(setTurmas)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar turmas"))
      .finally(() => setFetching(false));
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const turma = await api.createTurma(novoNome.trim());
      setTurmas((prev) => [turma, ...prev]);
      setNovoNome("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar turma");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleArquivada(turma: Turma) {
    try {
      const updated = await api.updateTurma(turma.id, { arquivada: !turma.arquivada });
      setTurmas((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar turma");
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Minhas turmas</h1>
        <button onClick={logout} className="text-sm underline">
          Sair
        </button>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome da nova turma"
          className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {creating ? "Criando..." : "Criar turma"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {fetching ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : turmas.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Nenhuma turma criada ainda.</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {turmas.map((turma) => (
            <li key={turma.id} className="flex items-center justify-between py-3">
              <span className={turma.arquivada ? "line-through opacity-60" : ""}>{turma.nome}</span>
              <button onClick={() => handleToggleArquivada(turma)} className="text-sm underline">
                {turma.arquivada ? "Desarquivar" : "Arquivar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
