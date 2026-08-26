"use client";

import { useState } from "react";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarPlanningReview, podeGerenciarSprints } from "@/lib/permissions";
import { api, ApiError, type Sprint, type SprintPlanning, type SprintReview } from "@/lib/api";

function formatarPeriodo(dataInicio: string | null, dataFim: string | null): string | null {
  if (!dataInicio && !dataFim) return null;
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
  if (dataInicio && dataFim) return `${fmt(dataInicio)} – ${fmt(dataFim)}`;
  if (dataInicio) return `A partir de ${fmt(dataInicio)}`;
  return `Até ${fmt(dataFim!)}`;
}

export default function SprintsPage() {
  const {
    atividades,
    sprints,
    loading,
    createSprint,
    updateSprint,
    deleteSprint,
    reorderSprints,
    updateSprintLocal,
  } = useTurmaBoard();
  const { effectiveRole } = useViewAs();
  const podeCriar = podeGerenciarSprints(effectiveRole);
  const podePlanningReview = podeGerenciarPlanningReview(effectiveRole);

  const [error, setError] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");
  const [criando, setCriando] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setError(null);
    setCriando(true);
    try {
      await createSprint({
        nome: novoNome.trim(),
        data_inicio: novoInicio || null,
        data_fim: novoFim || null,
      });
      setNovoNome("");
      setNovoInicio("");
      setNovoFim("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar sprint");
    } finally {
      setCriando(false);
    }
  }

  async function handleSalvarEdicao(
    sprint: Sprint,
    payload: { nome: string; data_inicio: string | null; data_fim: string | null }
  ) {
    setError(null);
    try {
      await updateSprint(sprint.id, payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar sprint");
      throw err;
    }
  }

  async function handleDelete(sprint: Sprint) {
    if (!window.confirm(`Remover a sprint "${sprint.nome}"? As atividades vinculadas ficarão sem sprint.`)) return;
    setError(null);
    try {
      await deleteSprint(sprint.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover sprint");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sprints.length) return;
    const reordenadas = [...sprints];
    [reordenadas[index], reordenadas[target]] = [reordenadas[target], reordenadas[index]];
    setError(null);
    try {
      await reorderSprints(reordenadas.map((s) => s.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao reordenar sprints");
    }
  }

  const atividadesPorSprint = new Map<string, typeof atividades>();
  for (const atividade of atividades) {
    if (!atividade.sprint_id) continue;
    const lista = atividadesPorSprint.get(atividade.sprint_id) ?? [];
    lista.push(atividade);
    atividadesPorSprint.set(atividade.sprint_id, lista);
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {podeCriar && (
        <form
          onSubmit={handleCreate}
          className="space-y-2 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da sprint (ex: Sprint 1)"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs text-black/50 dark:text-white/50">
              Início (opcional)
              <input
                type="date"
                value={novoInicio}
                onChange={(e) => setNovoInicio(e.target.value)}
                className="block rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </label>
            <label className="space-y-1 text-xs text-black/50 dark:text-white/50">
              Fim (opcional)
              <input
                type="date"
                value={novoFim}
                onChange={(e) => setNovoFim(e.target.value)}
                className="block rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </label>
            <button
              type="submit"
              disabled={!novoNome.trim() || criando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {criando ? "Criando..." : "Criar sprint"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : sprints.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Nenhuma sprint criada ainda{podeCriar ? "" : ". Aguarde o professor criar as sprints"}.
        </p>
      ) : (
        <div className="space-y-4">
          {sprints.map((sprint, index) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              podeCriar={podeCriar}
              podePlanningReview={podePlanningReview}
              podeMoverCima={podeCriar && index > 0}
              podeMoverBaixo={podeCriar && index < sprints.length - 1}
              atividades={atividadesPorSprint.get(sprint.id) ?? []}
              onSalvarEdicao={(payload) => handleSalvarEdicao(sprint, payload)}
              onDelete={() => handleDelete(sprint)}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
              onError={setError}
              onPlanningChange={(planning) => updateSprintLocal(sprint.id, { planning })}
              onReviewChange={(review) => updateSprintLocal(sprint.id, { review })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SprintCard({
  sprint,
  podeCriar,
  podePlanningReview,
  podeMoverCima,
  podeMoverBaixo,
  atividades,
  onSalvarEdicao,
  onDelete,
  onMoveUp,
  onMoveDown,
  onError,
  onPlanningChange,
  onReviewChange,
}: {
  sprint: Sprint;
  podeCriar: boolean;
  podePlanningReview: boolean;
  podeMoverCima: boolean;
  podeMoverBaixo: boolean;
  atividades: ReturnType<typeof useTurmaBoard>["atividades"];
  onSalvarEdicao: (payload: { nome: string; data_inicio: string | null; data_fim: string | null }) => Promise<void>;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onError: (msg: string) => void;
  onPlanningChange: (planning: SprintPlanning | null) => void;
  onReviewChange: (review: SprintReview | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(sprint.nome);
  const [dataInicio, setDataInicio] = useState(sprint.data_inicio ?? "");
  const [dataFim, setDataFim] = useState(sprint.data_fim ?? "");
  const [salvando, setSalvando] = useState(false);

  function iniciarEdicao() {
    setNome(sprint.nome);
    setDataInicio(sprint.data_inicio ?? "");
    setDataFim(sprint.data_fim ?? "");
    setEditando(true);
  }

  async function handleSalvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await onSalvarEdicao({ nome: nome.trim(), data_inicio: dataInicio || null, data_fim: dataFim || null });
      setEditando(false);
    } catch {
      // erro já reportado pelo chamador
    } finally {
      setSalvando(false);
    }
  }

  const periodo = formatarPeriodo(sprint.data_inicio, sprint.data_fim);

  return (
    <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {podeCriar && (
            <div className="flex flex-col text-xs text-black/40 dark:text-white/40">
              <button onClick={onMoveUp} disabled={!podeMoverCima} className="disabled:opacity-30" title="Mover para cima">
                ↑
              </button>
              <button onClick={onMoveDown} disabled={!podeMoverBaixo} className="disabled:opacity-30" title="Mover para baixo">
                ↓
              </button>
            </div>
          )}
          <div>
            {editando ? (
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
                className="rounded-md border border-black/15 px-2 py-1 text-base font-semibold dark:border-white/15 dark:bg-transparent"
              />
            ) : (
              <h2 className="text-base font-semibold">{sprint.nome}</h2>
            )}
            <p className="text-xs text-black/50 dark:text-white/50">
              {atividades.length} atividade{atividades.length === 1 ? "" : "s"} vinculada
              {atividades.length === 1 ? "" : "s"}
              {periodo && !editando ? ` · ${periodo}` : ""}
            </p>
          </div>
        </div>
        {podeCriar && !editando && (
          <span className="flex shrink-0 gap-3 text-xs">
            <button onClick={iniciarEdicao} className="underline">
              editar
            </button>
            <button onClick={onDelete} className="text-red-600 underline dark:text-red-400">
              excluir
            </button>
          </span>
        )}
      </div>

      {editando && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 p-3 dark:border-white/10">
          <label className="space-y-1 text-xs text-black/50 dark:text-white/50">
            Início
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="block rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </label>
          <label className="space-y-1 text-xs text-black/50 dark:text-white/50">
            Fim
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="block rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </label>
          <button
            onClick={handleSalvar}
            disabled={salvando || !nome.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={() => setEditando(false)} className="text-xs underline">
            cancelar
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanningReviewSection
          titulo="Planning"
          placeholder="Metas e itens planejados para esta sprint..."
          dado={sprint.planning}
          podeGerenciar={podePlanningReview}
          onError={onError}
          onCreate={(payload) => api.createPlanning(sprint.id, payload)}
          onUpdate={(payload) => api.updatePlanning(sprint.id, payload)}
          onDelete={() => api.deletePlanning(sprint.id)}
          onChange={onPlanningChange}
        />
        <PlanningReviewSection
          titulo="Review"
          placeholder="Resultados e observações desta sprint..."
          dado={sprint.review}
          podeGerenciar={podePlanningReview}
          onError={onError}
          onCreate={(payload) => api.createReview(sprint.id, payload)}
          onUpdate={(payload) => api.updateReview(sprint.id, payload)}
          onDelete={() => api.deleteReview(sprint.id)}
          onChange={onReviewChange}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Atividades da sprint</p>
        {atividades.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nenhuma atividade vinculada a esta sprint.</p>
        ) : (
          <ul className="space-y-1">
            {atividades.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-2 py-1.5 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate">
                  <span className="text-black/40 dark:text-white/40">AT-{String(a.numero).padStart(3, "0")}</span>{" "}
                  {a.nome}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type PlanningOuReview = SprintPlanning | SprintReview;

function PlanningReviewSection<T extends PlanningOuReview>({
  titulo,
  placeholder,
  dado,
  podeGerenciar,
  onError,
  onCreate,
  onUpdate,
  onDelete,
  onChange,
}: {
  titulo: string;
  placeholder: string;
  dado: T | null;
  podeGerenciar: boolean;
  onError: (msg: string) => void;
  onCreate: (payload: { data: string | null; texto: string | null }) => Promise<T>;
  onUpdate: (payload: { data: string | null; texto: string | null }) => Promise<T>;
  onDelete: () => Promise<void>;
  onChange: (novo: T | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(dado?.data ? dado.data.slice(0, 10) : "");
  const [texto, setTexto] = useState(dado?.texto ?? "");
  const [salvando, setSalvando] = useState(false);

  function iniciarEdicao() {
    setData(dado?.data ? dado.data.slice(0, 10) : "");
    setTexto(dado?.texto ?? "");
    setEditando(true);
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const payload = { data: data ? new Date(data).toISOString() : null, texto: texto.trim() || null };
      const resultado = dado ? await onUpdate(payload) : await onCreate(payload);
      onChange(resultado);
      setEditando(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `Erro ao salvar ${titulo.toLowerCase()}`);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover() {
    if (!window.confirm(`Remover ${titulo.toLowerCase()} desta sprint?`)) return;
    setSalvando(true);
    try {
      await onDelete();
      onChange(null);
      setEditando(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `Erro ao remover ${titulo.toLowerCase()}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-1.5 rounded-md border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{titulo}</p>
        {podeGerenciar && !editando && (
          <button onClick={iniciarEdicao} className="text-xs underline">
            {dado ? "editar" : `+ ${titulo}`}
          </button>
        )}
      </div>

      {editando ? (
        <div className="space-y-2">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setEditando(false)} className="text-xs underline">
              cancelar
            </button>
            {dado && (
              <button onClick={handleRemover} disabled={salvando} className="text-xs text-red-600 underline dark:text-red-400">
                remover
              </button>
            )}
          </div>
        </div>
      ) : dado ? (
        <div className="space-y-1 text-sm">
          {dado.data && <p className="text-xs text-black/50 dark:text-white/50">{new Date(dado.data).toLocaleDateString("pt-BR")}</p>}
          <p className="whitespace-pre-wrap">{dado.texto || "Sem observações."}</p>
          <p className="text-xs text-black/40 dark:text-white/40">por {dado.criado_por.name}</p>
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">Ainda não criada.</p>
      )}
    </div>
  );
}
