"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarGrupos } from "@/lib/permissions";
import { getEstagioFinalId } from "@/lib/atividade-status";
import { Avatar } from "@/components/Avatar";
import { api, ApiError, type User } from "@/lib/api";

const ESTAGIO_CORES_DEFAULT = ["bg-slate-400", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];

export default function EquipePage() {
  const {
    turmaId,
    estagios,
    grupos,
    outrasTurmas,
    atividades,
    createEstagio,
    updateEstagio,
    deleteEstagio,
    reorderEstagios,
    duplicarEstagios,
    createGrupo,
    addMembro,
    toggleGestor,
    removeMembro,
  } = useTurmaBoard();
  const { effectiveRole } = useViewAs();
  const podeGerenciar = podeGerenciarGrupos(effectiveRole);

  const [alunos, setAlunos] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoGrupoDescricao, setNovoGrupoDescricao] = useState("");
  const [novoAlunoNome, setNovoAlunoNome] = useState("");
  const [novoAlunoEmail, setNovoAlunoEmail] = useState("");
  const [novoAlunoSenha, setNovoAlunoSenha] = useState("");

  const [novoEstagioNome, setNovoEstagioNome] = useState("");
  const [novoEstagioConclusao, setNovoEstagioConclusao] = useState(false);
  const [origemDuplicar, setOrigemDuplicar] = useState("");

  useEffect(() => {
    if (!podeGerenciar) return;
    api
      .listAlunos()
      .then(setAlunos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar alunos"));
  }, [podeGerenciar]);

  const estagioFinalId = getEstagioFinalId(estagios);

  function abertasPorUsuario(userId: string) {
    return atividades.filter((a) => a.responsaveis.some((r) => r.id === userId) && a.estagio_id !== estagioFinalId)
      .length;
  }

  function alunosDisponiveis(): User[] {
    const idsEmGrupo = new Set(grupos.flatMap((g) => g.membros.map((m) => m.user.id)));
    return alunos.filter((a) => !idsEmGrupo.has(a.id));
  }

  async function handleCreateGrupo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoGrupoNome.trim()) return;
    setError(null);
    try {
      await createGrupo(novoGrupoNome.trim(), novoGrupoDescricao.trim() || undefined);
      setNovoGrupoNome("");
      setNovoGrupoDescricao("");
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

  async function handleCreateEstagio(e: React.FormEvent) {
    e.preventDefault();
    if (!novoEstagioNome.trim()) return;
    setError(null);
    try {
      await createEstagio(novoEstagioNome.trim(), novoEstagioConclusao);
      setNovoEstagioNome("");
      setNovoEstagioConclusao(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar estágio");
    }
  }

  async function handleRenameEstagio(estagio: (typeof estagios)[number]) {
    const novoNome = window.prompt("Novo nome do estágio", estagio.nome);
    if (!novoNome || !novoNome.trim() || novoNome === estagio.nome) return;
    setError(null);
    try {
      await updateEstagio(estagio.id, { nome: novoNome.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao renomear estágio");
    }
  }

  async function handleToggleConclusao(estagio: (typeof estagios)[number]) {
    setError(null);
    try {
      await updateEstagio(estagio.id, { is_conclusao: !estagio.is_conclusao });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar estágio");
    }
  }

  async function handleDeleteEstagio(estagio: (typeof estagios)[number]) {
    if (!window.confirm(`Remover o estágio "${estagio.nome}"?`)) return;
    setError(null);
    try {
      await deleteEstagio(estagio.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover estágio");
    }
  }

  async function handleMoveEstagio(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= estagios.length) return;
    const reordenados = [...estagios];
    [reordenados[index], reordenados[target]] = [reordenados[target], reordenados[index]];
    setError(null);
    try {
      await reorderEstagios(reordenados.map((e) => e.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao reordenar estágios");
    }
  }

  async function handleDuplicar(e: React.FormEvent) {
    e.preventDefault();
    if (!origemDuplicar) return;
    setError(null);
    try {
      await duplicarEstagios(origemDuplicar);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao duplicar estágios");
    }
  }

  return (
    <div className="space-y-8">
      {podeGerenciar && (
        <div className="flex justify-end">
          <Link href={`/turmas/${turmaId}/relatorios`} className="text-sm underline">
            Relatórios →
          </Link>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {podeGerenciar && (
        <section className="grid gap-4 sm:grid-cols-2">
          <form
            onSubmit={handleCreateGrupo}
            className="space-y-2 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">Criar novo grupo</h2>
            <input
              value={novoGrupoNome}
              onChange={(e) => setNovoGrupoNome(e.target.value)}
              placeholder="Nome do grupo"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <input
              value={novoGrupoDescricao}
              onChange={(e) => setNovoGrupoDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Criar grupo
            </button>
          </form>

          <form
            onSubmit={handleCreateAluno}
            className="space-y-2 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">Cadastrar novo aluno</h2>
            <input
              value={novoAlunoNome}
              onChange={(e) => setNovoAlunoNome(e.target.value)}
              placeholder="Nome"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <input
              value={novoAlunoEmail}
              onChange={(e) => setNovoAlunoEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <input
              value={novoAlunoSenha}
              onChange={(e) => setNovoAlunoSenha(e.target.value)}
              placeholder="Senha inicial"
              type="password"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/15"
            >
              Cadastrar aluno
            </button>
          </form>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => (
          <div key={grupo.id} className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{grupo.nome}</h3>
                {grupo.descricao && (
                  <p className="text-xs text-black/50 dark:text-white/50">{grupo.descricao}</p>
                )}
              </div>
              <span className="whitespace-nowrap rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {grupo.membros.length} integrante{grupo.membros.length === 1 ? "" : "s"}
              </span>
            </div>

            {grupo.membros.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">Sem integrantes ainda.</p>
            ) : (
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {grupo.membros.map((membro) => (
                  <li key={membro.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Avatar id={membro.user.id} name={membro.user.name} />
                      <span>
                        <span className="flex items-center gap-1.5">
                          {membro.user.name}
                          {membro.is_gestor && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              GESTOR
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-black/50 dark:text-white/50">{membro.user.email}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {abertasPorUsuario(membro.user.id)} abertas
                      </span>
                      {podeGerenciar && (
                        <span className="flex gap-2 text-xs">
                          <button onClick={() => toggleGestor(grupo.id, membro.user.id, membro.is_gestor)} className="underline">
                            {membro.is_gestor ? "remover gestor" : "tornar gestor"}
                          </button>
                          <button onClick={() => removeMembro(grupo.id, membro.user.id)} className="underline">
                            remover
                          </button>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {podeGerenciar && (
              <AddMembroForm grupoId={grupo.id} alunos={alunosDisponiveis()} onAdd={addMembro} />
            )}
          </div>
        ))}
      </section>

      {podeGerenciar && estagios.length === 0 && outrasTurmas.length > 0 && (
        <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
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

      <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
        <div>
          <h2 className="text-sm font-semibold">Estágios do quadro</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            Definidos pelo professor{podeGerenciar ? " · use mover ↑/↓ para reordenar" : ""}
          </p>
        </div>

        {podeGerenciar && (
          <form onSubmit={handleCreateEstagio} className="flex flex-wrap items-center gap-2">
            <input
              value={novoEstagioNome}
              onChange={(e) => setNovoEstagioNome(e.target.value)}
              placeholder="Nome do estágio"
              className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={novoEstagioConclusao}
                onChange={(e) => setNovoEstagioConclusao(e.target.checked)}
              />
              Estágio de aprovação/conclusão
            </label>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Adicionar
            </button>
          </form>
        )}

        {estagios.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Nenhum estágio criado ainda.</p>
        ) : (
          <ul className="space-y-1">
            {estagios.map((estagio, index) => {
              const cor = estagio.cor ?? ESTAGIO_CORES_DEFAULT[index % ESTAGIO_CORES_DEFAULT.length];
              const isFinal = estagio.id === estagioFinalId;
              const isAprovacao = estagio.is_conclusao && !isFinal;
              const totalCards = atividades.filter((a) => a.estagio_id === estagio.id).length;
              return (
                <li
                  key={estagio.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-black/40 dark:text-white/40">{index + 1}</span>
                    <span className={`h-2 w-2 rounded-full ${cor}`} />
                    {podeGerenciar ? (
                      <button onClick={() => handleRenameEstagio(estagio)} className="font-medium hover:underline">
                        {estagio.nome}
                      </button>
                    ) : (
                      <span className="font-medium">{estagio.nome}</span>
                    )}
                    {isAprovacao && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        APROVAÇÃO
                      </span>
                    )}
                    {isFinal && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        FINAL
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="text-black/50 dark:text-white/50">{totalCards} cards</span>
                    {podeGerenciar && (
                      <span className="flex gap-2">
                        <button onClick={() => handleMoveEstagio(index, -1)} disabled={index === 0} className="underline disabled:opacity-30">
                          ↑ mover
                        </button>
                        <button
                          onClick={() => handleMoveEstagio(index, 1)}
                          disabled={index === estagios.length - 1}
                          className="underline disabled:opacity-30"
                        >
                          ↓ mover
                        </button>
                        <button onClick={() => handleToggleConclusao(estagio)} className="underline">
                          {estagio.is_conclusao ? "desmarcar aprovação" : "marcar aprovação"}
                        </button>
                        <button onClick={() => handleDeleteEstagio(estagio)} className="underline">
                          remover
                        </button>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
        <option value="">{alunos.length === 0 ? "Nenhum aluno disponível" : "Selecionar aluno..."}</option>
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
