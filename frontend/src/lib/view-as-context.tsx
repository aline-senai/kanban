"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type EffectiveRole = "professor" | "gestor" | "integrante";

const ORDER: EffectiveRole[] = ["professor", "gestor", "integrante"];

export const ROLE_LABEL: Record<EffectiveRole, string> = {
  professor: "Professor",
  gestor: "Gestor",
  integrante: "Integrante",
};

type ViewAsContextValue = {
  effectiveRole: EffectiveRole;
  maxRole: EffectiveRole;
  allowedRoles: EffectiveRole[];
  setEffectiveRole: (role: EffectiveRole) => void;
  isPreviewing: boolean;
};

const ViewAsContext = createContext<ViewAsContextValue | null>(null);

/**
 * Simula, só no client, as regras de RBAC do papel escolhido ("Ver como").
 * Todas as chamadas à API continuam usando o usuário real autenticado — o
 * backend segue sendo a única fonte de verdade para permissões.
 */
export function ViewAsProvider({
  turmaId,
  maxRole,
  children,
}: {
  turmaId: string;
  maxRole: EffectiveRole;
  children: React.ReactNode;
}) {
  const allowedRoles = ORDER.slice(ORDER.indexOf(maxRole));
  const storageKey = `kanban_view_as_${turmaId}`;
  const [effectiveRole, setEffectiveRoleState] = useState<EffectiveRole>(maxRole);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
    if (stored && allowedRoles.includes(stored as EffectiveRole)) {
      setEffectiveRoleState(stored as EffectiveRole);
    } else {
      setEffectiveRoleState(maxRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, maxRole]);

  function setEffectiveRole(role: EffectiveRole) {
    if (!allowedRoles.includes(role)) return;
    setEffectiveRoleState(role);
    if (typeof window !== "undefined") sessionStorage.setItem(storageKey, role);
  }

  return (
    <ViewAsContext.Provider
      value={{
        effectiveRole,
        maxRole,
        allowedRoles,
        setEffectiveRole,
        isPreviewing: effectiveRole !== maxRole,
      }}
    >
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs deve ser usado dentro de ViewAsProvider");
  return ctx;
}
