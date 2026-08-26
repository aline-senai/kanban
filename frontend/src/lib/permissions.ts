import type { EffectiveRole } from "./view-as-context";

/** Espelha, no client, as regras de RBAC do backend (docs/backlog.md seção 3),
 * aplicadas ao papel efetivo ("Ver como") em vez do papel real do usuário. */

export function podeGerenciarEstagios(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor";
}

export function podeGerenciarAtividades(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor" || effectiveRole === "gestor";
}

export function podeGerenciarGrupos(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor";
}

export function podeGerenciarMateriais(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor";
}

export function podeGerenciarSprints(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor";
}

export function podeGerenciarPlanningReview(effectiveRole: EffectiveRole): boolean {
  return effectiveRole === "professor" || effectiveRole === "gestor";
}
