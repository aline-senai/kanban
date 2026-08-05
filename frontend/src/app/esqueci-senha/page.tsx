"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível processar o pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Recuperar acesso</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            Informe seu e-mail institucional. Se houver uma conta, você recebe um link para redefinir a senha.
          </p>
        </div>

        {enviado ? (
          <p className="rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
            Se {email} estiver cadastrado, um e-mail com o link de redefinição foi enviado. Confira também a
            caixa de spam.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar link de recuperação"}
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
