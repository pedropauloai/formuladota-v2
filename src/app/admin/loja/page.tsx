// /admin/loja: visitas, pedidos e receita por origem no período (o número do checkpoint de
// 27/11/2026), os pedidos com o contato do comprador e os links com origem para as redes.
// Leitura pela RLS de admin; o layout /admin barra quem não é admin.

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { summarizeByOrigin, totals, type OriginSummary } from "@/lib/loja/summary";
import { sourceLabel } from "@/lib/loja/attribution";
import { formatBRL } from "@/lib/loja/money";
import { whatsappLink } from "@/lib/loja/notify-message";
import { TRACKED_LINKS } from "@/lib/loja/tracked-links";
import { DeliveredToggle, CopyLink } from "./client-bits";

export const metadata = { title: "Loja | Admin FORMULADOTA" };
export const revalidate = 0;

const PERIODS = [
  { key: "lancamento", label: "Desde 06/11", from: () => new Date("2026-11-06T03:00:00Z") },
  { key: "7d", label: "7 dias", from: () => new Date(Date.now() - 7 * 864e5) },
  { key: "30d", label: "30 dias", from: () => new Date(Date.now() - 30 * 864e5) },
] as const;

type SearchParams = Promise<{ periodo?: string; testes?: string }>;
type Translator = Awaited<ReturnType<typeof getTranslations>>;

interface OrderListRow {
  id: string;
  created_at: string;
  product_title: string;
  variant_label: string;
  buyer_name: string;
  buyer_whatsapp: string;
  amount_cents: number;
  payment_method: string;
  status: string;
  utm_source: string | null;
  referrer_host: string | null;
  is_test: boolean;
  notified_at: string | null;
  fulfilled_at: string | null;
}

