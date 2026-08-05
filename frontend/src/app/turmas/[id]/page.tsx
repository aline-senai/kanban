"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TurmaRootRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/turmas/${turmaId}/quadro`);
  }, [turmaId, router]);

  return null;
}
