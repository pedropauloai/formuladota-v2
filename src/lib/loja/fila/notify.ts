// Aviso ao Pedro no canal de vendas quando alguém sai da fila sozinho: quanto devolver no Mercado
// Pago (as partidas que a pessoa não jogou; a vaga do dia, se não jogou nenhuma). Sem nada a devolver
// (quem já jogou com a vaga do dia), não há aviso. Falha de aviso nunca desfaz a saída: só loga.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import { formatBRL } from "@/lib/loja/money";

const TIMEOUT_MS = 8000;

interface ExitInfo {
  name: string;
  refundCents: number;
  orderId: string;
  isTest: boolean;
}

async function loadExit(bookingId: string): Promise<ExitInfo | null> {
  const { data, error } = await createServiceClient()
    .from("store_bookings")
    .select("seats, matches_played, is_test, source, store_orders (id, buyer_name, amount_cents, quantity)")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) {
    console.error("[fila/aviso] reserva não encontrada:", bookingId, error?.message);
    return null;
  }
  // Quem entrou pelo Battlepass não pagou a vaga: não há nada a devolver.
  const order = data.source === "battlepass" ? null : data.store_orders;
  if (!order) return null;
  const perMatch = Math.round(order.amount_cents / Math.max(1, order.quantity));
  return { name: order.buyer_name, refundCents: perMatch * Math.max(0, data.seats - data.matches_played), orderId: order.id, isTest: data.is_test };
}

export async function sendQueueExitNotice(bookingId: string): Promise<boolean> {
  const url = process.env.SALES_DISCORD_WEBHOOK_URL;
  const info = url ? await loadExit(bookingId) : null;
  if (!url || !info || info.refundCents <= 0) return false;
  const pedro = process.env.PEDRO_DISCORD_USER_ID;
  const mention = pedro && /^\d{5,25}$/.test(pedro) ? `<@${pedro}> ` : "";
  // Nome do comprador vai como texto: nada de formatação nem menção injetada.
  const name = info.name.replace(/([\\`*_~|>@])/g, "\\$1");
  const panel = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin/loja/fila`;
  const content =
    `${mention}${info.isTest ? "[TESTE] " : ""}fila da party: ${name} saiu da fila. ` +
    `Devolver ${formatBRL(info.refundCents)} no Mercado Pago (pedido ${info.orderId}).\n${panel}`;
  try {
    const response = await fetch(`${url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [], users: mention && pedro ? [pedro] : [] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("[fila/aviso] Discord recusou: HTTP", response.status);
    return response.ok;
  } catch (err) {
    console.error("[fila/aviso] Discord falhou:", err);
    return false;
  }
}
