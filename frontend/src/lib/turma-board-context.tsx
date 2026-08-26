"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  api,
  ApiError,
  type Atividade,
  type AtividadeCreateInput,
  type Estagio,
  type Grupo,
  type Sprint,
  type Turma,
} from "./api";

type TurmaBoardContextValue = {
  turmaId: string;
  turma: Turma | null;
  outrasTurmas: Turma[];
  estagios: Estagio[];
  grupos: Grupo[];
  atividades: Atividade[];
  sprints: Sprint[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  refreshAll: () => Promise<void>;
  refreshAtividades: () => Promise<void>;

  createEstagio: (nome: string, isConclusao: boolean) => Promise<void>;
  updateEstagio: (
    estagioId: string,
    payload: Partial<Pick<Estagio, "nome" | "cor" | "is_conclusao">>
  ) => Promise<void>;
  deleteEstagio: (estagioId: string) => Promise<void>;
  reorderEstagios: (estagioIds: string[]) => Promise<void>;
  duplicarEstagios: (origemTurmaId: string) => Promise<void>;

  createGrupo: (nome: string, descricao?: string) => Promise<void>;
  updateGrupo: (grupoId: string, payload: Partial<Pick<Grupo, "nome" | "descricao">>) => Promise<void>;
  deleteGrupo: (grupoId: string) => Promise<void>;
  addMembro: (grupoId: string, userId: string) => Promise<void>;
  toggleGestor: (grupoId: string, userId: string, isGestor: boolean) => Promise<void>;
  removeMembro: (grupoId: string, userId: string) => Promise<void>;

  createAtividade: (grupoId: string, payload: AtividadeCreateInput) => Promise<Atividade>;
  updateAtividade: (atividadeId: string, payload: Partial<AtividadeCreateInput>) => Promise<void>;
  deleteAtividade: (atividadeId: string) => Promise<void>;
  moverAtividade: (atividadeId: string, estagioId: string) => Promise<void>;

  createSprint: (nome: string) => Promise<Sprint>;
  updateSprint: (sprintId: string, nome: string) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  updateSprintLocal: (sprintId: string, patch: Partial<Sprint>) => void;

  updateTurmaCronograma: (
    payload: Partial<
      Pick<Turma, "cronograma_inicio" | "duracao_sprint_semanas" | "total_sprints" | "sprint_atual">
    >
  ) => Promise<void>;
};

const TurmaBoardContext = createContext<TurmaBoardContextValue | null>(null);

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function TurmaBoardProvider({ turmaId, children }: { turmaId: string; children: React.ReactNode }) {
  const [turma, setTurma] = useState<Turma | null>(null);
  const [outrasTurmas, setOutrasTurmas] = useState<Turma[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshAtividades(gruposAtuais?: Grupo[]) {
    const lista = gruposAtuais ?? grupos;
    try {
      const porGrupo = await Promise.all(lista.map((g) => api.listAtividades(g.id)));
      setAtividades(porGrupo.flat());
    } catch (err) {
      setError(errMsg(err, "Erro ao carregar atividades"));
    }
  }

  async function refreshAll() {
    setLoading(true);
    try {
      const [turmasData, estagiosData, gruposData, sprintsData] = await Promise.all([
        api.listTurmas(),
        api.listEstagios(turmaId),
        api.listGrupos(turmaId),
        api.listSprints(turmaId),
      ]);
      setTurma(turmasData.find((t) => t.id === turmaId) ?? null);
      setOutrasTurmas(turmasData.filter((t) => t.id !== turmaId));
      setEstagios(estagiosData);
      setGrupos(gruposData);
      setSprints(sprintsData);
      await refreshAtividades(gruposData);
    } catch (err) {
      setError(errMsg(err, "Erro ao carregar o quadro"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId]);

  async function createEstagio(nome: string, isConclusao: boolean) {
    const estagio = await api.createEstagio(turmaId, nome, isConclusao);
    setEstagios((prev) => [...prev, estagio]);
  }

  async function updateEstagio(
    estagioId: string,
    payload: Partial<Pick<Estagio, "nome" | "cor" | "is_conclusao">>
  ) {
    const updated = await api.updateEstagio(estagioId, payload);
    setEstagios((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function deleteEstagio(estagioId: string) {
    await api.deleteEstagio(estagioId);
    setEstagios((prev) => prev.filter((e) => e.id !== estagioId));
  }

  async function reorderEstagios(estagioIds: string[]) {
    const updated = await api.reorderEstagios(turmaId, estagioIds);
    setEstagios(updated);
  }

  async function duplicarEstagios(origemTurmaId: string) {
    const duplicados = await api.duplicarEstagios(turmaId, origemTurmaId);
    setEstagios(duplicados);
  }

  async function createGrupo(nome: string, descricao?: string) {
    const grupo = await api.createGrupo(turmaId, nome, descricao);
    setGrupos((prev) => [...prev, grupo]);
  }

  async function updateGrupo(grupoId: string, payload: Partial<Pick<Grupo, "nome" | "descricao">>) {
    const updated = await api.updateGrupo(grupoId, payload);
    setGrupos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  async function deleteGrupo(grupoId: string) {
    await api.deleteGrupo(grupoId);
    setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
  }

  async function addMembro(grupoId: string, userId: string) {
    const updated = await api.addMembro(grupoId, userId, false);
    setGrupos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  async function toggleGestor(grupoId: string, userId: string, isGestor: boolean) {
    const updated = await api.updateMembro(grupoId, userId, !isGestor);
    setGrupos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  async function removeMembro(grupoId: string, userId: string) {
    const updated = await api.removeMembro(grupoId, userId);
    setGrupos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  async function createAtividade(grupoId: string, payload: AtividadeCreateInput) {
    const atividade = await api.createAtividade(grupoId, payload);
    setAtividades((prev) => [...prev, atividade]);
    return atividade;
  }

  async function updateAtividade(atividadeId: string, payload: Partial<AtividadeCreateInput>) {
    const updated = await api.updateAtividade(atividadeId, payload);
    setAtividades((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  async function deleteAtividade(atividadeId: string) {
    await api.deleteAtividade(atividadeId);
    setAtividades((prev) => prev.filter((a) => a.id !== atividadeId));
  }

  async function moverAtividade(atividadeId: string, estagioId: string) {
    const anterior = atividades.find((a) => a.id === atividadeId)?.estagio_id;
    setAtividades((prev) => prev.map((a) => (a.id === atividadeId ? { ...a, estagio_id: estagioId } : a)));
    try {
      const updated = await api.moverAtividade(atividadeId, estagioId);
      setAtividades((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      if (anterior) {
        setAtividades((prev) => prev.map((a) => (a.id === atividadeId ? { ...a, estagio_id: anterior } : a)));
      }
      throw err;
    }
  }

  async function createSprint(nome: string) {
    const sprint = await api.createSprint(turmaId, nome);
    setSprints((prev) => [...prev, sprint]);
    return sprint;
  }

  async function updateSprint(sprintId: string, nome: string) {
    const updated = await api.updateSprint(sprintId, nome);
    setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function deleteSprint(sprintId: string) {
    await api.deleteSprint(sprintId);
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
  }

  function updateSprintLocal(sprintId: string, patch: Partial<Sprint>) {
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? { ...s, ...patch } : s)));
  }

  async function updateTurmaCronograma(
    payload: Partial<
      Pick<Turma, "cronograma_inicio" | "duracao_sprint_semanas" | "total_sprints" | "sprint_atual">
    >
  ) {
    const updated = await api.updateTurma(turmaId, payload);
    setTurma(updated);
  }

  return (
    <TurmaBoardContext.Provider
      value={{
        turmaId,
        turma,
        outrasTurmas,
        estagios,
        grupos,
        atividades,
        sprints,
        loading,
        error,
        setError,
        refreshAll,
        refreshAtividades: () => refreshAtividades(),
        createEstagio,
        updateEstagio,
        deleteEstagio,
        reorderEstagios,
        duplicarEstagios,
        createGrupo,
        updateGrupo,
        deleteGrupo,
        addMembro,
        toggleGestor,
        removeMembro,
        createAtividade,
        updateAtividade,
        deleteAtividade,
        moverAtividade,
        createSprint,
        updateSprint,
        deleteSprint,
        updateSprintLocal,
        updateTurmaCronograma,
      }}
    >
      {children}
    </TurmaBoardContext.Provider>
  );
}

export function useTurmaBoard() {
  const ctx = useContext(TurmaBoardContext);
  if (!ctx) throw new Error("useTurmaBoard deve ser usado dentro de TurmaBoardProvider");
  return ctx;
}
