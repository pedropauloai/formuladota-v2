// /pro — Dashboard PRO scope limitado.
//
// Server Component: busca dados do PRO logado e passa para componentes.
// 4 seções:
//   1. Visao Geral (ProStatsHeader + status + ações pausar/retomar)
//   2. Meus Alunos (StudentRow com coach notes)
//   3. Revenue (RevenueSummaryCard)
//   4. Ações de status PRO (pausar / retomar)

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProStatsHeader } from "@/components/pro/pro-stats-header";
import { RevenueSummaryCard } from "@/components/pro/revenue-summary-card";
import { StudentListClient } from "./student-list-client";
import { ProStatusActions } from "./pro-status-actions";
import { getMyProRevenue } from "@/app/actions/pro-management";
import { getMyStudents } from "@/app/pro/actions";

export const metadata: Metadata = {
  title: "Painel PRO — FORMULADOTA",
  description: "Gerencie seus alunos, acompanhe revenue e seu status PRO.",
};

// Revalida a cada 60s — dados de fila e revenue mudam com frequência
export const revalidate = 60;

export default async function ProPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verifica status PRO (layout já faz o gate, mas buscamos o status pra UI)
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (!promo) redirect("/me?msg=not_a_pro");

  const isActive = promo.status === "active";

  // Período atual para revenue (mês corrente)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodLabel = now.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Busca revenue e alunos em paralelo
  const [revenueResult, studentsResult] = await Promise.all([
    getMyProRevenue(firstDayOfMonth),
    getMyStudents(),
  ]);

  const students = studentsResult.data ?? [];

  return (
    <main className="flex flex-col gap-8 p-6 max-w-4xl">
      {/* ----------------------------------------------------------------
          Seção 1 — Visão Geral
          ---------------------------------------------------------------- */}
      <section id="visao-geral" aria-labelledby="heading-visao-geral">
        <h2
          id="heading-visao-geral"
          className="sr-only"
        >
          Visão Geral do PRO
        </h2>

        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 flex flex-col gap-6">
          {/* Header com avatar + tiers + status */}
          <ProStatsHeader proUserId={user.id} />

          {/* Bio editável + ações de status */}
          <ProStatusActions isActive={isActive} />
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Seção 2 — Meus Alunos
          ---------------------------------------------------------------- */}
      <section id="alunos" aria-labelledby="heading-alunos">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="heading-alunos"
            className="font-display text-base uppercase tracking-widest text-text-display"
          >
            Meus Alunos
          </h2>
          <span className="text-xs text-text-muted font-mono">
            {students.length} aluno{students.length !== 1 ? "s" : ""}
          </span>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated p-8 text-center">
            <p className="text-text-muted text-sm">
              Nenhum aluno ainda — entre em campo e jogue suas primeiras partidas como PRO.
            </p>
          </div>
        ) : (
          <StudentListClient students={students} />
        )}
      </section>

      {/* ----------------------------------------------------------------
          Seção 3 — Revenue
          ---------------------------------------------------------------- */}
      <section id="revenue" aria-labelledby="heading-revenue">
        <h2
          id="heading-revenue"
          className="font-display text-base uppercase tracking-widest text-text-display mb-4"
        >
          Revenue
        </h2>

        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
          <RevenueSummaryCard
            revenue={revenueResult}
            period={`${periodLabel.charAt(0).toUpperCase()}${periodLabel.slice(1)}`}
          />
        </div>
      </section>
    </main>
  );
}
