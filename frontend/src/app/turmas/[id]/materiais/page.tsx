"use client";

import { useEffect, useRef, useState } from "react";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarMateriais } from "@/lib/permissions";
import { api, ApiError, type Material } from "@/lib/api";

export default function MateriaisPage() {
  const { turmaId, turma } = useTurmaBoard();
  const { effectiveRole } = useViewAs();
  const podeGerenciar = podeGerenciarMateriais(effectiveRole);

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [isModelo, setIsModelo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .listMateriais(turmaId)
      .then(setMateriais)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar materiais"))
      .finally(() => setLoading(false));
  }, [turmaId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setError(null);
    setEnviando(true);
    try {
      const material = await api.uploadMaterial(turmaId, arquivo, nome.trim() || undefined, isModelo);
      setMateriais((prev) => [material, ...prev]);
      setArquivo(null);
      setNome("");
      setIsModelo(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar arquivo");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDownload(material: Material) {
    setError(null);
    try {
      await api.downloadMaterial(material.id, material.nome);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao baixar arquivo");
    }
  }

  async function handleDelete(material: Material) {
    if (!window.confirm(`Remover o arquivo "${material.nome}"?`)) return;
    setError(null);
    try {
      await api.deleteMaterial(material.id);
      setMateriais((prev) => prev.filter((m) => m.id !== material.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover arquivo");
    }
  }

  const modelos = materiais.filter((m) => m.is_modelo);
  const outros = materiais.filter((m) => !m.is_modelo);

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-1 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
        <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">Pasta da turma</p>
        <p className="text-sm font-semibold">{turma?.nome ?? "Turma"}</p>
        <p className="text-xs text-black/50 dark:text-white/50">
          {materiais.length} arquivo{materiais.length === 1 ? "" : "s"} · {modelos.length} modelo
          {modelos.length === 1 ? "" : "s"}
        </p>
      </section>

      {podeGerenciar && (
        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
        >
          <h2 className="text-sm font-semibold">Adicionar arquivo</h2>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome de exibição (opcional)"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isModelo} onChange={(e) => setIsModelo(e.target.checked)} />
            Este arquivo deve ser usado como modelo
          </label>
          <button
            type="submit"
            disabled={!arquivo || enviando}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar arquivo"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-black/60 dark:text-white/60">Carregando...</p>
      ) : (
        <>
          <MateriaisSection
            titulo="Arquivos modelo"
            descricao="Arquivos que devem ser usados como modelo pelos grupos"
            materiais={modelos}
            podeGerenciar={podeGerenciar}
            onDownload={handleDownload}
            onDelete={handleDelete}
            vazio="Nenhum arquivo modelo disponível ainda."
          />

          <MateriaisSection
            titulo="Outros arquivos"
            descricao="Demais materiais de apoio da turma"
            materiais={outros}
            podeGerenciar={podeGerenciar}
            onDownload={handleDownload}
            onDelete={handleDelete}
            vazio="Nenhum outro arquivo disponível."
            ocultarSeVazio
          />
        </>
      )}
    </div>
  );
}

function MateriaisSection({
  titulo,
  descricao,
  materiais,
  podeGerenciar,
  onDownload,
  onDelete,
  vazio,
  ocultarSeVazio,
}: {
  titulo: string;
  descricao: string;
  materiais: Material[];
  podeGerenciar: boolean;
  onDownload: (material: Material) => void;
  onDelete: (material: Material) => void;
  vazio: string;
  ocultarSeVazio?: boolean;
}) {
  if (ocultarSeVazio && materiais.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <div>
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="text-xs text-black/50 dark:text-white/50">{descricao}</p>
      </div>

      {materiais.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">{vazio}</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {materiais.map((material) => (
            <li key={material.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{material.nome}</p>
                <p className="truncate text-xs text-black/50 dark:text-white/50">
                  Enviado por {material.uploaded_by.name} em{" "}
                  {new Date(material.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                <button onClick={() => onDownload(material)} className="underline">
                  baixar
                </button>
                {podeGerenciar && (
                  <button onClick={() => onDelete(material)} className="underline">
                    remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
