"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TurmaBoardProvider, useTurmaBoard } from "@/lib/turma-board-context";
import { ViewAsProvider, type EffectiveRole } from "@/lib/view-as-context";
import { AppShell } from "@/components/AppShell";

export default function TurmaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: turmaId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <TurmaBoardProvider turmaId={turmaId}>
      <ViewAsGate turmaId={turmaId}>{children}</ViewAsGate>
    </TurmaBoardProvider>
  );
}

function ViewAsGate({ turmaId, children }: { turmaId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const { loading, grupos, error } = useTurmaBoard();

  if (!user) return null;
  if (loading) {
    return <p className="p-10 text-sm text-black/60 dark:text-white/60">Carregando...</p>;
  }

  const maxRole: EffectiveRole =
    user.role === "professor"
      ? "professor"
      : grupos.some((g) => g.membros.some((m) => m.user.id === user.id && m.is_gestor))
        ? "gestor"
        : "integrante";

  return (
    <ViewAsProvider turmaId={turmaId} maxRole={maxRole}>
      <AppShell turmaId={turmaId}>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {children}
      </AppShell>
    </ViewAsProvider>
  );
}
