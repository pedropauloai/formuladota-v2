"use server";

// Ações da loja: criar o pedido (botão de pagar), consultar o status e marcar ou remarcar horário
// (página do pedido).

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { createStoreOrder, type CreateOrderResult } from "@/lib/loja/orders";
import { reconcileStoreOrder } from "@/lib/loja/order-payments";
import { getPublicOrder } from "@/lib/loja/public-order";
import { ORIGIN_COOKIE, parseOrigin } from "@/lib/loja/attribution";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { isUuid } from "@/lib/loja/refs";
import type { StoreOrderStatus } from "@/lib/loja/payment-state";
import { rescheduleBooking, scheduleNextSession, type AgendaActionResult } from "@/lib/loja/order-bookings";
import { revalidatePath } from "next/cache";

export async function criarPedido(slug: string, values: Record<string, unknown>): Promise<CreateOrderResult> {
  const { loja } = await getFeatureFlags();
  if (!loja) return { ok: false, error: "A loja está fechada agora." };
  // Freio de abuso: cada pedido abre uma cobrança no Mercado Pago.
  if (!allowRequest("pedido", clientIp(await headers()), 8, 10 * 60_000)) {
    return { ok: false, error: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = parseOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
  return createStoreOrder({ slug, raw: values, userId: user?.id ?? null, origin });
}

/** Status do pedido para a página que espera o pagamento; concilia com o Mercado Pago antes. */
export async function consultarPedido(orderId: string): Promise<{ status: StoreOrderStatus } | null> {
  if (!isUuid(orderId)) return null;
  if (!allowRequest("consulta", clientIp(await headers()), 120, 60_000)) return null;
  await reconcileStoreOrder(orderId);
  const order = await getPublicOrder(orderId);
  return order ? { status: order.status } : null;
}

/** Marca a próxima sessão de um pedido pago (acompanhamento, ou horário perdido). */
export async function agendarSessao(orderId: string, startIso: string): Promise<AgendaActionResult> {
  if (!isUuid(orderId) || typeof startIso !== "string") return { ok: false, error: "Escolha um horário." };
  if (!allowRequest("agenda", clientIp(await headers()), 20, 10 * 60_000)) {
    return { ok: false, error: "Muitas tentativas seguidas. Espere alguns minutos." };
  }
  const result = await scheduleNextSession(orderId, startIso).catch((err: unknown) => {
    console.error("[loja] marcar sessão falhou:", err instanceof Error ? err.message : err);
    return { ok: false as const, error: "Não deu para marcar agora. Tente de novo em instantes." };
  });
  if (result.ok) revalidatePath(`/loja/pedido/${orderId}`);
  return result;
}

/** Remarca um horário confirmado, com pelo menos 24 horas de antecedência. */
export async function remarcarSessao(orderId: string, bookingId: string, startIso: string): Promise<AgendaActionResult> {
  if (!isUuid(orderId) || typeof startIso !== "string") return { ok: false, error: "Escolha um horário." };
  if (!allowRequest("agenda", clientIp(await headers()), 20, 10 * 60_000)) {
    return { ok: false, error: "Muitas tentativas seguidas. Espere alguns minutos." };
  }
  const result = await rescheduleBooking(orderId, bookingId, startIso).catch((err: unknown) => {
    console.error("[loja] remarcar falhou:", err instanceof Error ? err.message : err);
    return { ok: false as const, error: "Não deu para remarcar agora. Tente de novo em instantes." };
  });
  if (result.ok) revalidatePath(`/loja/pedido/${orderId}`);
  return result;
}
