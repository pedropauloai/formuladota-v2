// /admin/battlepass: quem assina, como paga, até quando vale, o que falta devolver na garantia e
// o placar do teste de 30 dias. Leitura pela RLS de admin; o layout /admin barra quem não é admin.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { formatBrl } from "@/lib/battlepass/config";
import { buildAdminView, type AdminPaymentRow, type AdminSubscriptionRow } from "@/lib/battlepass/admin-view";
import { requireAdminPage } from "@/lib/auth/admin-page";

export const metadata = { title: "Battlepass | Admin FORMULADOTA" };
export const revalidate = 0;

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
const DATETIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const fmt = (iso: string | null, f = DATE) => (iso ? f.format(new Date(iso)) : "sem data");

type SearchParams = Promise<{ testes?: string }>;

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border-strong bg-bg-base p-4">
      <p className="text-xs text-text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-text-display">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export default async function AdminBattlepassPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const showTests = (await searchParams).testes === "1";
  const supabase = await createClient();
  const [subs, payments] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, user_id, status, provider, tier, next_payment_date, started_at, cancelled_at, is_test, created_at")
      .eq("tier", "battlepass")
      .eq("is_test", showTests)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<AdminSubscriptionRow[]>(),
    supabase
      .from("subscription_payments")
      .select("id, subscription_id, user_id, method, status, amount_cents, paid_amount_cents, mp_payment_id, paid_at, refund_requested_at, period_end, is_test")
      .eq("is_test", showTests)
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<AdminPaymentRow[]>(),
  ]);
  const failed = subs.error ?? payments.error;
  if (failed) throw new Error(`ler o Battlepass falhou: ${failed.message}`);
  const view = buildAdminView(subs.data ?? [], payments.data ?? [], new Date());
  const identities = await getIdentityMap(supabase, [...new Set([...view.members.map((m) => m.userId), ...view.refunds.map((r) => r.userId)])]);
  const nameOf = (id: string) => identities.get(id)?.name ?? "Jogador";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl uppercase tracking-wide text-text-display">Battlepass</h1>
        <a href={showTests ? "/admin/battlepass" : "/admin/battlepass?testes=1"} className="text-sm text-text-muted underline-offset-2 hover:underline">
          {showTests ? "ver os de verdade" : "ver os de teste"}
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Assinantes com acesso agora" value={String(view.activeCount)} hint={`${view.activeCard} no cartão, ${view.activePix} no Pix`} />
        <Card title="Recebido neste mês" value={formatBrl(view.monthCents)} hint="antes da taxa" />
        <Card title="Teste de 30 dias" value={`${view.test.payers} pagante${view.test.payers === 1 ? "" : "s"}`} hint={view.test.label} />
        <Card title="Reembolsos a fazer" value={String(view.refunds.length)} hint={view.refunds.length ? formatBrl(view.refunds.reduce((s, r) => s + r.amountCents, 0)) : "nenhum"} />
      </div>

      {view.refunds.length > 0 && (
        <section className="space-y-2 rounded-md border border-error/40 bg-bg-base p-4">
          <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Devolver no Mercado Pago</h2>
          <p className="text-xs text-text-muted">O acesso já terminou.</p>
          <ul className="divide-y divide-border-subtle text-sm">
            {view.refunds.map((r) => (
              <li key={r.paymentId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-text-display">{nameOf(r.userId)}</span>
                <span className="tabular-nums text-text-body">{formatBrl(r.amountCents)}</span>
                <span className="text-text-muted">{r.method === "pix" ? "Pix" : "cartão"} · pagamento {r.mpPaymentId ?? "sem ID"}</span>
                <span className="text-text-muted">pedido em {fmt(r.requestedAt, DATETIME)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2 rounded-md border border-border-strong bg-bg-base p-4">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Assinantes</h2>
        {view.members.length === 0 ? (
          <p className="text-sm text-text-muted">Ninguém assinou ainda.</p>
        ) : (
          <ul className="divide-y divide-border-subtle text-sm">
            {view.members.map((m) => (
              <li key={m.subscriptionId} className="grid gap-1 py-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4">
                <span className="text-text-display">{nameOf(m.userId)}</span>
                <span className="text-text-body">{m.via === "pix" ? "Pix" : "cartão"}</span>
                <span className={m.active ? "text-play-primary" : "text-text-muted"}>{m.statusLabel}</span>
                <span className="tabular-nums text-text-muted">{formatBrl(m.paidCents)} em {m.paidCount} pagamento{m.paidCount === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
