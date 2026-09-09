"use client";

import { useState } from "react";

export function SenhaTemporariaModal({
  nome,
  senha,
  onClose,
}: {
  nome: string;
  senha: string;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — a senha ainda pode ser selecionada manualmente
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-lg bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold">Senha temporária de {nome}</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Repasse essa senha para {nome} e peça para trocar assim que entrar no sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 dark:border-white/15">
          <code className="flex-1 select-all font-mono text-sm">{senha}</code>
          <button
            onClick={handleCopiar}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-md border border-black/15 py-2 text-sm dark:border-white/15"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
