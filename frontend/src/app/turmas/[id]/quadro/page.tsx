"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  type Atividade,
  type ChecklistItem,
  type Estagio,
  type Grupo,
  type Turma,
} from "@/lib/api";

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
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const atividadeId = String(active.id);
    const novoEstagioId = String(over.id);

    const atividade = atividades.find((a) => a.id === atividadeId);
    if (!atividade || atividade.estagio_id === novoEstagioId) return;

    const anterior = atividade.estagio_id;
    setAtividades((prev) =>
      prev.map((a) => (a.id === atividadeId ? { ...a, estagio_id: novoEstagioId } : a))
    );
    setError(null);
    try {
      await api.moverAtividade(atividadeId, novoEstagioId);
    } catch (err) {
      setAtividades((prev) =>
        prev.map((a) => (a.id === atividadeId ? { ...a, estagio_id: anterior } : a))
      );
      setError(err instanceof ApiError ? err.message : "Erro ao mover atividade");
    }
  }

  if (loading || !user) return null;

  const grupoAtual = grupos.find((g) => g.id === grupoSelecionado);
  const podeGerenciar =
    user.role === "professor" ||
    grupoAtual?.membros.some((m) => m.user.id === user.id && m.is_gestor) ||
    false;

  const maxOrdem = estagios.length > 0 ? Math.max(...estagios.map((e) => e.ordem)) : 0;
  const estagioFinalId = estagios.find((e) => e.ordem === maxOrdem)?.id;
  const hoje = new Date();

  function isAtrasada(atividade: Atividade) {
    if (!atividade.data_fim) return false;
    if (atividade.estagio_id === estagioFinalId) return false;
    return new Date(atividade.data_fim) < hoje;
  }

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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {estagios.map((estagio, index) => (
              <ColumnDropZone key={estagio.id} estagioId={estagio.id}>
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
                      <DraggableCard key={atividade.id} atividadeId={atividade.id}>
                        <div
                          onClick={() => setAtividadeSelecionada(atividade)}
                          className={`cursor-pointer rounded-md border p-2 text-sm ${
                            isAtrasada(atividade)
                              ? "border-red-400 bg-red-50 dark:border-red-500/60 dark:bg-red-950/30"
                              : "border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.03]"
                          }`}
                        >
                          <p className="font-medium">{atividade.nome}</p>
                          {atividade.data_fim && (
                            <p
                              className={`text-xs ${
                                isAtrasada(atividade)
                                  ? "font-medium text-red-600 dark:text-red-400"
                                  : "text-black/60 dark:text-white/60"
                              }`}
                            >
                              {isAtrasada(atividade) ? "Atrasada — " : "Prazo: "}
                              {new Date(atividade.data_fim).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                          {atividade.responsaveis.length > 0 && (
                            <p className="text-xs text-black/60 dark:text-white/60">
                              {atividade.responsaveis.map((r) => r.name).join(", ")}
                            </p>
                          )}
                        </div>
                      </DraggableCard>
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
              </ColumnDropZone>
            ))}
          </div>
        </DndContext>
      )}

      {atividadeSelecionada && (
        <CardDetailModal
          atividade={atividadeSelecionada}
          podeEditar={
            podeGerenciar ||
            atividadeSelecionada.responsaveis.some((r) => r.id === user.id)
          }
          onClose={() => setAtividadeSelecionada(null)}
        />
      )}
    </div>
  );
}

function CardDetailModal({
  atividade,
  podeEditar,
  onClose,
}: {
  atividade: Atividade;
  podeEditar: boolean;
  onClose: () => void;
}) {
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novoTexto, setNovoTexto] = useState("");

  useEffect(() => {
    api
      .listChecklist(atividade.id)
      .then(setItens)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar checklist"))
      .finally(() => setFetching(false));
  }, [atividade.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTexto.trim()) return;
    setError(null);
    try {
      const item = await api.createChecklistItem(atividade.id, novoTexto.trim());
      setItens((prev) => [...prev, item]);
      setNovoTexto("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar item");
    }
  }

  async function handleToggle(item: ChecklistItem) {
    setError(null);
    try {
      const updated = await api.updateChecklistItem(item.id, { concluido: !item.concluido });
      setItens((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar item");
    }
  }

  async function handleRemove(item: ChecklistItem) {
    setError(null);
    try {
      await api.deleteChecklistItem(item.id);
      setItens((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover item");
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-lg bg-background p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{atividade.nome}</h2>
          <button onClick={onClose} className="text-sm underline">
            Fechar
          </button>
        </div>

        {atividade.responsaveis.length > 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Responsáveis: {atividade.responsaveis.map((r) => r.name).join(", ")}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Checklist</h3>
          {fetching ? (
            <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Nenhum item ainda.</p>
          ) : (
            <ul className="space-y-1">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.concluido}
                    disabled={!podeEditar}
                    onChange={() => handleToggle(item)}
                  />
                  <span className={item.concluido ? "flex-1 line-through opacity-60" : "flex-1"}>
                    {item.texto}
                  </span>
                  {podeEditar && (
                    <button onClick={() => handleRemove(item)} className="text-xs underline">
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {podeEditar && (
            <form onSubmit={handleAdd} className="flex gap-2 pt-1">
              <input
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                placeholder="Novo item do checklist"
                className="flex-1 rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              />
              <button
                type="submit"
                className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
              >
                Adicionar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnDropZone({
  estagioId,
  children,
}: {
  estagioId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estagioId });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-lg border p-3 transition-colors ${
        isOver ? "border-foreground/40 bg-black/[.03] dark:bg-white/[.05]" : "border-black/10 dark:border-white/10"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableCard({ atividadeId, children }: { atividadeId: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: atividadeId });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      {children}
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
