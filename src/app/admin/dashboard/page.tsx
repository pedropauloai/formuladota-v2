// /admin/dashboard — KPIs FORMULADOTA com DADOS REAIS do mês corrente.
//
// Duas economias convivem (decisão Pedro 2026-06-12):
//   FICHAS  → purchases pagas (valor real preco_pago) + ficha_ledger (vendidas/consumidas)
//   ASSINATURAS → subscriptions.status='authorized' × HUB_PRICE_BRL (MRR) — freemium vivo
// Split PRO/plataforma vem de revenue_splits (trigger da migration 031), não de estimativa.
//
// Gate: layout /admin valida is_admin; revalidamos aqui (defesa em camadas).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users, CreditCard, Coins, Trophy, Activity, Percent, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Dashboard — FORMULADOTA" };
export const revalidate = 0;

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface MonthKpis {
  fichasRevenueBrl: number;
  fichasVendidas: number;
  fichasConsumidas: number;
  activeSubscribers: number;
  mrrBrl: number;
  proShareBrl: number;
  platformShareBrl: number;
  splitTotalBrl: number;
  newUsers: number;
  ptsRealizadas: number;
  lobbiesCriados: number;
}

async function fetchMonthKpis(startISO: string): Promise<MonthKpis> {
  const supabase = createServiceClient();

  const [purchasesRes, ledgerRes, subsRes, splitsRes, usersRes, ptsRes, lobbiesRes] =
    await Promise.all([
      // Receita de fichas = soma do valor REAL pago (preco_pago) das compras pagas no mês
      supabase
        .from("purchases")
        .select("preco_pago")
        .eq("status", "pago")
        .gte("created_at", startISO),
      // Ledger: source='purchase' credita fichas (delta +N); source='pt_consumed' debita
      // -1 por aluno por PT realizada (trigger migration 026) — fonte real do consumo.
      supabase
        .from("ficha_ledger")
        .select("delta, source")
        .in("source", ["purchase", "pt_consumed"])
        .gte("created_at", startISO),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "authorized"),
      // Split real por venda (PRO 85-95% / sponsor / plataforma 5%) — migration 031
      supabase
        .from("revenue_splits")
        .select("pro_share_brl, sponsor_share_brl, platform_share_brl, total_brl")
        .gte("created_at", startISO),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("status", "realizada")
        .gte("created_at", startISO),
      supabase
        .from("lobbies")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO),
    ]);

  const fichasRevenueBrl = (purchasesRes.data ?? []).reduce(
    (sum, p) => sum + Number(p.preco_pago ?? 0),
    0
  );

  let fichasVendidas = 0;
  let fichasConsumidas = 0;
  for (const row of ledgerRes.data ?? []) {
    if (row.source === "purchase") fichasVendidas += row.delta;
    if (row.source === "pt_consumed") fichasConsumidas += -row.delta;
  }

  // Mensalidade não tem coluna de preço na row (migration 008) — valor vem do env,
  // mesmo call site do checkout (src/app/actions/subscription.ts).
  const hubPrice = Number(process.env.HUB_PRICE_BRL ?? "47");
  const activeSubscribers = subsRes.count ?? 0;

  let proShareBrl = 0;
  let platformShareBrl = 0;
  let splitTotalBrl = 0;
  for (const s of splitsRes.data ?? []) {
    proShareBrl += Number(s.pro_share_brl) + Number(s.sponsor_share_brl);
    platformShareBrl += Number(s.platform_share_brl);
    splitTotalBrl += Number(s.total_brl);
  }

  return {
    fichasRevenueBrl,
    fichasVendidas,
    fichasConsumidas,
    activeSubscribers,
    mrrBrl: activeSubscribers * hubPrice,
    proShareBrl,
    platformShareBrl,
    splitTotalBrl,
    newUsers: usersRes.count ?? 0,
    ptsRealizadas: ptsRes.count ?? 0,
    lobbiesCriados: lobbiesRes.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const kpis = await fetchMonthKpis(startOfMonth.toISOString());

  const monthLabel = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-8 space-y-10">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Visão geral — {monthLabel}
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      {/* ── Receita (duas economias: fichas + assinaturas) ── */}
      <KpiSection title="Receita do mês">
        <KpiCard
          label="Receita de fichas (pago)"
          value={brl(kpis.fichasRevenueBrl)}
          icon={Coins}
        />
        <KpiCard
          label="Assinaturas (MRR)"
          value={brl(kpis.mrrBrl)}
          sub={`${kpis.activeSubscribers} assinante${kpis.activeSubscribers === 1 ? "" : "s"} ativo${kpis.activeSubscribers === 1 ? "" : "s"}`}
          icon={CreditCard}
        />
        <KpiCard
          label="Repassado aos PROs"
          value={brl(kpis.proShareBrl)}
          sub={`de ${brl(kpis.splitTotalBrl)} com split`}
          icon={Percent}
        />
        <KpiCard
          label="Plataforma (split)"
          value={brl(kpis.platformShareBrl)}
          icon={Percent}
        />
      </KpiSection>

      {/* ── Fichas (estoque circulando) ── */}
      <KpiSection title="Fichas do mês">
        <KpiCard label="Fichas vendidas" value={kpis.fichasVendidas} icon={Coins} />
        <KpiCard
          label="Fichas consumidas"
          value={kpis.fichasConsumidas}
          sub="1 por aluno em cada PT realizada"
          icon={Activity}
        />
      </KpiSection>

      {/* ── Atividade ── */}
      <KpiSection title="Atividade do mês">
        <KpiCard label="Novos usuários" value={kpis.newUsers} icon={Users} />
        <KpiCard label="PTs realizadas" value={kpis.ptsRealizadas} icon={Swords} />
        <KpiCard label="Lobbies criados" value={kpis.lobbiesCriados} icon={Trophy} />
      </KpiSection>
    </div>
  );
}

function KpiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
}) {
  return (
    <Card variant="flat" className="p-4">
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between">
          <p className="font-sans text-sm uppercase tracking-widest text-text-faded">{label}</p>
          <Icon size={18} className="text-brand-primary" aria-hidden="true" />
        </div>
        <p className="font-display text-3xl tabular-nums text-gold">{value}</p>
        {sub && <p className="font-mono text-sm text-text-faded">{sub}</p>}
      </CardContent>
    </Card>
  );
}
