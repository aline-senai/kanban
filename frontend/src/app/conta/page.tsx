"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ContaForm } from "@/components/ContaForm";

export default function ContaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <div>
        <Link href="/turmas" className="text-sm underline">
          ← Voltar
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Minha conta</h1>

      <ContaForm />
    </div>
  );
}
