"use client";

import { useState } from "react";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarEstagios } from "@/lib/permissions";
import { getEstagioFinalId, isAtrasada } from "@/lib/atividade-status";
import { addDays, cronogramaRestante, formatCurto } from "@/lib/cronograma";
import { CardDetailModal } from "@/components/CardDetailModal";
import { ApiError } from "@/lib/api";

const ESTAGIO_CORES_DEFAULT = ["bg-slate-400", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];

export default function CronogramaPage() {
  const { turma, estagios, grupos, atividades, updateTurmaCronograma } = useTurmaBoard();
  const { effectiveRole } = useViewAs();
  const [editando, setEditando] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);

  const podeEditar = podeGerenciarEstagios(effectiveRole);
  const estagioFinalId = getEstagioFinalId(estagios);
  const estagioPorId = Object.fromEntries(
    estagios.map((e, i) => [e.id, { ...e, cor: e.cor ?? ESTAGIO_CORES_DEFAULT[i % ESTAGIO_CORES_DEFAULT.length] }])
  );

  if (!turma) return null;

  const range = cronogramaRestante(turma);

  if (!range) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-black/60 dark:text-white/60">
          O cronograma desta turma ainda não foi configurado.
        </p>
        {podeEditar && <CronogramaSettingsForm turma={turma} onSalvar={updateTurmaCronograma} />}
      </div>
    );
  }

  const totalDias = Math.round((range.fim.getTime() - range.inicio.getTime()) / 86400000) + 1;
  const semanasHeader = Array.from({ length: range.semanas }, (_, i) => addDays(range.inicio, i * 7));

  function posicao(atividade: (typeof atividades)[number]) {
    const inicioAtiv = atividade.data_inicio ? new Date(atividade.data_inicio) : new Date(atividade.data_criacao);
    const fimAtiv = atividade.data_fim ? new Date(atividade.data_fim) : inicioAtiv;
    const inicioClip = new Date(Math.max(inicioAtiv.getTime(), range!.inicio.getTime()));
    const fimClip = new Date(Math.min(fimAtiv.getTime(), range!.fim.getTime()));
    if (fimClip.getTime() < inicioClip.getTime()) return null;
    const leftDias = (inicioClip.getTime() - range!.inicio.getTime()) / 86400000;
    const larguraDias = Math.max(1, (fimClip.getTime() - inicioClip.getTime()) / 86400000 + 1);
    return {
      leftPct: (leftDias / totalDias) * 100,
      widthPct: (larguraDias / totalDias) * 100,
      dias: Math.round(larguraDias),
    };
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cronograma das sprints</h2>
            <p className="text-xs text-black/50 dark:text-white/50">
              {formatCurto(range.inicio)} – {formatCurto(range.fim)} · {range.semanas} semanas
            </p>
          </div>
          {podeEditar && (
            <button onClick={() => setEditando((v) => !v)} className="text-xs underline">
              {editando ? "fechar" : "Editar cronograma"}
            </button>
          )}
        </div>

        {editando && (
          <div className="mb-4">
            <CronogramaSettingsForm turma={turma} onSalvar={updateTurmaCronograma} />
          </div>
        )}

        <div
          className="mb-2 hidden gap-1 border-b border-black/10 pb-1 text-xs text-black/40 sm:grid dark:border-white/10 dark:text-white/40"
          style={{ gridTemplateColumns: `repeat(${range.semanas}, minmax(0,1fr))` }}
        >
          {semanasHeader.map((d, i) => (
            <div key={i} className="border-l border-black/5 pl-1 dark:border-white/10">
              {formatCurto(d)}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {grupos.map((g) => {
            const doGrupo = atividades.filter((a) => a.grupo_id === g.id);
            if (doGrupo.length === 0) return null;
            return (
              <div key={g.id}>
                <h3 className="mb-2 text-sm font-medium">{g.nome}</h3>
                <div className="space-y-2">
                  {doGrupo.map((atividade) => {
                    const pos = posicao(atividade);
                    const estagio = estagioPorId[atividade.estagio_id];
                    const atrasada = isAtrasada(atividade, estagioFinalId);
                    return (
                      <div key={atividade.id} className="flex items-center gap-3 text-xs">
                        <span className="w-40 shrink-0 truncate sm:w-56">{atividade.nome}</span>
                        <div className="relative h-6 flex-1 rounded bg-black/5 dark:bg-white/5">
                          {pos && (
                            <button
                              onClick={() => setAtividadeSelecionada(atividade.id)}
                              style={{ left: `${pos.leftPct}%`, width: `${pos.widthPct}%` }}
                              className={`absolute top-0 flex h-6 items-center rounded px-1.5 text-[10px] font-medium text-white ${
                                atrasada ? "bg-red-500" : (estagio?.cor ?? "bg-blue-500")
                              }`}
                            >
                              {pos.dias}d
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-black/10 pt-3 text-xs dark:border-white/10">
          {estagios.map((e, i) => (
            <span key={e.id} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${e.cor ?? ESTAGIO_CORES_DEFAULT[i % ESTAGIO_CORES_DEFAULT.length]}`} />
              {e.nome}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Atrasada
          </span>
        </div>
      </div>

      {atividadeSelecionada && (
        <CardDetailModal atividadeId={atividadeSelecionada} onClose={() => setAtividadeSelecionada(null)} />
      )}
    </div>
  );
}

function CronogramaSettingsForm({
  turma,
  onSalvar,
}: {
  turma: NonNullable<ReturnType<typeof useTurmaBoard>["turma"]>;
  onSalvar: ReturnType<typeof useTurmaBoard>["updateTurmaCronograma"];
}) {
  const [inicio, setInicio] = useState(turma.cronograma_inicio ?? "");
  const [duracao, setDuracao] = useState(String(turma.duracao_sprint_semanas));
  const [total, setTotal] = useState(String(turma.total_sprints));
  const [atual, setAtual] = useState(String(turma.sprint_atual));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inicio) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSalvar({
        cronograma_inicio: inicio,
        duracao_sprint_semanas: Number(duracao),
        total_sprints: Number(total),
        sprint_atual: Number(atual),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar cronograma");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 rounded-md border border-black/10 p-3 sm:grid-cols-4 dark:border-white/10">
      <div className="space-y-1">
        <label className="text-xs font-medium">Início do ciclo</label>
        <input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Semanas por sprint</label>
        <input
          type="number"
          min={1}
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Total de sprints</label>
        <input
          type="number"
          min={1}
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Sprint atual</label>
        <input
          type="number"
          min={1}
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        />
      </div>
      {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !inicio}
        className="sm:col-span-4 rounded-md bg-blue-600 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Salvando..." : "Salvar cronograma"}
      </button>
    </form>
  );
}
