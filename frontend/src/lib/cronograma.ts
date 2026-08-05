import type { Turma } from "./api";

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatCurto(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function sprintAtualRange(turma: Turma): { inicio: Date; fim: Date } | null {
  if (!turma.cronograma_inicio) return null;
  const inicioCiclo = parseDateOnly(turma.cronograma_inicio);
  const diasPorSprint = turma.duracao_sprint_semanas * 7;
  const inicio = addDays(inicioCiclo, (turma.sprint_atual - 1) * diasPorSprint);
  const fim = addDays(inicio, diasPorSprint - 1);
  return { inicio, fim };
}

/** Janela exibida no Cronograma: do início da sprint atual até o fim do ciclo total. */
export function cronogramaRestante(
  turma: Turma
): { inicio: Date; fim: Date; semanas: number; sprintInicial: number; sprintFinal: number } | null {
  const atual = sprintAtualRange(turma);
  if (!atual || !turma.cronograma_inicio) return null;
  const inicioCiclo = parseDateOnly(turma.cronograma_inicio);
  const diasPorSprint = turma.duracao_sprint_semanas * 7;
  const fim = addDays(inicioCiclo, turma.total_sprints * diasPorSprint - 1);
  const semanas = (turma.total_sprints - turma.sprint_atual + 1) * turma.duracao_sprint_semanas;
  return { inicio: atual.inicio, fim, semanas, sprintInicial: turma.sprint_atual, sprintFinal: turma.total_sprints };
}
