const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "kanban_token";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

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
  // Ao enviar FormData o browser define o Content-Type (multipart) com o boundary correto.
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, body.detail ?? "Erro na requisição");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Erro ao baixar arquivo");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: "professor" | "aluno";
  notif_atribuicao: boolean;
  notif_prazo: boolean;
  notif_comentario: boolean;
};

export type Turma = {
  id: string;
  nome: string;
  professor_id: string;
  arquivada: boolean;
  created_at: string;
  cronograma_inicio: string | null;
  duracao_sprint_semanas: number;
  total_sprints: number;
  sprint_atual: number;
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
  descricao: string | null;
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

export type Prioridade = "baixa" | "media" | "alta";

export type Atividade = {
  id: string;
  grupo_id: string;
  estagio_id: string;
  criador_id: string;
  numero: number;
  nome: string;
  texto: string | null;
  prioridade: Prioridade;
  estimativa_horas: number | null;
  data_criacao: string;
  data_inicio: string | null;
  data_inicio_estagio: string;
  data_fim: string | null;
  responsaveis: User[];
  criador: User;
  sprint_id: string | null;
  sprint_nome: string | null;
};

export type AtividadeResumo = {
  id: string;
  numero: number;
  nome: string;
  grupo_id: string;
  grupo_nome: string;
  estagio_id: string;
  estagio_nome: string;
};

export type AtividadeVinculo = {
  id: string;
  atividade: AtividadeResumo;
};

export type HistoricoEntry = {
  id: string;
  estagio_de_id: string | null;
  estagio_de_nome: string | null;
  estagio_para_id: string;
  estagio_para_nome: string;
  user_id: string;
  user_name: string;
  created_at: string;
  duracao_segundos: number;
};

export type AtividadeCreateInput = {
  estagio_id: string;
  nome: string;
  texto?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  responsavel_ids?: string[];
  prioridade?: Prioridade;
  estimativa_horas?: number | null;
  sprint_id?: string | null;
};

export type SprintPlanning = {
  id: string;
  sprint_id: string;
  grupo_id: string;
  grupo_nome: string;
  data: string | null;
  texto: string | null;
  criado_por: User;
  created_at: string;
  updated_at: string | null;
};

export type SprintReview = {
  id: string;
  sprint_id: string;
  grupo_id: string;
  grupo_nome: string;
  data: string | null;
  texto: string | null;
  criado_por: User;
  created_at: string;
  updated_at: string | null;
};

export type Sprint = {
  id: string;
  turma_id: string;
  nome: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  plannings: SprintPlanning[];
  reviews: SprintReview[];
};

export type SprintCreateInput = {
  nome: string;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export type SprintUpdateInput = {
  nome?: string;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export type PastaCompartilhada = {
  id: string;
  turma_id: string;
  nome: string;
  url: string;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  atividade_id: string;
  texto: string;
  concluido: boolean;
  ordem: number;
};

export type AnexoVersao = {
  id: string;
  versao_numero: number;
  nome_arquivo: string;
  uploaded_by: User;
  created_at: string;
};

export type Anexo = {
  id: string;
  atividade_id: string;
  nome_referencia: string;
  created_at: string;
  versoes: AnexoVersao[];
};

export type Material = {
  id: string;
  turma_id: string;
  nome: string;
  is_modelo: boolean;
  uploaded_by: User;
  created_at: string;
};

export type Comentario = {
  id: string;
  atividade_id: string;
  autor: User;
  texto: string;
  created_at: string;
};

export type Notificacao = {
  id: string;
  atividade_id: string | null;
  tipo: "atribuicao" | "mencao" | "comentario" | "prazo_proximo";
  texto: string;
  lida: boolean;
  created_at: string;
};

export type ConclusaoGrupo = {
  grupo_id: string;
  grupo_nome: string;
  total_atividades: number;
  concluidas: number;
  percentual: number;
};

export type AtividadeAtrasada = {
  atividade_id: string;
  nome: string;
  grupo_id: string;
  grupo_nome: string;
  estagio_nome: string;
  data_fim: string;
  responsaveis: string[];
};

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, senhaNova: string) =>
    request<void>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, senha_nova: senhaNova }),
    }),
  me: () => request<User>("/auth/me"),
  updateMe: (
    payload: Partial<Pick<User, "name" | "email" | "notif_atribuicao" | "notif_prazo" | "notif_comentario">>
  ) => request<User>("/auth/me", { method: "PATCH", body: JSON.stringify(payload) }),
  changePassword: (senhaAtual: string, senhaNova: string) =>
    request<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
    }),
  listTurmas: () => request<Turma[]>("/turmas"),
  createTurma: (nome: string) =>
    request<Turma>("/turmas", { method: "POST", body: JSON.stringify({ nome }) }),
  updateTurma: (
    id: string,
    payload: Partial<
      Pick<
        Turma,
        "nome" | "arquivada" | "cronograma_inicio" | "duracao_sprint_semanas" | "total_sprints" | "sprint_atual"
      >
    >
  ) => request<Turma>(`/turmas/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listAlunos: () => request<User[]>("/users"),
  createAluno: (name: string, email: string, password: string) =>
    request<User>("/users", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  listGrupos: (turmaId: string) => request<Grupo[]>(`/turmas/${turmaId}/grupos`),
  createGrupo: (turmaId: string, nome: string, descricao?: string) =>
    request<Grupo>(`/turmas/${turmaId}/grupos`, {
      method: "POST",
      body: JSON.stringify({ nome, descricao }),
    }),
  updateGrupo: (grupoId: string, payload: Partial<Pick<Grupo, "nome" | "descricao">>) =>
    request<Grupo>(`/grupos/${grupoId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteGrupo: (grupoId: string) => request<void>(`/grupos/${grupoId}`, { method: "DELETE" }),
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
  listHistorico: (atividadeId: string) => request<HistoricoEntry[]>(`/atividades/${atividadeId}/historico`),
  deleteAtividade: (atividadeId: string) => request<void>(`/atividades/${atividadeId}`, { method: "DELETE" }),

  listVinculos: (atividadeId: string) => request<AtividadeVinculo[]>(`/atividades/${atividadeId}/vinculos`),
  createVinculo: (atividadeId: string, atividadeVinculadaId: string) =>
    request<AtividadeVinculo>(`/atividades/${atividadeId}/vinculos`, {
      method: "POST",
      body: JSON.stringify({ atividade_vinculada_id: atividadeVinculadaId }),
    }),
  deleteVinculo: (atividadeId: string, vinculadaId: string) =>
    request<void>(`/atividades/${atividadeId}/vinculos/${vinculadaId}`, { method: "DELETE" }),

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

  listAnexos: (atividadeId: string) => request<Anexo[]>(`/atividades/${atividadeId}/anexos`),
  uploadAnexo: (atividadeId: string, file: File, nomeReferencia?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (nomeReferencia) formData.append("nome_referencia", nomeReferencia);
    return request<Anexo>(`/atividades/${atividadeId}/anexos`, { method: "POST", body: formData });
  },
  downloadAnexoVersao: (versaoId: string, nomeArquivo: string) =>
    downloadFile(`/anexo-versoes/${versaoId}/download`, nomeArquivo),

  listSprints: (turmaId: string) => request<Sprint[]>(`/turmas/${turmaId}/sprints`),
  createSprint: (turmaId: string, payload: SprintCreateInput) =>
    request<Sprint>(`/turmas/${turmaId}/sprints`, { method: "POST", body: JSON.stringify(payload) }),
  updateSprint: (sprintId: string, payload: SprintUpdateInput) =>
    request<Sprint>(`/sprints/${sprintId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSprint: (sprintId: string) => request<void>(`/sprints/${sprintId}`, { method: "DELETE" }),
  reorderSprints: (turmaId: string, sprintIds: string[]) =>
    request<Sprint[]>(`/turmas/${turmaId}/sprints/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ sprint_ids: sprintIds }),
    }),

  createPlanning: (sprintId: string, payload: { grupo_id: string; data?: string | null; texto?: string | null }) =>
    request<SprintPlanning>(`/sprints/${sprintId}/planning`, { method: "POST", body: JSON.stringify(payload) }),
  updatePlanning: (
    sprintId: string,
    grupoId: string,
    payload: { data?: string | null; texto?: string | null }
  ) =>
    request<SprintPlanning>(`/sprints/${sprintId}/planning/${grupoId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePlanning: (sprintId: string, grupoId: string) =>
    request<void>(`/sprints/${sprintId}/planning/${grupoId}`, { method: "DELETE" }),

  createReview: (sprintId: string, payload: { grupo_id: string; data?: string | null; texto?: string | null }) =>
    request<SprintReview>(`/sprints/${sprintId}/review`, { method: "POST", body: JSON.stringify(payload) }),
  updateReview: (
    sprintId: string,
    grupoId: string,
    payload: { data?: string | null; texto?: string | null }
  ) =>
    request<SprintReview>(`/sprints/${sprintId}/review/${grupoId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteReview: (sprintId: string, grupoId: string) =>
    request<void>(`/sprints/${sprintId}/review/${grupoId}`, { method: "DELETE" }),

  listPastas: (turmaId: string) => request<PastaCompartilhada[]>(`/turmas/${turmaId}/pastas`),
  createPasta: (turmaId: string, nome: string, url: string) =>
    request<PastaCompartilhada>(`/turmas/${turmaId}/pastas`, {
      method: "POST",
      body: JSON.stringify({ nome, url }),
    }),
  deletePasta: (pastaId: string) => request<void>(`/pastas/${pastaId}`, { method: "DELETE" }),

  listMateriais: (turmaId: string) => request<Material[]>(`/turmas/${turmaId}/materiais`),
  uploadMaterial: (turmaId: string, file: File, nome?: string, isModelo = true) => {
    const formData = new FormData();
    formData.append("file", file);
    if (nome) formData.append("nome", nome);
    formData.append("is_modelo", String(isModelo));
    return request<Material>(`/turmas/${turmaId}/materiais`, { method: "POST", body: formData });
  },
  downloadMaterial: (materialId: string, nomeArquivo: string) =>
    downloadFile(`/materiais/${materialId}/download`, nomeArquivo),
  deleteMaterial: (materialId: string) => request<void>(`/materiais/${materialId}`, { method: "DELETE" }),

  listComentarios: (atividadeId: string) => request<Comentario[]>(`/atividades/${atividadeId}/comentarios`),
  createComentario: (atividadeId: string, texto: string) =>
    request<Comentario>(`/atividades/${atividadeId}/comentarios`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }),

  listNotificacoes: () => request<Notificacao[]>("/notificacoes"),
  marcarNotificacaoLida: (id: string) => request<Notificacao>(`/notificacoes/${id}`, { method: "PATCH" }),
  marcarTodasNotificacoesLidas: () =>
    request<void>("/notificacoes/marcar-todas-lidas", { method: "POST" }),

  relatorioConclusao: (turmaId: string) =>
    request<ConclusaoGrupo[]>(`/turmas/${turmaId}/relatorio/conclusao`),
  relatorioAtrasadas: (turmaId: string) =>
    request<AtividadeAtrasada[]>(`/turmas/${turmaId}/relatorio/atrasadas`),
  exportarAtrasadasCsv: (turmaId: string, nomeArquivo: string) =>
    downloadFile(`/turmas/${turmaId}/relatorio/atrasadas.csv`, nomeArquivo),
};

export { ApiError };
