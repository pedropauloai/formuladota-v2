// /pro — Dashboard PRO scope limitado.
//
// Server Component: busca dados do PRO logado e passa para componentes.
// 6 seções:
//   0. Coordenação de Partida (nova — Wave 7 2026-05-24)
//      - Sessao ativa: mostra partida em curso com botao Finalizar
//      - Iniciar Partida: botao disponivel se fila >= 4 alunos
//   1. Visao Geral (ProStatsHeader + status + acoes pausar/retomar)
//   2. Meus Alunos (StudentRow com coach notes)
//   3. Revenue (RevenueSummaryCard)
//   4. Meu Pricing (PriceEditorCard — guardrails HONOR + cooldown)
//   5. Acoes de status PRO (pausar / retomar)
//
// Secao pricing adicionada em 2026-05-23 — pricing descentralizado decisao Pedro.
// Secao coordenacao adicionada em 2026-05-24 — Wave 7 Bot Discord V1.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProStatsHeader } from "@/components/pro/pro-stats-header";
import { RevenueSummaryCard } from "@/components/pro/revenue-summary-card";
import { PriceEditorCard } from "@/components/pro/price-editor-card";
import { StudentListClient } from "./student-list-client";
import { ProStatusActions } from "./pro-status-actions";
import { getMyProRevenue } from "@/app/actions/pro-management";
import { getMyStudents } from "@/app/pro/actions";
import { getMyPricingInfo } from "@/app/pro/pricing-actions";
import { getActiveMatchSession } from "@/app/actions/match-coordination";
import { MatchCoordinationClient } from "@/app/pro/match-coordination-client";

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

  if (!user) redirect("/");

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

  // Busca package do PRO pra pricing (precisa do coach_id)
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Busca package avulso do PRO (primeiro ativo, tipo avulso)
  const { data: proPackage } = coach
    ? await supabase
        .from("packages")
        .select("id, nome")
        .eq("coach_id", coach.id)
        .eq("tipo", "avulso")
        .eq("ativo", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  // Busca pricing info do package (se existir)
  const pricingInfo = proPackage
    ? await getMyPricingInfo(proPackage.id)
    : null;

  // Busca revenue, alunos e sessao ativa em paralelo
  const [revenueResult, studentsResult, activeSessionResult] = await Promise.all([
    getMyProRevenue(firstDayOfMonth),
    getMyStudents(),
    getActiveMatchSession(),
  ]);

  const students = studentsResult.data ?? [];
  const activeSession = activeSessionResult.data ?? null;

  // Busca alunos em fila do PRO (waiting) para o painel de coordenacao
  const { data: queueRows } = await supabase
    .from("coach_queue_entries")
    .select("user_id, profiles(username)")
    .eq("coach_id", coach?.id ?? "")
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })
    .limit(20);

  // Formata participantes da fila para o client component
  const queueParticipants = (queueRows ?? []).map((row) => {
    // Supabase retorna join como objeto ou array — normalizar
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      username: profile?.username ?? null,
      honorTier: "aprendiz", // default — honor tier requer join adicional, simplificando V1
    };
  });

  return (
    <main className="flex flex-col gap-8 p-6 max-w-4xl">
      {/* ----------------------------------------------------------------
          Seção 0 — Coordenação de Partida (Wave 7)
          Mostra sessao ativa ou botao de iniciar se fila >= 4 alunos.
          MatchCoordinationClient e Client Component — modals dinamicos.
          ---------------------------------------------------------------- */}
      {(activeSession || queueParticipants.length > 0) && (
        <section id="coordenacao" aria-labelledby="heading-coordenacao">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="heading-coordenacao"
              className="font-display text-base uppercase tracking-widest text-text-display"
            >
              {activeSession ? "Partida Ativa" : "Proxima Partida"}
            </h2>
          </div>

          <MatchCoordinationClient
            queueParticipants={queueParticipants}
            activeSession={activeSession}
          />
        </section>
      )}

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
          <span className="text-sm text-text-muted font-mono">
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
          Seção 3 — Meu Pricing
          Pricing descentralizado: PRO edita próprio preço com guardrails HONOR.
          Decisão Pedro 2026-05-23.
          ---------------------------------------------------------------- */}
      <section id="pricing" aria-labelledby="heading-pricing">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="heading-pricing"
            className="font-display text-base uppercase tracking-widest text-text-display"
          >
            Meu Pricing
          </h2>
        </div>

        {proPackage && pricingInfo?.success && pricingInfo.data ? (
          <PriceEditorCard
            packageId={proPackage.id}
            packageName={proPackage.nome}
            currentPrice={pricingInfo.data.currentPrice}
            maxAllowed={pricingInfo.data.maxAllowed}
            honorTier={pricingInfo.data.honorTier}
            honorScore={pricingInfo.data.honorScore}
            canChangeNow={pricingInfo.data.canChangeNow}
            nextChangeAt={pricingInfo.data.nextChangeAt}
            daysRemaining={pricingInfo.data.daysRemaining}
            history={pricingInfo.data.history}
          />
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated p-8 text-center">
            <p className="text-text-muted text-sm">
              Nenhum package avulso ativo encontrado. O admin cria packages para PROs — entre em
              contato com Pedro para configurar seu pricing.
            </p>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------
          Seção 4 — Revenue
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
