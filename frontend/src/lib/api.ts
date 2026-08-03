const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "kanban_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Erro na requisição");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: "professor" | "aluno";
};

export type Turma = {
  id: string;
  nome: string;
  professor_id: string;
  arquivada: boolean;
  created_at: string;
};

export type GrupoMembro = {
  id: string;
  is_gestor: boolean;
  user: User;
};

export type Grupo = {
  id: string;
  turma_id: string;
  nome: string;
  membros: GrupoMembro[];
};

export type Estagio = {
  id: string;
  turma_id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  is_conclusao: boolean;
};

export type Atividade = {
  id: string;
  grupo_id: string;
  estagio_id: string;
  criador_id: string;
  nome: string;
  texto: string | null;
  data_criacao: string;
  data_inicio: string | null;
  data_inicio_estagio: string;
  data_fim: string | null;
  responsaveis: User[];
};

export type AtividadeCreateInput = {
  estagio_id: string;
  nome: string;
  texto?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  responsavel_ids?: string[];
};

export type ChecklistItem = {
  id: string;
  atividade_id: string;
  texto: string;
  concluido: boolean;
  ordem: number;
};

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),
  listTurmas: () => request<Turma[]>("/turmas"),
  createTurma: (nome: string) =>
    request<Turma>("/turmas", { method: "POST", body: JSON.stringify({ nome }) }),
  updateTurma: (id: string, payload: Partial<Pick<Turma, "nome" | "arquivada">>) =>
    request<Turma>(`/turmas/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listAlunos: () => request<User[]>("/users"),
  createAluno: (name: string, email: string, password: string) =>
    request<User>("/users", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  listGrupos: (turmaId: string) => request<Grupo[]>(`/turmas/${turmaId}/grupos`),
  createGrupo: (turmaId: string, nome: string) =>
    request<Grupo>(`/turmas/${turmaId}/grupos`, { method: "POST", body: JSON.stringify({ nome }) }),
  addMembro: (grupoId: string, userId: string, isGestor: boolean) =>
    request<Grupo>(`/grupos/${grupoId}/membros`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, is_gestor: isGestor }),
    }),
  updateMembro: (grupoId: string, userId: string, isGestor: boolean) =>
    request<Grupo>(`/grupos/${grupoId}/membros/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_gestor: isGestor }),
    }),
  removeMembro: (grupoId: string, userId: string) =>
    request<Grupo>(`/grupos/${grupoId}/membros/${userId}`, { method: "DELETE" }),

  listEstagios: (turmaId: string) => request<Estagio[]>(`/turmas/${turmaId}/estagios`),
  createEstagio: (turmaId: string, nome: string, isConclusao: boolean) =>
    request<Estagio>(`/turmas/${turmaId}/estagios`, {
      method: "POST",
      body: JSON.stringify({ nome, is_conclusao: isConclusao }),
    }),
  updateEstagio: (estagioId: string, payload: Partial<Pick<Estagio, "nome" | "cor" | "is_conclusao">>) =>
    request<Estagio>(`/estagios/${estagioId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteEstagio: (estagioId: string) =>
    request<void>(`/estagios/${estagioId}`, { method: "DELETE" }),
  reorderEstagios: (turmaId: string, estagioIds: string[]) =>
    request<Estagio[]>(`/turmas/${turmaId}/estagios/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ estagio_ids: estagioIds }),
    }),
  duplicarEstagios: (turmaId: string, origemTurmaId: string) =>
    request<Estagio[]>(`/turmas/${turmaId}/estagios/duplicar`, {
      method: "POST",
      body: JSON.stringify({ origem_turma_id: origemTurmaId }),
    }),

  listAtividades: (grupoId: string) => request<Atividade[]>(`/grupos/${grupoId}/atividades`),
  createAtividade: (grupoId: string, payload: AtividadeCreateInput) =>
    request<Atividade>(`/grupos/${grupoId}/atividades`, { method: "POST", body: JSON.stringify(payload) }),
  updateAtividade: (atividadeId: string, payload: Partial<AtividadeCreateInput>) =>
    request<Atividade>(`/atividades/${atividadeId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  moverAtividade: (atividadeId: string, estagioId: string) =>
    request<Atividade>(`/atividades/${atividadeId}/mover`, {
      method: "PATCH",
      body: JSON.stringify({ estagio_id: estagioId }),
    }),

  listChecklist: (atividadeId: string) => request<ChecklistItem[]>(`/atividades/${atividadeId}/checklist`),
  createChecklistItem: (atividadeId: string, texto: string) =>
    request<ChecklistItem>(`/atividades/${atividadeId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }),
  updateChecklistItem: (itemId: string, payload: Partial<Pick<ChecklistItem, "texto" | "concluido">>) =>
    request<ChecklistItem>(`/checklist/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteChecklistItem: (itemId: string) =>
    request<void>(`/checklist/${itemId}`, { method: "DELETE" }),
};

export { ApiError };
