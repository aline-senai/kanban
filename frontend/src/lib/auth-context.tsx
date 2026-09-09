"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, clearToken, getToken, setToken, setUnauthorizedHandler, type User } from "./api";

const ROTA_TROCA_OBRIGATORIA = "/trocar-senha-obrigatoria";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: "aluno" | "professor"
  ) => Promise<{ pendenteAprovacao: boolean }>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.deve_trocar_senha && pathname !== ROTA_TROCA_OBRIGATORIA) {
      router.push(ROTA_TROCA_OBRIGATORIA);
    }
  }, [user, pathname, router]);

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    const me = await api.me();
    setUser(me);
    router.push(me.deve_trocar_senha ? ROTA_TROCA_OBRIGATORIA : "/turmas");
  }

  async function register(name: string, email: string, password: string, role: "aluno" | "professor" = "aluno") {
    const { access_token, pendente_aprovacao } = await api.register(name, email, password, role);
    if (pendente_aprovacao || !access_token) {
      return { pendenteAprovacao: true };
    }
    setToken(access_token);
    const me = await api.me();
    setUser(me);
    router.push("/turmas");
    return { pendenteAprovacao: false };
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  async function refreshMe() {
    const me = await api.me();
    setUser(me);
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      router.push("/login");
    });
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
