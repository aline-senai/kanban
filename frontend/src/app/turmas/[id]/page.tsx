"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Grupo, type User } from "@/lib/api";

export default function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoAlunoNome, setNovoAlunoNome] = useState("");
  const [novoAlunoEmail, setNovoAlunoEmail] = useState("");
  const [novoAlunoSenha, setNovoAlunoSenha] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    // Gestão de grupos e integrantes é exclusiva do professor (RBAC seção 3 do backlog).
    if (user && user.role !== "professor") router.push(`/turmas/${turmaId}/quadro`);
  }, [user, turmaId, router]);

  async function loadAll() {
    setFetching(true);
    try {
      const [gruposData, alunosData] = await Promise.all([
        api.listGrupos(turmaId),
        api.listAlunos(),
      ]);
      setGrupos(gruposData);
      setAlunos(alunosData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar dados da turma");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, turmaId]);

  function alunosDisponiveis(): User[] {
    const idsEmGrupo = new Set(grupos.flatMap((g) => g.membros.map((m) => m.user.id)));
    return alunos.filter((a) => !idsEmGrupo.has(a.id));
  }

  async function handleCreateGrupo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoGrupoNome.trim()) return;
    setError(null);
    try {
      const grupo = await api.createGrupo(turmaId, novoGrupoNome.trim());
      setGrupos((prev) => [...prev, grupo]);
      setNovoGrupoNome("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar grupo");
    }
  }

  async function handleCreateAluno(e: React.FormEvent) {
    e.preventDefault();
    if (!novoAlunoNome.trim() || !novoAlunoEmail.trim() || !novoAlunoSenha.trim()) return;
    setError(null);
    try {
      const aluno = await api.createAluno(novoAlunoNome.trim(), novoAlunoEmail.trim(), novoAlunoSenha);
      setAlunos((prev) => [...prev, aluno]);
      setNovoAlunoNome("");
      setNovoAlunoEmail("");
      setNovoAlunoSenha("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar aluno");
    }
  }

  async function handleAddMembro(grupoId: string, userId: string) {
    if (!userId) return;
    setError(null);
    try {
      const grupo = await api.addMembro(grupoId, userId, false);
      setGrupos((prev) => prev.map((g) => (g.id === grupo.id ? grupo : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar integrante");
    }
  }

  async function handleToggleGestor(grupoId: string, userId: string, isGestor: boolean) {
    setError(null);
    try {
      const grupo = await api.updateMembro(grupoId, userId, !isGestor);
      setGrupos((prev) => prev.map((g) => (g.id === grupo.id ? grupo : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar gestor");
    }
  }

  async function handleRemoveMembro(grupoId: string, userId: string) {
    setError(null);
    try {
      const grupo = await api.removeMembro(grupoId, userId);
      setGrupos((prev) => prev.map((g) => (g.id === grupo.id ? grupo : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover integrante");
    }
  }

  if (loading || !user || user.role !== "professor") return null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/turmas" className="text-sm underline">
          ← Minhas turmas
        </Link>
        <div className="flex gap-4">
          <Link href={`/turmas/${turmaId}/relatorios`} className="text-sm underline">
            Relatórios
          </Link>
          <Link href={`/turmas/${turmaId}/quadro`} className="text-sm underline">
            Quadro Kanban →
          </Link>
        </div>
      </div>

      <h1 className="text-xl font-semibold">Grupos da turma</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">Criar novo grupo</h2>
        <form onSubmit={handleCreateGrupo} className="flex gap-2">
          <input
            value={novoGrupoNome}
            onChange={(e) => setNovoGrupoNome(e.target.value)}
            placeholder="Nome do grupo"
            className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Criar grupo
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">Cadastrar novo aluno</h2>
        <form onSubmit={handleCreateAluno} className="grid gap-2 sm:grid-cols-3">
          <input
            value={novoAlunoNome}
            onChange={(e) => setNovoAlunoNome(e.target.value)}
            placeholder="Nome"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <input
            value={novoAlunoEmail}
            onChange={(e) => setNovoAlunoEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <input
            value={novoAlunoSenha}
            onChange={(e) => setNovoAlunoSenha(e.target.value)}
            placeholder="Senha inicial"
            type="password"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <button
            type="submit"
            className="sm:col-span-3 rounded-md border border-black/15 py-2 text-sm font-medium dark:border-white/15"
          >
            Cadastrar aluno
          </button>
        </form>
      </section>

      {fetching ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Nenhum grupo criado ainda.</p>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <section key={grupo.id} className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
              <h3 className="font-medium">{grupo.nome}</h3>

              {grupo.membros.length === 0 ? (
                <p className="text-sm text-black/60 dark:text-white/60">Sem integrantes ainda.</p>
              ) : (
                <ul className="divide-y divide-black/10 dark:divide-white/10">
                  {grupo.membros.map((membro) => (
                    <li key={membro.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {membro.user.name}
                        {membro.is_gestor && (
                          <span className="ml-2 rounded bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
                            gestor
                          </span>
                        )}
                      </span>
                      <span className="flex gap-3">
                        <button
                          onClick={() => handleToggleGestor(grupo.id, membro.user.id, membro.is_gestor)}
                          className="underline"
                        >
                          {membro.is_gestor ? "Remover gestor" : "Tornar gestor"}
                        </button>
                        <button
                          onClick={() => handleRemoveMembro(grupo.id, membro.user.id)}
                          className="underline"
                        >
                          Remover
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <AddMembroForm
                grupoId={grupo.id}
                alunos={alunosDisponiveis()}
                onAdd={handleAddMembro}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMembroForm({
  grupoId,
  alunos,
  onAdd,
}: {
  grupoId: string;
  alunos: User[];
  onAdd: (grupoId: string, userId: string) => void;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="flex gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
      >
        <option value="">
          {alunos.length === 0 ? "Nenhum aluno disponível" : "Selecionar aluno..."}
        </option>
        {alunos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          onAdd(grupoId, selected);
          setSelected("");
        }}
        disabled={!selected}
        className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/15"
      >
        Adicionar
      </button>
    </div>
  );
}
