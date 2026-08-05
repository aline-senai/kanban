"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type AtividadeAtrasada, type ConclusaoGrupo, type Turma } from "@/lib/api";

export default function RelatoriosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [turma, setTurma] = useState<Turma | null>(null);
  const [conclusao, setConclusao] = useState<ConclusaoGrupo[]>([]);
  const [atrasadas, setAtrasadas] = useState<AtividadeAtrasada[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && user.role !== "professor") router.push(`/turmas/${turmaId}/quadro`);
  }, [user, turmaId, router]);

  useEffect(() => {
    if (!user || user.role !== "professor") return;
    Promise.all([
      api.listTurmas(),
      api.relatorioConclusao(turmaId),
      api.relatorioAtrasadas(turmaId),
    ])
      .then(([turmas, conclusaoData, atrasadasData]) => {
        setTurma(turmas.find((t) => t.id === turmaId) ?? null);
        setConclusao(conclusaoData);
        setAtrasadas(atrasadasData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar relatórios"))
      .finally(() => setFetching(false));
  }, [user, turmaId]);

  async function handleExportarCsv() {
    setError(null);
    try {
      await api.exportarAtrasadasCsv(turmaId, `atrasadas_${turma?.nome ?? turmaId}.csv`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao exportar CSV");
    }
  }

  if (loading || !user || user.role !== "professor") return null;

  return (
    <div className="space-y-8 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/turmas/${turmaId}/equipe`} className="text-sm underline">
          ← Equipe e grupos
        </Link>
        <span />
      </div>

      <h1 className="hidden text-xl font-semibold print:block">
        Relatórios — {turma?.nome ?? "Turma"}
      </h1>

      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      {fetching ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Conclusão por grupo</h2>
            {conclusao.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">Nenhum grupo nesta turma.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left dark:border-white/10">
                    <th className="py-1 font-medium">Grupo</th>
                    <th className="py-1 font-medium">Atividades</th>
                    <th className="py-1 font-medium">Concluídas</th>
                    <th className="py-1 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {conclusao.map((c) => (
                    <tr key={c.grupo_id} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-1">{c.grupo_nome}</td>
                      <td className="py-1">{c.total_atividades}</td>
                      <td className="py-1">{c.concluidas}</td>
                      <td className="py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-2 rounded-full bg-foreground"
                              style={{ width: `${c.percentual}%` }}
                            />
                          </div>
                          {c.percentual}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Atividades atrasadas</h2>
              <div className="flex gap-3 text-xs print:hidden">
                <button onClick={handleExportarCsv} className="underline">
                  Exportar CSV
                </button>
                <button onClick={() => window.print()} className="underline">
                  Imprimir / Exportar PDF
                </button>
              </div>
            </div>

            {atrasadas.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">Nenhuma atividade atrasada. 🎉</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left dark:border-white/10">
                    <th className="py-1 font-medium">Grupo</th>
                    <th className="py-1 font-medium">Atividade</th>
                    <th className="py-1 font-medium">Estágio</th>
                    <th className="py-1 font-medium">Prazo</th>
                    <th className="py-1 font-medium">Responsáveis</th>
                  </tr>
                </thead>
                <tbody>
                  {atrasadas.map((a) => (
                    <tr key={a.atividade_id} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-1">{a.grupo_nome}</td>
                      <td className="py-1">{a.nome}</td>
                      <td className="py-1">{a.estagio_nome}</td>
                      <td className="py-1 text-red-600 dark:text-red-400">
                        {new Date(a.data_fim).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-1">{a.responsaveis.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
