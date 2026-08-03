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
};

export { ApiError };
