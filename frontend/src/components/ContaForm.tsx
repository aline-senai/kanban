"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Avatar } from "./Avatar";

export function ContaForm() {
  const { user, refreshMe } = useAuth();

  const [nome, setNome] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [notifAtribuicao, setNotifAtribuicao] = useState(user?.notif_atribuicao ?? true);
  const [notifPrazo, setNotifPrazo] = useState(user?.notif_prazo ?? true);
  const [notifComentario, setNotifComentario] = useState(user?.notif_comentario ?? false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSucesso(false);
    setSubmitting(true);
    try {
      await api.updateMe({
        name: nome.trim(),
        email: email.trim(),
        notif_atribuicao: notifAtribuicao,
        notif_prazo: notifPrazo,
        notif_comentario: notifComentario,
      });
      await refreshMe();
      setSucesso(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar alterações");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(false);

    if (senhaNova.length < 8) {
      setErroSenha("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senhaNova !== confirmarSenha) {
      setErroSenha("A confirmação não bate com a nova senha.");
      return;
    }

    setTrocandoSenha(true);
    try {
      await api.changePassword(senhaAtual, senhaNova);
      setSucessoSenha(true);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmarSenha("");
    } catch (err) {
      setErroSenha(err instanceof ApiError ? err.message : "Erro ao trocar senha");
    } finally {
      setTrocandoSenha(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <Avatar id={user.id} name={user.name} size="md" />
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-black/50 dark:text-white/50">
              {user.role === "professor" ? "Professor" : "Integrante"} · {user.email}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Notificações por e-mail</h2>
          <ToggleRow
            label="Quando uma atividade é atribuída a mim"
            checked={notifAtribuicao}
            onChange={setNotifAtribuicao}
          />
          <ToggleRow
            label="Quando o prazo está a 2 dias do vencimento"
            checked={notifPrazo}
            onChange={setNotifPrazo}
          />
          <ToggleRow
            label="Novos comentários nos cards que acompanho"
            checked={notifComentario}
            onChange={setNotifComentario}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {sucesso && <p className="text-sm text-green-600">Alterações salvas.</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-slate-900">
        <button onClick={() => setMostrarSenha((v) => !v)} className="text-sm font-semibold underline">
          {mostrarSenha ? "Ocultar" : "Alterar senha"}
        </button>

        {mostrarSenha && (
          <form onSubmit={handleTrocarSenha} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Senha atual</label>
              <input
                type="password"
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nova senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
              />
            </div>

            {erroSenha && <p className="text-sm text-red-600">{erroSenha}</p>}
            {sucessoSenha && <p className="text-sm text-green-600">Senha alterada com sucesso.</p>}

            <button
              type="submit"
              disabled={trocandoSenha}
              className="w-full rounded-md border border-black/15 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/15"
            >
              {trocandoSenha ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-black/15 dark:bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="flex-1">{label}</span>
    </label>
  );
}
