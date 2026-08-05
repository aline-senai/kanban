"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

const DEMO_EMAILS = {
  professor: "professor@demo.senai.br",
  gestor: "gestor@demo.senai.br",
  integrante: "integrante@demo.senai.br",
} as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoAtivo, setDemoAtivo] = useState<keyof typeof DEMO_EMAILS | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fazer login");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemo(papel: keyof typeof DEMO_EMAILS) {
    setDemoAtivo(papel);
    setEmail(DEMO_EMAILS[papel]);
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="flex flex-1 flex-col justify-between bg-slate-900 px-8 py-10 text-white sm:px-12 sm:py-16 md:py-20">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-600" />
          <span className="font-semibold">Quadro SENAI</span>
        </div>

        <div className="max-w-md space-y-6">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            Gestão de atividades por turma
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            O quadro da turma, do backlog à aprovação.
          </h1>
          <p className="text-sm text-white/60">
            Professores criam os estágios e as atividades. Gestores distribuem. Integrantes movem, anexam
            e comentam.
          </p>
        </div>

        <div className="hidden gap-8 text-sm text-white/50 sm:flex">
          <span>Quadro Kanban por turma</span>
          <span>Cronograma de sprints</span>
          <span>Relatórios de conclusão</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Entrar</h2>
            <p className="text-sm text-black/50 dark:text-white/50">Use suas credenciais institucionais.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setDemoAtivo(null);
              }}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Entrando..." : "Entrar no quadro"}
          </button>

          <div className="space-y-2 pt-2">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
              Entrar como (demo)
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(
                [
                  ["professor", "Professor"],
                  ["gestor", "Gestora"],
                  ["integrante", "Integrante"],
                ] as const
              ).map(([papel, label]) => (
                <button
                  key={papel}
                  type="button"
                  onClick={() => handleDemo(papel)}
                  className={`rounded-md border px-2 py-2 ${
                    demoAtivo === papel
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-black/15 dark:border-white/15"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
