"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function CadastroPage() {
  const { register } = useAuth();
  const [papel, setPapel] = useState<"aluno" | "professor">("aluno");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendente, setPendente] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("A confirmação não bate com a senha.");
      return;
    }

    setSubmitting(true);
    try {
      const { pendenteAprovacao } = await register(nome, email, senha, papel);
      if (pendenteAprovacao) setPendente(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendente) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Cadastro enviado</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Sua conta de professor foi criada, mas precisa ser aprovada por um professor que já tenha acesso
            ao sistema. Você recebe acesso assim que alguém aprovar.
          </p>
          <Link href="/login" className="inline-block text-sm underline">
            ← Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {papel === "aluno"
              ? "Seu acesso será criado como integrante. O gestor da turma adiciona você a um grupo depois."
              : "Cadastro de professor precisa ser aprovado por um professor já existente antes de liberar o acesso."}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Eu sou</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPapel("aluno")}
              className={`rounded-md border px-3 py-2 ${
                papel === "aluno"
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 dark:border-white/15"
              }`}
            >
              Aluno
            </button>
            <button
              type="button"
              onClick={() => setPapel("professor")}
              className={`rounded-md border px-3 py-2 ${
                papel === "professor"
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 dark:border-white/15"
              }`}
            >
              Professor
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="nome" className="text-sm font-medium">
            Nome
          </label>
          <input
            id="nome"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
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
            Confirmar senha
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
          {submitting ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
