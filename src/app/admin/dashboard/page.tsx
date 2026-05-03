// /admin/dashboard — KPIs FORMULADOTA. Phase 8 H6.1.

import type { Metadata } from "next";
import { Users, CreditCard, Trophy, Activity } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Admin Dashboard — FORMULADOTA" };

export default async function AdminDashboardPage() {
  // Service-role pra agregar — admin já validado em layout
  const supabase = createServiceClient();

  // KPIs do mês corrente
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startISO = startOfMonth.toISOString();

  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { count: lobbiesCreatedThisMonth },
    { count: paymentsThisMonth },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "authorized"),
    supabase
      .from("lobbies")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO),
    supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("status", "pago")
      .gte("created_at", startISO),
  ]);

  const monthlyRevenue = (activeSubscribers ?? 0) * 47;

  return (
    <div className="p-8 space-y-10">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Visão geral
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Users totais" value={totalUsers ?? 0} icon={Users} />
        <KpiCard label="Assinantes ativos" value={activeSubscribers ?? 0} icon={CreditCard} />
        <KpiCard
          label="Receita mensal estimada"
          value={`R$ ${monthlyRevenue.toLocaleString("pt-BR")}`}
          icon={CreditCard}
        />
        <KpiCard label="Lobbies (mês)" value={lobbiesCreatedThisMonth ?? 0} icon={Trophy} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <KpiCard label="Pagamentos confirmados (mês)" value={paymentsThisMonth ?? 0} icon={Activity} />
        <KpiCard
          label="Saldo total liberado"
          value={`R$ ${((paymentsThisMonth ?? 0) * 47).toLocaleString("pt-BR")}`}
          icon={CreditCard}
        />
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-2">
      <div className="flex items-start justify-between">
        <p className="font-sans text-xs uppercase tracking-widest text-[var(--color-text-faded)]">{label}</p>
        <Icon size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
      </div>
      <p className="font-display text-3xl text-[var(--color-foreground)]">{value}</p>
    </article>
  );
}
