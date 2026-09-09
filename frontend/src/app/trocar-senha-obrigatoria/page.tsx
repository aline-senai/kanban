"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export default function TrocarSenhaObrigatoriaPage() {
  const { user, loading, refreshMe, logout } = useAuth();
  const router = useRouter();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && !user.deve_trocar_senha) router.push("/turmas");
  }, [loading, user, router]);

  if (loading || !user || !user.deve_trocar_senha) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senhaNova.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senhaNova !== confirmarSenha) {
      setError("A confirmação não bate com a nova senha.");
      return;
    }

    setSubmitting(true);
    try {
      await api.changePassword(senhaAtual, senhaNova);
      await refreshMe();
      router.push("/turmas");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar a senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Crie uma nova senha</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            Sua senha foi redefinida por um professor. Antes de continuar, crie uma senha só sua.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="senhaAtual" className="text-sm font-medium">
            Senha temporária recebida
          </label>
          <input
            id="senhaAtual"
            type="password"
            required
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="senhaNova" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="senhaNova"
            type="password"
            required
            minLength={8}
            value={senhaNova}
            onChange={(e) => setSenhaNova(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <p className="text-xs text-black/50 dark:text-white/50">Mínimo de 8 caracteres.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmarSenha" className="text-sm font-medium">
            Confirmar nova senha
          </label>
          <input
            id="confirmarSenha"
            type="password"
            required
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Salvando..." : "Salvar e continuar"}
        </button>

        <button type="button" onClick={logout} className="w-full text-center text-sm underline">
          Sair
        </button>
      </form>
    </div>
  );
}