export default async function AdminLojaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const period = PERIODS.find((p) => p.key === params.periodo) ?? PERIODS[0];
  const showTests = params.testes === "1";
  const from = period.from().toISOString();
  const supabase = await createClient();
  const [visits, orders, t] = await Promise.all([
    supabase.from("site_visits").select("utm_source, referrer_host").gte("created_at", from).limit(50000),
    supabase
      .from("store_orders")
      .select("id, created_at, product_title, variant_label, buyer_name, buyer_whatsapp, amount_cents, payment_method, status, utm_source, referrer_host, is_test, notified_at, fulfilled_at")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(500),
    getTranslations("loja"),
  ]);
  const orderRows = (orders.data ?? []) as OrderListRow[];
  const rows = summarizeByOrigin(visits.data ?? [], orderRows);
  const listed = orderRows.filter((o) => showTests || !o.is_test).slice(0, 100);
  const site = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <div className="space-y-8 p-6 xl:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl uppercase tracking-tight text-text-display">{t("adminTitle")}</h1>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("adminPeriod")}>
          {PERIODS.map((p) => (
            <a key={p.key} href={`?periodo=${p.key}${showTests ? "&testes=1" : ""}`} className={`rounded-sm border px-3 py-1 ${p.key === period.key ? "border-gold/70 text-text-display" : "border-border-subtle text-text-muted hover:text-text-display"}`}>
              {p.label}
            </a>
          ))}
          <a href={`?periodo=${period.key}${showTests ? "" : "&testes=1"}`} className="rounded-sm border border-border-subtle px-3 py-1 text-text-muted hover:text-text-display">
            {showTests ? t("adminHideTests") : t("adminShowTests")}
          </a>
        </nav>
      </header>

      <OriginTable rows={rows} t={t} />
      <OrdersTable orders={listed} t={t} />

      <section className="space-y-3">
        <h2 className="font-display text-lg uppercase tracking-wide text-text-display">{t("adminLinks")}</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {TRACKED_LINKS.map((link) => (
            <li key={link.shortPath} className="flex items-center justify-between gap-3 rounded-sm border border-border-subtle bg-bg-base px-3 py-2 text-sm">
              <span className="text-text-body">{link.channel}</span>
              <CopyLink url={`${site}${link.shortPath}`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OriginTable({ rows, t }: { rows: OriginSummary[]; t: Translator }) {
  const total = totals(rows);
  const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1).replace(".", ",")}%`);
  const cell = "px-3 py-2 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-md border border-border-subtle">
      <table className="w-full text-sm">
        <thead className="bg-bg-base text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-normal">{t("adminSource")}</th>
            <th className={`${cell} font-normal`}>{t("adminVisits")}</th>
            <th className={`${cell} font-normal`}>{t("adminOrders")}</th>
            <th className={`${cell} font-normal`}>{t("adminPaid")}</th>
            <th className={`${cell} font-normal`}>{t("adminRevenue")}</th>
            <th className={`${cell} font-normal`}>{t("adminConversion")}</th>
          </tr>
        </thead>
        <tbody className="text-text-body">
          {rows.map((r) => (
            <tr key={r.source} className="border-t border-border-subtle">
              <td className="px-3 py-2">{r.source}</td>
              <td className={cell}>{r.visits}</td>
              <td className={cell}>{r.orders}</td>
              <td className={cell}>{r.paidOrders}</td>
              <td className={`${cell} text-gold`}>{formatBRL(r.revenueCents)}</td>
              <td className={cell}>{pct(r.conversion)}</td>
            </tr>
          ))}
          <tr className="border-t border-border-strong font-semibold text-text-display">
            <td className="px-3 py-2">{t("adminTotal")}</td>
            <td className={cell}>{total.visits}</td>
            <td className={cell}>{total.orders}</td>
            <td className={cell}>{total.paidOrders}</td>
            <td className={`${cell} text-gold`}>{formatBRL(total.revenueCents)}</td>
            <td className={cell}>{pct(total.conversion)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({ orders, t }: { orders: OrderListRow[]; t: Translator }) {
  if (orders.length === 0) return <p className="text-sm text-text-muted">{t("adminNoOrders")}</p>;
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg uppercase tracking-wide text-text-display">{t("adminRecent")}</h2>
      <div className="overflow-x-auto rounded-md border border-border-subtle">
        <table className="w-full text-sm">
          <thead className="bg-bg-base text-left text-text-muted">
            <tr>
              {["adminDate", "adminProduct", "adminBuyer", "adminAmount", "adminStatus", "adminSource", "adminDelivered"].map((k) => (
                <th key={k} className="px-3 py-2 font-normal">{t(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-text-body">
            {orders.map((o) => (
              <tr key={o.id} id={o.id} className="border-t border-border-subtle align-top">
                <td className="whitespace-nowrap px-3 py-2">{date.format(new Date(o.created_at))}</td>
                <td className="px-3 py-2">{o.product_title}<span className="block text-xs text-text-faded">{o.variant_label}{o.is_test ? " · teste" : ""}</span></td>
                <td className="px-3 py-2">
                  <a className="text-text-display underline-offset-2 hover:underline" href={whatsappLink({ buyerWhatsapp: o.buyer_whatsapp, buyerName: o.buyer_name, productTitle: o.product_title })} target="_blank" rel="noreferrer">{o.buyer_name}</a>
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatBRL(o.amount_cents)}<span className="block text-xs text-text-faded">{o.payment_method === "pix" ? "Pix" : "Cartão"}</span></td>
                <td className="px-3 py-2">{o.status}{(o.status === "pago" || o.status === "em_revisao") && !o.notified_at ? <span className="block text-xs text-warning">{t("adminNotNotified")}</span> : null}</td>
                <td className="px-3 py-2">{sourceLabel(o)}</td>
                <td className="px-3 py-2">{o.status === "pago" || o.status === "em_revisao" ? <DeliveredToggle orderId={o.id} delivered={!!o.fulfilled_at} label={t("adminMarkDelivered")} /> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
