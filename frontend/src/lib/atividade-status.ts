import type { Atividade, Estagio } from "./api";

export function getEstagioFinalId(estagios: Estagio[]): string | undefined {
  if (estagios.length === 0) return undefined;
  const maxOrdem = Math.max(...estagios.map((e) => e.ordem));
  return estagios.find((e) => e.ordem === maxOrdem)?.id;
}

export function isAtrasada(atividade: Atividade, estagioFinalId: string | undefined): boolean {
  if (!atividade.data_fim) return false;
  if (atividade.estagio_id === estagioFinalId) return false;
  return new Date(atividade.data_fim) < new Date();
}
