"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export default function ContaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSucesso(false);

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
      setSucesso(true);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmarSenha("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao trocar senha");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto w-full max-w-sm flex-1 space-y-8 px-4 py-10">
      <div>
        <Link href="/turmas" className="text-sm underline">
          ← Voltar
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Minha conta</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        {user.name} · {user.email}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-black/10 p-6 dark:border-white/10">
        <h2 className="text-sm font-semibold">Trocar senha</h2>

        <div className="space-y-1">
          <label htmlFor="senhaAtual" className="text-sm font-medium">
            Senha atual
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
        {sucesso && <p className="text-sm text-green-600">Senha alterada com sucesso.</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-foreground py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
