"use client";

import { useState } from "react";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { getEstagioFinalId, isAtrasada } from "@/lib/atividade-status";
import { Avatar } from "@/components/Avatar";
import { CardDetailModal } from "@/components/CardDetailModal";
import type { Prioridade } from "@/lib/api";

const PRIORIDADE_LABEL: Record<Prioridade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: "bg-slate-400",
  media: "bg-amber-500",
  alta: "bg-red-500",
};
const ESTAGIO_CORES_DEFAULT = ["bg-slate-400", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];

export default function ListaPage() {
  const { estagios, grupos, atividades } = useTurmaBoard();
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);

  const estagioFinalId = getEstagioFinalId(estagios);
  const estagioPorId = Object.fromEntries(estagios.map((e, i) => [e.id, { ...e, cor: e.cor ?? ESTAGIO_CORES_DEFAULT[i % ESTAGIO_CORES_DEFAULT.length] }]));
  const grupoNomePorId = Object.fromEntries(grupos.map((g) => [g.id, g.nome]));

  const ordenadas = [...atividades].sort((a, b) => {
    if (!a.data_fim && !b.data_fim) return 0;
    if (!a.data_fim) return 1;
    if (!b.data_fim) return -1;
    return new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime();
  });

  if (atividades.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Nenhuma atividade ainda.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/40 dark:border-white/10 dark:text-white/40">
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Atividade</th>
            <th className="px-4 py-3 font-medium">Responsáveis</th>
            <th className="px-4 py-3 font-medium">Estágio</th>
            <th className="px-4 py-3 font-medium">Prazo</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((atividade) => {
            const estagio = estagioPorId[atividade.estagio_id];
            const atrasada = isAtrasada(atividade, estagioFinalId);
            return (
              <tr
                key={atividade.id}
                onClick={() => setAtividadeSelecionada(atividade.id)}
                className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-black/[.02] dark:border-white/5 dark:hover:bg-white/[.04]"
              >
                <td className="px-4 py-3 align-top text-black/50 dark:text-white/50">
                  AT-{String(atividade.numero).padStart(3, "0")}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium">{atividade.nome}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {grupoNomePorId[atividade.grupo_id]}
                    {atividade.estimativa_horas != null ? ` · ${atividade.estimativa_horas}h` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="flex -space-x-1.5">
                    {atividade.responsaveis.map((r) => (
                      <Avatar key={r.id} id={r.id} name={r.name} />
                    ))}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  {estagio && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                      <span className={`h-1.5 w-1.5 rounded-full ${estagio.cor}`} />
                      {estagio.nome}
                    </span>
                  )}
                </td>
                <td className={`px-4 py-3 align-top ${atrasada ? "font-medium text-red-600 dark:text-red-400" : ""}`}>
                  {atividade.data_fim ? new Date(atividade.data_fim).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PRIORIDADE_COR[atividade.prioridade]}`} />
                    {PRIORIDADE_LABEL[atividade.prioridade]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {atividadeSelecionada && (
        <CardDetailModal atividadeId={atividadeSelecionada} onClose={() => setAtividadeSelecionada(null)} />
      )}
    </div>
  );
}
