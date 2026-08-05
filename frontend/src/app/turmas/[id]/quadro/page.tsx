"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTurmaBoard } from "@/lib/turma-board-context";
import { useViewAs } from "@/lib/view-as-context";
import { podeGerenciarAtividades } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { CardDetailModal } from "@/components/CardDetailModal";
import { getEstagioFinalId, isAtrasada as calcIsAtrasada } from "@/lib/atividade-status";
import { ApiError, type Atividade, type Estagio, type Grupo, type Prioridade } from "@/lib/api";

const ESTAGIO_CORES_DEFAULT = ["bg-slate-400", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];
const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: "bg-slate-400",
  media: "bg-amber-500",
  alta: "bg-red-500",
};

type FiltroPrazo = "todos" | "atrasado" | "em_dia" | "sem_prazo";

export default function QuadroPage() {
  const { estagios, grupos, atividades, moverAtividade, createAtividade, setError } = useTurmaBoard();
  const { effectiveRole } = useViewAs();

  const [busca, setBusca] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todos");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [modo, setModo] = useState<"colunas" | "raias">("colunas");
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);
  const [novaAtividadeEstagio, setNovaAtividadeEstagio] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const podeGerenciar = podeGerenciarAtividades(effectiveRole);

  const estagioFinalId = getEstagioFinalId(estagios);

  function isAtrasada(atividade: Atividade) {
    return calcIsAtrasada(atividade, estagioFinalId);
  }

  function passaNosFiltros(atividade: Atividade) {
    if (busca && !atividade.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroResponsavel && !atividade.responsaveis.some((r) => r.id === filtroResponsavel)) return false;
    if (filtroGrupo && atividade.grupo_id !== filtroGrupo) return false;
    if (filtroPrazo === "sem_prazo" && atividade.data_fim) return false;
    if (filtroPrazo === "atrasado" && !isAtrasada(atividade)) return false;
    if (filtroPrazo === "em_dia" && isAtrasada(atividade)) return false;
    return true;
  }

  const atividadesFiltradas = atividades.filter(passaNosFiltros);
  const membrosUnicos = Array.from(
    new Map(grupos.flatMap((g) => g.membros.map((m) => [m.user.id, m.user] as const))).values()
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const atividadeId = String(active.id);
    const novoEstagioId = String(over.id);
    const atividade = atividades.find((a) => a.id === atividadeId);
    if (!atividade || atividade.estagio_id === novoEstagioId) return;
    try {
      await moverAtividade(atividadeId, novoEstagioId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao mover atividade");
    }
  }

  if (estagios.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Nenhum estágio criado ainda. Configure em &ldquo;Equipe e grupos&rdquo;.
      </p>
    );
  }

  const gruposParaRaias = filtroGrupo ? grupos.filter((g) => g.id === filtroGrupo) : grupos;
  const grupoUnico = grupos.length === 1 ? grupos[0] : undefined;
  const grupoParaCriar = grupos.find((g) => g.id === filtroGrupo) ?? grupoUnico;
  const grupoNomePorId = Object.fromEntries(grupos.map((g) => [g.id, g.nome]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar atividade..."
          className="min-w-[220px] flex-1 rounded-md border border-black/15 bg-background px-3 py-2 text-sm dark:border-white/15"
        />
        <select
          value={filtroResponsavel}
          onChange={(e) => setFiltroResponsavel(e.target.value)}
          className="rounded-md border border-black/15 bg-background px-2 py-2 text-sm dark:border-white/15"
        >
          <option value="">Todos os responsáveis</option>
          {membrosUnicos.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={filtroPrazo}
          onChange={(e) => setFiltroPrazo(e.target.value as FiltroPrazo)}
          className="rounded-md border border-black/15 bg-background px-2 py-2 text-sm dark:border-white/15"
        >
          <option value="todos">Prazo: todos</option>
          <option value="atrasado">Atrasadas</option>
          <option value="em_dia">Em dia</option>
          <option value="sem_prazo">Sem prazo</option>
        </select>
        {grupos.length > 1 && (
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="rounded-md border border-black/15 bg-background px-2 py-2 text-sm dark:border-white/15"
          >
            <option value="">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        )}
        {grupos.length > 1 && (
          <div className="flex overflow-hidden rounded-md border border-black/15 text-sm dark:border-white/15">
            <button
              onClick={() => setModo("colunas")}
              className={`px-3 py-2 ${modo === "colunas" ? "bg-black/5 font-medium dark:bg-white/10" : ""}`}
            >
              Colunas
            </button>
            <button
              onClick={() => setModo("raias")}
              className={`px-3 py-2 ${modo === "raias" ? "bg-black/5 font-medium dark:bg-white/10" : ""}`}
            >
              Raias por grupo
            </button>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {modo === "colunas" ? (
          <Colunas
            estagios={estagios}
            atividades={atividadesFiltradas}
            isAtrasada={isAtrasada}
            podeGerenciar={podeGerenciar}
            novaAtividadeEstagio={novaAtividadeEstagio}
            setNovaAtividadeEstagio={setNovaAtividadeEstagio}
            onSelecionar={setAtividadeSelecionada}
            grupoParaCriar={grupoParaCriar}
            createAtividade={createAtividade}
            grupoNomePorId={!filtroGrupo && grupos.length > 1 ? grupoNomePorId : undefined}
          />
        ) : (
          <div className="space-y-8">
            {gruposParaRaias.map((g) => (
              <div key={g.id} className="space-y-2">
                <h3 className="text-sm font-semibold">{g.nome}</h3>
                <Colunas
                  estagios={estagios}
                  atividades={atividadesFiltradas.filter((a) => a.grupo_id === g.id)}
                  isAtrasada={isAtrasada}
                  podeGerenciar={podeGerenciar}
                  novaAtividadeEstagio={novaAtividadeEstagio}
                  setNovaAtividadeEstagio={setNovaAtividadeEstagio}
                  onSelecionar={setAtividadeSelecionada}
                  grupoParaCriar={g}
                  createAtividade={createAtividade}
                />
              </div>
            ))}
          </div>
        )}
      </DndContext>

      {atividadeSelecionada && (
        <CardDetailModal atividadeId={atividadeSelecionada} onClose={() => setAtividadeSelecionada(null)} />
      )}
    </div>
  );
}

function Colunas({
  estagios,
  atividades,
  isAtrasada,
  podeGerenciar,
  novaAtividadeEstagio,
  setNovaAtividadeEstagio,
  onSelecionar,
  grupoParaCriar,
  createAtividade,
  grupoNomePorId,
}: {
  estagios: Estagio[];
  atividades: Atividade[];
  isAtrasada: (a: Atividade) => boolean;
  podeGerenciar: boolean;
  novaAtividadeEstagio: string | null;
  setNovaAtividadeEstagio: (id: string | null) => void;
  onSelecionar: (id: string) => void;
  grupoParaCriar?: Grupo;
  createAtividade: ReturnType<typeof useTurmaBoard>["createAtividade"];
  grupoNomePorId?: Record<string, string>;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {estagios.map((estagio, index) => {
        const doEstagio = atividades.filter((a) => a.estagio_id === estagio.id);
        const totalHoras = doEstagio.reduce((acc, a) => acc + (a.estimativa_horas ?? 0), 0);
        const cor = estagio.cor ?? ESTAGIO_CORES_DEFAULT[index % ESTAGIO_CORES_DEFAULT.length];

        return (
          <ColumnDropZone key={estagio.id} estagioId={estagio.id}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
                {estagio.nome}
                <span className="text-black/40 dark:text-white/40">{doEstagio.length}</span>
              </span>
              {totalHoras > 0 && <span className="text-xs text-black/40 dark:text-white/40">{totalHoras}h</span>}
            </div>

            <div className="space-y-2">
              {doEstagio.map((atividade) => (
                <DraggableCard key={atividade.id} atividadeId={atividade.id}>
                  <div
                    onClick={() => onSelecionar(atividade.id)}
                    className={`cursor-pointer space-y-1.5 rounded-md border p-2.5 text-sm shadow-sm ${
                      isAtrasada(atividade)
                        ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-950/30"
                        : "border-black/10 bg-white dark:border-white/10 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-black/40 dark:text-white/40">
                        AT-{String(atividade.numero).padStart(3, "0")}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${PRIORIDADE_COR[atividade.prioridade]}`} />
                    </div>
                    <p className="font-medium">{atividade.nome}</p>
                    {grupoNomePorId && (
                      <p className="text-xs text-black/50 dark:text-white/50">{grupoNomePorId[atividade.grupo_id]}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {atividade.data_fim && (
                        <span
                          className={`text-xs ${
                            isAtrasada(atividade)
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-black/50 dark:text-white/50"
                          }`}
                        >
                          {isAtrasada(atividade) ? "Atrasada — " : ""}
                          {new Date(atividade.data_fim).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {atividade.responsaveis.length > 0 && (
                        <span className="flex -space-x-1.5">
                          {atividade.responsaveis.map((r) => (
                            <Avatar key={r.id} id={r.id} name={r.name} />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </DraggableCard>
              ))}
            </div>

            {podeGerenciar && grupoParaCriar && (
              <div className="mt-3">
                {novaAtividadeEstagio === estagio.id ? (
                  <NovaAtividadeForm
                    membros={grupoParaCriar.membros}
                    onCancel={() => setNovaAtividadeEstagio(null)}
                    onCreate={async (nome, responsavelIds) => {
                      await createAtividade(grupoParaCriar.id, {
                        estagio_id: estagio.id,
                        nome,
                        responsavel_ids: responsavelIds,
                      });
                      setNovaAtividadeEstagio(null);
                    }}
                  />
                ) : (
                  <button onClick={() => setNovaAtividadeEstagio(estagio.id)} className="text-xs underline">
                    + Nova atividade
                  </button>
                )}
              </div>
            )}
          </ColumnDropZone>
        );
      })}
    </div>
  );
}

function ColumnDropZone({ estagioId, children }: { estagioId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: estagioId });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-lg border bg-slate-100/60 p-3 transition-colors dark:bg-slate-900/40 ${
        isOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-black/10 dark:border-white/10"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableCard({ atividadeId, children }: { atividadeId: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: atividadeId });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

function NovaAtividadeForm({
  membros,
  onCreate,
  onCancel,
}: {
  membros: Grupo["membros"];
  onCreate: (nome: string, responsavelIds: string[]) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);

  function toggleResponsavel(userId: string) {
    setResponsaveis((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  return (
    <div className="space-y-2 rounded-md border border-black/10 bg-background p-2 dark:border-white/10">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da atividade"
        className="w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-transparent"
        autoFocus
      />
      {membros.length > 0 && (
        <div className="space-y-1 text-xs">
          {membros.map((m) => (
            <label key={m.user.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={responsaveis.includes(m.user.id)}
                onChange={() => toggleResponsavel(m.user.id)}
              />
              {m.user.name}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onCreate(nome, responsaveis);
            setNome("");
            setResponsaveis([]);
          }}
          disabled={!nome.trim()}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Criar
        </button>
        <button onClick={onCancel} className="text-xs underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
