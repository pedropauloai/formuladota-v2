// /admin/dashboard — KPIs FORMULADOTA com séries por RANGE + região (FASE 5).
//
// Refatorado 2026-07-04: o modelo antigo somava só o mês CORRENTE (números
// resetavam todo dia 1º). Agora todas as queries recebem o range do seletor
// (este mês / mês passado / 30d / 90d / custom) + filtro de região, e as
// séries vêm das views admin_* (migration 123).
//
// Duas economias convivem (decisão Pedro 2026-06-12):
//   FICHAS  → purchases pagas + ficha_ledger (vendidas/consumidas)
//   ASSINATURAS → Plus/Premium por região (view admin_subs_by_tier_region;
//     MRR por MOEDA — BRL/USD/EUR não se somam entre si)
//
// Gate: layout /admin valida is_admin; revalidamos aqui (defesa em camadas).

import { redirect } from "next/navigation";
import {
  Users,
  CreditCard,
  Coins,
  Trophy,
  Activity,
  Percent,
  Swords,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { isGameRegion } from "@/lib/regions";
import { FeatureFlagsPanel } from "./feature-flags-panel";
import { PeriodRegionFilter } from "./period-filter";
import { PERIODS, type Period } from "./period";
import { DailyAreaChart, RevenueBarChart, type RevenuePoint } from "./charts";

export const metadata = { title: "Admin Dashboard — FORMULADOTA" };
export const revalidate = 0;

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Range do período ─────────────────────────────────────────────────────────
interface Range {
  start: Date;
  end: Date;
}

function resolveRange(period: Period, from: string | null, to: string | null): Range {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  switch (period) {
    case "this_month":
      return { start: startOfMonth, end: now };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "30d":
      return { start: new Date(now.getTime() - 30 * 86400_000), end: now };
    case "90d":
      return { start: new Date(now.getTime() - 90 * 86400_000), end: now };
    case "custom": {
      const start = from ? new Date(from + "T00:00:00") : startOfMonth;
      const end = to ? new Date(to + "T23:59:59") : now;
      return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
        ? { start: startOfMonth, end: now }
        : { start, end };
    }
  }
}

// ── Dados ────────────────────────────────────────────────────────────────────
interface DashboardData {
  fichasRevenueBrl: number;
  fichasVendidas: number;
  fichasConsumidas: number;
  proShareBrl: number;
  platformShareBrl: number;
  splitTotalBrl: number;
  newUsers: number;
  activeUsers: number;
  matchesDone: number;
  lobbiesCriados: number;
  // Assinantes ativos (snapshot, não depende do range)
  subscribers: { tier: string; region: string; currency: string; count: number; mrr: number }[];
  // Séries pros gráficos
  signupsSeries: { day: string; signups: number }[];
  activeSeries: { day: string; active_users: number }[];
  matchesSeries: { day: string; matches_done: number }[];
  revenueSeries: Map<string, RevenuePoint[]>; // por moeda
}

async function fetchDashboard(range: Range, region: string): Promise<DashboardData> {
  const supabase = createServiceClient();
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();
  const startDay = startISO.slice(0, 10);
  const endDay = endISO.slice(0, 10);

  // Filtro opcional de região aplicado nas views (todas têm coluna region).
  const withRegion = <T extends { eq: (c: string, v: string) => T }>(q: T): T =>
    isGameRegion(region) ? q.eq("region", region) : q;

  const [
    purchasesRes,
    ledgerRes,
    splitsRes,
    lobbiesRes,
    signupsRes,
    activesRes,
    matchesRes,
    revenueRes,
    subsRes,
  ] = await Promise.all([
    supabase
      .from("purchases")
      .select("preco_pago")
      .eq("status", "pago")
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("ficha_ledger")
      .select("delta, source")
      .in("source", ["purchase", "pt_consumed"])
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("revenue_splits")
      .select("pro_share_brl, sponsor_share_brl, platform_share_brl, total_brl")
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("lobbies")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    withRegion(
      supabase.from("admin_signups_daily").select("day, region, signups")
    )
      .gte("day", startDay)
      .lte("day", endDay)
      .order("day"),
    withRegion(
      supabase.from("admin_active_users_daily").select("day, region, active_users")
    )
      .gte("day", startDay)
      .lte("day", endDay)
      .order("day"),
    withRegion(
      supabase.from("admin_matches_daily").select("day, region, matches_done")
    )
      .gte("day", startDay)
      .lte("day", endDay)
      .order("day"),
    withRegion(
      supabase
        .from("admin_revenue_monthly")
        .select("month, kind, provider, region, currency, amount")
    )
      .gte("month", new Date(range.start.getFullYear(), range.start.getMonth(), 1).toISOString())
      .lte("month", endISO)
      .order("month"),
    withRegion(
      supabase
        .from("admin_subs_by_tier_region")
        .select("region, tier, provider, currency, subscribers, mrr")
    ),
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

  let proShareBrl = 0;
  let platformShareBrl = 0;
  let splitTotalBrl = 0;
  for (const s of splitsRes.data ?? []) {
    proShareBrl += Number(s.pro_share_brl) + Number(s.sponsor_share_brl);
    platformShareBrl += Number(s.platform_share_brl);
    splitTotalBrl += Number(s.total_brl);
  }

  // Séries diárias: agrega regiões quando o filtro é "all" (a view separa por região).
  const aggDaily = <K extends string>(
    rows: Array<Record<string, unknown>> | null,
    key: K
  ): Array<{ day: string } & Record<K, number>> => {
    const byDay = new Map<string, number>();
    for (const r of rows ?? []) {
      const day = String(r.day);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(r[key] ?? 0));
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, [key]: v }) as { day: string } & Record<K, number>);
  };

  const signupsSeries = aggDaily(signupsRes.data, "signups");
  const activeSeries = aggDaily(activesRes.data, "active_users");
  const matchesSeries = aggDaily(matchesRes.data, "matches_done");

  // Receita mensal por MOEDA (não somar BRL com USD/EUR).
  const revenueSeries = new Map<string, RevenuePoint[]>();
  {
    const byCurrency = new Map<string, Map<string, RevenuePoint>>();
    for (const r of revenueRes.data ?? []) {
      const currency = String(r.currency);
      const month = String(r.month).slice(0, 10);
      const perMonth = byCurrency.get(currency) ?? new Map<string, RevenuePoint>();
      const point = perMonth.get(month) ?? { month, fichas: 0, assinaturas: 0 };
      if (r.kind === "fichas") point.fichas += Number(r.amount);
      else point.assinaturas += Number(r.amount);
      perMonth.set(month, point);
      byCurrency.set(currency, perMonth);
    }
    for (const [currency, perMonth] of byCurrency) {
      revenueSeries.set(
        currency,
        [...perMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
      );
    }
  }

  return {
    fichasRevenueBrl,
    fichasVendidas,
    fichasConsumidas,
    proShareBrl,
    platformShareBrl,
    splitTotalBrl,
    newUsers: signupsSeries.reduce((s, r) => s + r.signups, 0),
    activeUsers: activeSeries.reduce((s, r) => Math.max(s, r.active_users), 0),
    matchesDone: matchesSeries.reduce((s, r) => s + r.matches_done, 0),
    lobbiesCriados: lobbiesRes.count ?? 0,
    subscribers: (subsRes.data ?? []).map((s) => ({
      tier: String(s.tier),
      region: String(s.region),
      currency: String(s.currency),
      count: Number(s.subscribers),
      mrr: Number(s.mrr),
    })),
    signupsSeries,
    activeSeries,
    matchesSeries,
    revenueSeries,
  };
}

// ── Página ───────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage(props: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; region?: string }>;
}) {
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

  const params = await props.searchParams;
  const period: Period = (PERIODS as readonly string[]).includes(params.period ?? "")
    ? (params.period as Period)
    : "this_month";
  const region = isGameRegion(params.region) ? params.region : "all";
  const range = resolveRange(period, params.from ?? null, params.to ?? null);

  const [data, featureFlags] = await Promise.all([
    fetchDashboard(range, region),
    getFeatureFlags(),
  ]);

  // MRR por moeda + assinantes por tier (snapshot).
  const mrrByCurrency = new Map<string, number>();
  const subsByTier = new Map<string, number>();
  for (const s of data.subscribers) {
    mrrByCurrency.set(s.currency, (mrrByCurrency.get(s.currency) ?? 0) + s.mrr);
    subsByTier.set(s.tier, (subsByTier.get(s.tier) ?? 0) + s.count);
  }
  const mrrLabel =
    [...mrrByCurrency.entries()]
      .map(([cur, v]) =>
        cur === "BRL" ? brl(v) : `${cur === "EUR" ? "€" : "US$"} ${v.toFixed(2)}`
      )
      .join(" + ") || brl(0);
  const totalSubs = [...subsByTier.values()].reduce((a, b) => a + b, 0);

  const posthogUrl = "https://us.posthog.com/project/497134";

  return (
    <div className="p-8 space-y-10">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Visão geral
        </h1>
        <div className="mt-4 brand-divider" />
        <div className="mt-4">
          <PeriodRegionFilter
            period={period}
            region={region}
            from={params.from ?? null}
            to={params.to ?? null}
          />
        </div>
      </header>

      {/* ── Receita ── */}
      <KpiSection title="Receita">
        <KpiCard label="Fichas (período)" value={brl(data.fichasRevenueBrl)} icon={Coins} />
        <KpiCard
          label="MRR assinaturas"
          value={mrrLabel}
          sub={`${totalSubs} assinantes ativos · Plus ${subsByTier.get("plus") ?? 0} · Premium ${subsByTier.get("premium") ?? 0}`}
          icon={CreditCard}
        />
        <KpiCard
          label="Repassado aos PROs"
          value={brl(data.proShareBrl)}
          sub={`de ${brl(data.splitTotalBrl)} com split`}
          icon={Percent}
        />
        <KpiCard label="Split plataforma" value={brl(data.platformShareBrl)} icon={Percent} />
      </KpiSection>

      {/* ── Gráficos ── */}
      <section className="space-y-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
          Séries do período
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Novos usuários / dia">
            <DailyAreaChart data={data.signupsSeries} dataKey="signups" label="Signups" />
          </ChartCard>
          <ChartCard title="Usuários ativos / dia (xp_events)">
            <DailyAreaChart
              data={data.activeSeries}
              dataKey="active_users"
              label="Ativos"
              color="var(--color-success, #00C466)"
            />
          </ChartCard>
          <ChartCard title="Partidas realizadas / dia">
            <DailyAreaChart
              data={data.matchesSeries}
              dataKey="matches_done"
              label="Partidas"
              color="var(--color-brand-primary, #C42121)"
            />
          </ChartCard>
          {[...data.revenueSeries.entries()].map(([currency, points]) => (
            <ChartCard key={currency} title={`Receita mensal (${currency})`}>
              <RevenueBarChart data={points} currency={currency} />
            </ChartCard>
          ))}
          {data.revenueSeries.size === 0 && (
            <ChartCard title="Receita mensal">
              <p className="p-6 font-mono text-sm text-text-faded">
                Sem receita registrada no período.
              </p>
            </ChartCard>
          )}
        </div>
      </section>

      {/* ── Fichas (estoque circulando) ── */}
      <KpiSection title="Fichas">
        <KpiCard label="Fichas vendidas" value={data.fichasVendidas} icon={Coins} />
        <KpiCard
          label="Fichas consumidas"
          value={data.fichasConsumidas}
          sub="via PTs realizadas"
          icon={Activity}
        />
      </KpiSection>

      {/* ── Atividade ── */}
      <KpiSection title="Atividade">
        <KpiCard label="Novos usuários" value={data.newUsers} icon={Users} />
        <KpiCard
          label="Pico de ativos/dia"
          value={data.activeUsers}
          sub="distinct em xp_events"
          icon={Activity}
        />
        <KpiCard label="Partidas realizadas" value={data.matchesDone} icon={Swords} />
        <KpiCard label="Lobbies criados" value={data.lobbiesCriados} icon={Trophy} />
      </KpiSection>

      {/* ── PostHog (funil signup→fila→partida→assinatura) ── */}
      <section className="space-y-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
          Funil de produto
        </h2>
        <a
          href={posthogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card variant="flat" className="p-4 transition-colors hover:border-brand-primary/60">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-brand-primary" aria-hidden="true" />
                <div>
                  <p className="font-display text-lg uppercase text-text-display">
                    PostHog — funil e retenção
                  </p>
                  <p className="font-mono text-sm text-text-faded">
                    signup → fila → partida → assinatura (projeto US 497134)
                  </p>
                </div>
              </div>
              <ExternalLink size={16} className="text-text-faded" aria-hidden="true" />
            </CardContent>
          </Card>
        </a>
      </section>

      {/* ── Funcionalidades (feature flags) — liga/desliga sem deploy ── */}
      <section className="space-y-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
          Funcionalidades
        </h2>
        <FeatureFlagsPanel initial={featureFlags} />
      </section>
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="flat" className="p-4">
      <CardContent className="space-y-3">
        <p className="font-sans text-sm uppercase tracking-widest text-text-faded">{title}</p>
        {children}
      </CardContent>
    </Card>
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
