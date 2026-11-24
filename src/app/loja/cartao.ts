"use server";

// Cartão dentro do site: cobra o pedido pendente com o token que o formulário do Mercado Pago
// gerou no navegador, e troca para o Pix quando a pessoa desiste do cartão.

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { isUuid } from "@/lib/loja/refs";
import { cancelUnpaidOrder } from "@/lib/loja/cancel-order";
import { cardFormSchema, cardReason, payStoreOrderWithCard, type CardReason } from "@/lib/loja/card-payment";
import { getPaymentSnapshot } from "@/lib/loja/mercadopago";

export type CardPayOutcome =
  | { ok: true; status: "aprovado" | "analise" }
  | { ok: true; status: "desafio"; paymentId: string; externalResourceUrl: string; creq: string }
  | { ok: false; reason: CardReason | "pedido" | "muitas" | "pagamento" };

const ANALYSIS = new Set(["in_process", "pending", "authorized"]);
/** Tentativas que terminaram sem cobrar: só com elas a pessoa pode largar o cartão e ir para o Pix. */
const SETTLED_FAILED = new Set(["rejected", "cancelled"]);

async function viewerId(): Promise<string | null> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return user?.id ?? null;
}

export async function pagarComCartao(orderId: string, card: unknown): Promise<CardPayOutcome> {
  if (!isUuid(orderId)) return { ok: false, reason: "pedido" };
  // Cada envio é uma cobrança no Mercado Pago: freio por aparelho e por pedido (cartão testado em série).
  if (!allowRequest("cartao-ip", clientIp(await headers()), 20, 10 * 60_000)) return { ok: false, reason: "muitas" };
  if (!allowRequest("cartao-pedido", orderId, 6, 10 * 60_000)) return { ok: false, reason: "muitas" };
  const parsed = cardFormSchema.safeParse(card);
  if (!parsed.success) return { ok: false, reason: "dados" };
  try {
    const result = await payStoreOrderWithCard(orderId, parsed.data, await viewerId());
    if (!result.ok) return { ok: false, reason: result.error === "recusado" ? "recusado" : result.error === "pagamento" ? "pagamento" : "pedido" };
    if (result.status === "approved") return { ok: true, status: "aprovado" };
    if (result.challenge) return { ok: true, status: "desafio", paymentId: result.paymentId, ...result.challenge };
    if (ANALYSIS.has(result.status)) return { ok: true, status: "analise" };
    return { ok: false, reason: cardReason(result.statusDetail) };
  } catch (err) {
    console.error("[loja/cartao] pagar falhou:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "pagamento" };
  }
}

/** Desistiu do cartão na fila: cancela o pedido de cartão ainda sem pagamento e solta a vaga para o Pix. */
export async function desistirDoCartao(orderId: string): Promise<{ ok: boolean }> {
  if (!isUuid(orderId)) return { ok: false };
  const id = await viewerId();
  if (!id) return { ok: false };
  const { data: order, error } = await createServiceClient()
    .from("store_orders")
    .select("user_id, payment_method, status, mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order || order.user_id !== id || order.payment_method !== "cartao" || order.status !== "pendente") return { ok: false };
  // Tentativa em análise ou aprovada não se cancela: o dinheiro pode cair depois.
  if (order.mp_payment_id) {
    const last = await getPaymentSnapshot(order.mp_payment_id);
    if (!last.success || !SETTLED_FAILED.has(last.data.status)) return { ok: false };
  }
  const result = await cancelUnpaidOrder(orderId);
  return { ok: result.cancelled };
}
