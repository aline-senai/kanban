"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("A confirmação não bate com a nova senha.");
      return;
    }

    setSubmitting(true);
    try {
      await api.resetPassword(token, senha);
      setSucesso(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Redefinir senha</h1>
          <p className="text-sm text-black/50 dark:text-white/50">Escolha uma nova senha para sua conta.</p>
        </div>

        {!token ? (
          <p className="text-sm text-red-600">
            Link de redefinição inválido. Solicite um novo em{" "}
            <Link href="/esqueci-senha" className="underline">
              Recuperar acesso
            </Link>
            .
          </p>
        ) : sucesso ? (
          <p className="rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
            Senha redefinida com sucesso. Levando você para o login...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="senha" className="text-sm font-medium">
                Nova senha
              </label>
              <input
                id="senha"
                type="password"
                required
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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
              {submitting ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="underline">
            ← Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
