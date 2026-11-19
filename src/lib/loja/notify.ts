// Aviso de venda ao Pedro: Discord (canal privado, com menção) e e-mail (Resend).
// Falha de aviso nunca derruba pagamento: loga e segue; o painel mostra quem ficou sem aviso.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import { buildDiscordSalePayload, buildSaleEmail, type SaleInfo } from "./notify-message";
import { bookingLine } from "./agenda";

const TIMEOUT_MS = 8000;

async function loadSale(orderId: string): Promise<SaleInfo | null> {
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .select(
      "id, product_title, variant_label, amount_cents, payment_method, status, buyer_name, buyer_email, buyer_whatsapp, details, utm_source, utm_medium, utm_campaign, referrer_host, is_test"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) {
    console.error("[loja/aviso] pedido não encontrado:", orderId, error?.message);
    return null;
  }
  if (data.status !== "pago" && data.status !== "em_revisao") return null;
  const { data: bookings } = await createServiceClient()
    .from("store_bookings")
    .select("kind, starts_at, ends_at, seats, store_live_sessions (status)")
    .eq("order_id", orderId)
    .neq("status", "cancelado")
    .order("starts_at", { ascending: true });
  const schedule = (bookings ?? []).map((b) => {
    const seats = `${b.seats} vaga${b.seats > 1 ? "s" : ""}`;
    // Comprou fora da live: a vaga é na fila aberta, sem data de live.
    if (b.store_live_sessions?.status === "fila") return `fila da party, para a próxima live (${seats})`;
    return b.kind === "live" ? `live de ${bookingLine(b.starts_at, b.ends_at)} (${seats})` : bookingLine(b.starts_at, b.ends_at);
  });
  return {
    orderId: data.id,
    productTitle: data.product_title,
    variantLabel: data.variant_label,
    amountCents: data.amount_cents,
    method: data.payment_method === "cartao" ? "cartao" : "pix",
    status: data.status,
    buyerName: data.buyer_name,
    buyerEmail: data.buyer_email,
    buyerWhatsapp: data.buyer_whatsapp,
    details: (data.details ?? {}) as Record<string, string | number>,
    origin: { utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign, referrer_host: data.referrer_host },
    isTest: data.is_test,
    adminUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin/loja?pedido=${data.id}`,
    schedule,
  };
}

async function postDiscord(sale: SaleInfo): Promise<boolean> {
  const url = process.env.SALES_DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const response = await fetch(`${url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDiscordSalePayload(sale, process.env.PEDRO_DISCORD_USER_ID)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("[loja/aviso] Discord recusou: HTTP", response.status);
    return response.ok;
  } catch (err) {
    console.error("[loja/aviso] Discord falhou:", err);
    return false;
  }
}

async function sendEmail(sale: SaleInfo): Promise<boolean> {
  const to = process.env.STORE_NOTIFY_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return false;
  const { subject, text } = buildSaleEmail(sale);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Reenvio do mesmo aviso (webhook e conciliação) não duplica o e-mail.
        "Idempotency-Key": `loja-venda-${sale.orderId}-${sale.status}`,
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "onboarding@resend.dev", to: [to], subject, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("[loja/aviso] Resend recusou: HTTP", response.status);
    return response.ok;
  } catch (err) {
    console.error("[loja/aviso] Resend falhou:", err);
    return false;
  }
}

export async function sendSaleNotification(orderId: string): Promise<void> {
  const sale = await loadSale(orderId);
  if (!sale) return;
  const [discord, email] = await Promise.all([postDiscord(sale), sendEmail(sale)]);
  if (!discord && !email) {
    console.error("[loja/aviso] nenhum canal entregou o aviso do pedido", orderId);
    return;
  }
  const { error } = await createServiceClient()
    .from("store_orders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) console.error("[loja/aviso] marcar aviso entregue falhou:", error.message);
}

/** Aviso curto de agenda ao Pedro (sessão marcada depois da compra, remarcação), no canal de vendas. */
export async function sendAgendaEvent(text: string, orderId: string, isTest: boolean): Promise<void> {
  const url = process.env.SALES_DISCORD_WEBHOOK_URL;
  if (!url) return;
  const pedro = process.env.PEDRO_DISCORD_USER_ID;
  const mention = pedro && /^\d{5,25}$/.test(pedro) ? `<@${pedro}> ` : "";
  const adminUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin/loja/agenda`;
  // Nome do comprador vai como texto: nada de formatação nem menção injetada.
  const safe = text.replace(/([\`*_~|>@])/g, "\$1");
  try {
    const response = await fetch(`${url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${mention}${isTest ? "[TESTE] " : ""}agenda: ${safe}\n${adminUrl} (pedido ${orderId})`.slice(0, 2000),
        allowed_mentions: { parse: [], users: mention && pedro ? [pedro] : [] },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("[loja/agenda] Discord recusou: HTTP", response.status);
  } catch (err) {
    console.error("[loja/agenda] Discord falhou:", err);
  }
}
