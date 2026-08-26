"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarAtividades as podeGerenciarAtividadesRole } from "@/lib/permissions";
import {
  api,
  ApiError,
  type Anexo,
  type AtividadeVinculo,
  type ChecklistItem,
  type Comentario,
  type HistoricoEntry,
  type Prioridade,
} from "@/lib/api";
import { Avatar } from "./Avatar";

const PRIORIDADE_LABEL: Record<Prioridade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: "bg-slate-400",
  media: "bg-amber-500",
  alta: "bg-red-500",
};

function formatarDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function formatarDuracao(desdeIso: string): string {
  const dias = Math.max(0, Math.floor((Date.now() - new Date(desdeIso).getTime()) / 86400000));
  return dias === 0 ? "hoje" : `${dias}d`;
}

export function CardDetailModal({ atividadeId, onClose }: { atividadeId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { effectiveRole } = useViewAs();
  const { atividades, estagios, grupos, moverAtividade, updateAtividade, deleteAtividade } = useTurmaBoard();

  const atividade = atividades.find((a) => a.id === atividadeId);
  const grupoAtual = atividade ? grupos.find((g) => g.id === atividade.grupo_id) : undefined;

  const podeGerenciar = podeGerenciarAtividadesRole(effectiveRole);
  const podeEditar =
    podeGerenciar || (!!user && !!atividade && atividade.responsaveis.some((r) => r.id === user.id));

  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novoTexto, setNovoTexto] = useState("");

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploading, setUploading] = useState(false);

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);

  const [descricao, setDescricao] = useState(atividade?.texto ?? "");
  const [editandoResponsaveis, setEditandoResponsaveis] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [vinculos, setVinculos] = useState<AtividadeVinculo[]>([]);
  const [adicionandoVinculo, setAdicionandoVinculo] = useState(false);
  const [buscaVinculo, setBuscaVinculo] = useState("");
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);

  useEffect(() => {
    if (!atividade) return;
    api
      .listChecklist(atividade.id)
      .then(setItens)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar checklist"))
      .finally(() => setFetching(false));
    api
      .listAnexos(atividade.id)
      .then(setAnexos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar anexos"));
    api
      .listComentarios(atividade.id)
      .then(setComentarios)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar comentários"));
    api
      .listHistorico(atividade.id)
      .then(setHistorico)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar histórico"));
    api
      .listVinculos(atividade.id)
      .then(setVinculos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar atividades vinculadas"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atividade?.id]);

  useEffect(() => {
    setDescricao(atividade?.texto ?? "");
  }, [atividade?.id, atividade?.texto]);

  if (!atividade) return null;

  const timelineEstagios = (() => {
    if (historico.length === 0) {
      return [
        {
          estagio: "estágio atual",
          entrada: atividade.data_criacao,
          saida: null as string | null,
          movidoPor: atividade.criador.name,
        },
      ];
    }
    const linhas: { estagio: string; entrada: string; saida: string | null; movidoPor: string }[] = [];
    const primeiro = historico[0];
    linhas.push({
      estagio: primeiro.estagio_de_nome ?? "estágio inicial",
      entrada: atividade.data_criacao,
      saida: primeiro.created_at,
      movidoPor: atividade.criador.name,
    });
    historico.forEach((entrada, i) => {
      linhas.push({
        estagio: entrada.estagio_para_nome,
        entrada: entrada.created_at,
        saida: i + 1 < historico.length ? historico[i + 1].created_at : null,
        movidoPor: entrada.user_name,
      });
    });
    return linhas;
  })();

  async function handleMoverEstagio(novoEstagioId: string) {
    setError(null);
    try {
      await moverAtividade(atividade!.id, novoEstagioId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao mover atividade");
    }
  }

  async function handleSalvarPrioridade(prioridade: Prioridade) {
    setError(null);
    try {
      await updateAtividade(atividade!.id, { prioridade });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar prioridade");
    }
  }

  async function handleSalvarEstimativa(valor: string) {
    setError(null);
    try {
      await updateAtividade(atividade!.id, { estimativa_horas: valor ? Number(valor) : null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar estimativa");
    }
  }

  async function handleSalvarPrazo(valor: string) {
    setError(null);
    try {
      await updateAtividade(atividade!.id, { data_fim: valor ? new Date(valor).toISOString() : null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar prazo");
    }
  }

  async function handleSalvarDescricao() {
    if (descricao === (atividade!.texto ?? "")) return;
    setError(null);
    try {
      await updateAtividade(atividade!.id, { texto: descricao });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar descrição");
    }
  }

  async function handleToggleResponsavel(userId: string) {
    const atuais = atividade!.responsaveis.map((r) => r.id);
    const novos = atuais.includes(userId) ? atuais.filter((id) => id !== userId) : [...atuais, userId];
    setError(null);
    try {
      await updateAtividade(atividade!.id, { responsavel_ids: novos });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar responsáveis");
    }
  }

  async function handleAddComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setEnviandoComentario(true);
    setError(null);
    try {
      const comentario = await api.createComentario(atividade!.id, novoComentario.trim());
      setComentarios((prev) => [...prev, comentario]);
      setNovoComentario("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar comentário");
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, nomeReferencia?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const anexo = await api.uploadAnexo(atividade!.id, file, nomeReferencia);
      setAnexos((prev) => {
        const existente = prev.find((a) => a.id === anexo.id);
        return existente ? prev.map((a) => (a.id === anexo.id ? anexo : a)) : [...prev, anexo];
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDownload(versaoId: string, nomeArquivo: string) {
    setError(null);
    try {
      await api.downloadAnexoVersao(versaoId, nomeArquivo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao baixar arquivo");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTexto.trim()) return;
    setError(null);
    try {
      const item = await api.createChecklistItem(atividade!.id, novoTexto.trim());
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

  async function handleExcluir() {
    if (!window.confirm(`Remover a atividade "${atividade!.nome}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    setExcluindo(true);
    try {
      await deleteAtividade(atividade!.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover atividade");
      setExcluindo(false);
    }
  }

  async function handleAddVinculo(vinculadaId: string) {
    setError(null);
    setSalvandoVinculo(true);
    try {
      const vinculo = await api.createVinculo(atividade!.id, vinculadaId);
      setVinculos((prev) => [...prev, vinculo]);
      setBuscaVinculo("");
      setAdicionandoVinculo(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao vincular atividade");
    } finally {
      setSalvandoVinculo(false);
    }
  }

  async function handleRemoveVinculo(vinculadaId: string) {
    setError(null);
    try {
      await api.deleteVinculo(atividade!.id, vinculadaId);
      setVinculos((prev) => prev.filter((v) => v.atividade.id !== vinculadaId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao desvincular atividade");
    }
  }

  const concluidos = itens.filter((i) => i.concluido).length;
  const progresso = itens.length > 0 ? Math.round((concluidos / itens.length) * 100) : 0;
  const membrosDisponiveis = grupoAtual?.membros ?? [];

  const candidatosVinculo = atividades.filter(
    (a) =>
      a.id !== atividade.id &&
      !vinculos.some((v) => v.atividade.id === a.id) &&
      (buscaVinculo.trim() === "" || a.nome.toLowerCase().includes(buscaVinculo.trim().toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-black/40 dark:text-white/40">
              AT-{String(atividade.numero).padStart(3, "0")}
            </p>
            <h2 className="text-lg font-semibold">{atividade.nome}</h2>
          </div>
          <div className="flex items-center gap-3">
            {podeGerenciar && (
              <button
                onClick={handleExcluir}
                disabled={excluindo}
                className="text-sm text-red-600 underline disabled:opacity-50 dark:text-red-400"
              >
                {excluindo ? "Removendo..." : "Excluir"}
              </button>
            )}
            <button onClick={onClose} className="text-sm underline">
              Fechar
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm font-medium">Estágio</label>
          <select
            value={atividade.estagio_id}
            disabled={!podeEditar}
            onChange={(e) => handleMoverEstagio(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-60 dark:border-white/15 dark:bg-transparent"
          >
            {estagios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Responsáveis</label>
            {podeGerenciar && membrosDisponiveis.length > 0 && (
              <button onClick={() => setEditandoResponsaveis((v) => !v)} className="text-xs underline">
                {editandoResponsaveis ? "concluir" : "+ adicionar"}
              </button>
            )}
          </div>
          {atividade.responsaveis.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {atividade.responsaveis.map((r) => (
                <span key={r.id} className="flex items-center gap-1 text-xs">
                  <Avatar id={r.id} name={r.name} /> {r.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">Nenhum responsável ainda.</p>
          )}
          {editandoResponsaveis && (
            <div className="flex flex-wrap gap-2 rounded-md border border-black/10 p-2 text-xs dark:border-white/10">
              {membrosDisponiveis.map((m) => (
                <label key={m.user.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={atividade.responsaveis.some((r) => r.id === m.user.id)}
                    onChange={() => handleToggleResponsavel(m.user.id)}
                  />
                  <Avatar id={m.user.id} name={m.user.name} />
                  {m.user.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
          <div className="space-y-1">
            <p className="text-xs text-black/50 dark:text-white/50">Prazo</p>
            {podeEditar ? (
              <input
                type="date"
                defaultValue={atividade.data_fim ? atividade.data_fim.slice(0, 10) : ""}
                onBlur={(e) => handleSalvarPrazo(e.target.value)}
                className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              />
            ) : (
              <p>{atividade.data_fim ? new Date(atividade.data_fim).toLocaleDateString("pt-BR") : "—"}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-black/50 dark:text-white/50">Prioridade</p>
            {podeEditar ? (
              <select
                defaultValue={atividade.prioridade}
                onChange={(e) => handleSalvarPrioridade(e.target.value as Prioridade)}
                className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            ) : (
              <p className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${PRIORIDADE_COR[atividade.prioridade]}`} />
                {PRIORIDADE_LABEL[atividade.prioridade]}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-black/50 dark:text-white/50">Estimativa</p>
            {podeEditar ? (
              <input
                type="number"
                min={0}
                defaultValue={atividade.estimativa_horas ?? ""}
                onBlur={(e) => handleSalvarEstimativa(e.target.value)}
                className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              />
            ) : (
              <p>{atividade.estimativa_horas != null ? `${atividade.estimativa_horas}h` : "—"}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-black/50 dark:text-white/50">Neste estágio</p>
            <p>{formatarDuracao(atividade.data_inicio_estagio)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-black/50 dark:text-white/50">Criada por</p>
            <p className="flex items-center gap-1.5">
              <Avatar id={atividade.criador.id} name={atividade.criador.name} /> {atividade.criador.name}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Descrição</label>
          {podeEditar ? (
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={handleSalvarDescricao}
              rows={3}
              placeholder="Instruções ou observações sobre esta atividade..."
              className="w-full rounded-md border border-black/15 bg-black/[.02] px-3 py-2 text-sm dark:border-white/15 dark:bg-white/[.03]"
            />
          ) : (
            <p className="whitespace-pre-wrap rounded-md border border-black/15 bg-black/[.02] px-3 py-2 text-sm dark:border-white/15 dark:bg-white/[.03]">
              {atividade.texto || "Sem descrição."}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Atividades vinculadas</label>
            {podeEditar && (
              <button
                onClick={() => {
                  setAdicionandoVinculo((v) => !v);
                  setBuscaVinculo("");
                }}
                className="text-xs underline"
              >
                {adicionandoVinculo ? "cancelar" : "+ vincular"}
              </button>
            )}
          </div>

          {vinculos.length > 0 ? (
            <ul className="space-y-1">
              {vinculos.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-2 py-1.5 text-sm dark:border-white/10"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-black/40 dark:text-white/40">
                      AT-{String(v.atividade.numero).padStart(3, "0")}
                    </span>{" "}
                    {v.atividade.nome}{" "}
                    <span className="text-xs text-black/50 dark:text-white/50">
                      ({v.atividade.grupo_nome} · {v.atividade.estagio_nome})
                    </span>
                  </span>
                  {podeEditar && (
                    <button
                      onClick={() => handleRemoveVinculo(v.atividade.id)}
                      className="shrink-0 text-xs underline"
                    >
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">Nenhuma atividade vinculada.</p>
          )}

          {adicionandoVinculo && (
            <div className="space-y-2 rounded-md border border-black/10 p-2 dark:border-white/10">
              <input
                value={buscaVinculo}
                onChange={(e) => setBuscaVinculo(e.target.value)}
                placeholder="Buscar atividade para vincular..."
                autoFocus
                className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              />
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {candidatosVinculo.length === 0 ? (
                  <li className="text-xs text-black/50 dark:text-white/50">Nenhuma atividade encontrada.</li>
                ) : (
                  candidatosVinculo.slice(0, 20).map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => handleAddVinculo(a.id)}
                        disabled={salvandoVinculo}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-black/40 dark:text-white/40">
                            AT-{String(a.numero).padStart(3, "0")}
                          </span>{" "}
                          {a.nome}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Histórico de estágios</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-1 font-medium">Estágio</th>
                <th className="py-1 font-medium">Entrada</th>
                <th className="py-1 font-medium">Saída</th>
                <th className="py-1 font-medium">Movido por</th>
              </tr>
            </thead>
            <tbody>
              {timelineEstagios.map((linha, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-1">{linha.estagio}</td>
                  <td className="py-1">{formatarDataHora(linha.entrada)}</td>
                  <td className="py-1">{linha.saida ? formatarDataHora(linha.saida) : "ainda no estágio"}</td>
                  <td className="py-1">{linha.movidoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Checklist</h3>
            {itens.length > 0 && (
              <span className="text-xs text-black/50 dark:text-white/50">
                {concluidos}/{itens.length}
              </span>
            )}
          </div>
          {itens.length > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progresso}%` }} />
            </div>
          )}
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
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white"
              >
                Adicionar
              </button>
            </form>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Anexos {anexos.length > 0 && anexos.length}</h3>
          {anexos.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Nenhum anexo ainda.</p>
          ) : (
            <ul className="space-y-2">
              {anexos.map((anexo) => (
                <li key={anexo.id} className="rounded-md border border-black/10 p-2 text-sm dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{anexo.nome_referencia}</p>
                    <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                      v{anexo.versoes[anexo.versoes.length - 1]?.versao_numero}
                    </span>
                  </div>
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {[...anexo.versoes].reverse().map((versao) => (
                      <li key={versao.id} className="flex items-center justify-between text-xs">
                        <span className="text-black/60 dark:text-white/60">
                          v{versao.versao_numero} — {versao.uploaded_by.name} —{" "}
                          {new Date(versao.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">histórico</span>
                          <button onClick={() => handleDownload(versao.id, versao.nome_arquivo)} className="underline">
                            baixar
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {podeEditar && (
                    <label className="mt-2 inline-block cursor-pointer text-xs text-blue-600 underline dark:text-blue-400">
                      {uploading ? "Enviando..." : "Enviar nova versão"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => handleUpload(e, anexo.nome_referencia)}
                      />
                    </label>
                  )}
                </li>
              ))}
            </ul>
          )}

          {podeEditar && (
            <label className="block cursor-pointer rounded-md border border-dashed border-black/20 px-3 py-2 text-center text-xs text-black/60 dark:border-white/20 dark:text-white/60">
              {uploading ? "Enviando..." : "Enviar novo arquivo (gera nova versão)"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e)} />
            </label>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Comentários</h3>
          {comentarios.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">Nenhum comentário ainda.</p>
          ) : (
            <ul className="max-h-48 space-y-3 overflow-y-auto">
              {comentarios.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <Avatar id={c.autor.id} name={c.autor.name} />
                  <div className="flex-1 rounded-lg bg-black/[.03] px-3 py-2 text-sm dark:bg-white/[.06]">
                    <p className="flex items-baseline gap-2">
                      <span className="font-medium">{c.autor.name}</span>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap">{c.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddComentario} className="space-y-1 pt-1">
            <p className="text-xs text-black/50 dark:text-white/50">
              Use @Nome para mencionar e notificar um integrante do grupo.
            </p>
            <div className="flex gap-2">
              <input
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Escreva um comentário... (ex: @Maria pode revisar?)"
                className="flex-1 rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
              />
              <button
                type="submit"
                disabled={enviandoComentario || !novoComentario.trim()}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
