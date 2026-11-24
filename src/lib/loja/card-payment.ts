// Cartão dentro do site: o formulário oficial do Mercado Pago (Card Payment Brick) gera o token do
// cartão no navegador, e aqui o pagamento sai pela API de Payments com o valor gravado no pedido.
// O comprador não sai do site, e o número do cartão nunca passa por aqui.

import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { publicEnv, requireServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { centsToReais } from "./money";
import { toStoreReference } from "./refs";
import { toSnapshot } from "./mercadopago";
import { applyStorePayment } from "./order-payments";

const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";

/** O que o formulário do Mercado Pago entrega ao enviar: só o token, nunca o número do cartão. */
export const cardFormSchema = z.object({
  token: z.string().min(8).max(200),
  paymentMethodId: z.string().min(2).max(40),
  issuerId: z.string().max(40).optional(),
  installments: z.number().int().min(1).max(12),
  identificationType: z.enum(["CPF", "CNPJ"]),
  identificationNumber: z.string().regex(/^\d{11,14}$/),
  deviceId: z.string().max(200).optional(),
});
export type CardForm = z.infer<typeof cardFormSchema>;

export interface CardOrder {
  id: string;
  status: string;
  payment_method: string;
  amount_cents: number;
  buyer_name: string;
  buyer_email: string;
  product_title: string;
  variant_label: string;
  user_id: string | null;
}

function splitName(name: string): { first_name: string; last_name?: string } {
  const [first = name, ...rest] = name.trim().split(/\s+/);
  return rest.length ? { first_name: first, last_name: rest.join(" ") } : { first_name: first };
}

/** Corpo do pagamento: valor, comprador e referência vêm do pedido; do navegador, só o token e as escolhas do cartão. */
export function buildCardPaymentBody(order: CardOrder, form: CardForm, notificationUrl?: string) {
  const amount = centsToReais(order.amount_cents);
  const title = `${order.product_title}: ${order.variant_label}`.slice(0, 256);
  return {
    transaction_amount: amount,
    token: form.token,
    description: `FORMULADOTA: ${title}`.slice(0, 200),
    installments: form.installments,
    payment_method_id: form.paymentMethodId,
    ...(form.issuerId ? { issuer_id: form.issuerId } : {}),
    payer: {
      email: order.buyer_email,
      ...splitName(order.buyer_name),
      identification: { type: form.identificationType, number: form.identificationNumber },
    },
    external_reference: toStoreReference(order.id),
    statement_descriptor: "FORMULADOTA",
    // O banco pode pedir confirmação (3DS); o formulário mostra o desafio e o pagamento segue.
    three_d_secure_mode: "optional",
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    additional_info: { items: [{ id: order.id, title, quantity: 1, unit_price: amount, category_id: "services" }] },
  };
}

/** A mesma tentativa (mesmo pedido e mesmo token) nunca cobra duas vezes, mesmo com o botão tocado de novo. */
export function cardIdempotencyKey(orderId: string, token: string): string {
  return `loja-cartao-${orderId}-${crypto.createHash("sha256").update(token).digest("hex").slice(0, 24)}`;
}

const paymentResponseSchema = z.object({
  id: z.number(),
  status: z.string(),
  status_detail: z.string().nullish(),
  transaction_amount: z.number().nullish(),
  currency_id: z.string().nullish(),
  external_reference: z.string().nullish(),
  live_mode: z.boolean().nullish(),
  three_ds_info: z.object({ external_resource_url: z.string().url(), creq: z.string() }).nullish(),
});

export type CardPayError = "pedido" | "dono" | "recusado" | "pagamento";

/** Por que o banco recusou, no que a pessoa pode fazer: outro cartão, conferir os dados ou falar com o banco. */
export type CardReason = "saldo" | "dados" | "autorizar" | "recusado";

export function cardReason(statusDetail: string | null): CardReason {
  if (statusDetail === "cc_rejected_insufficient_amount") return "saldo";
  if (statusDetail?.startsWith("cc_rejected_bad_filled")) return "dados";
  if (statusDetail === "cc_rejected_call_for_authorize") return "autorizar";
  return "recusado";
}
export type CardPayResult =
  | {
      ok: true;
      paymentId: string;
      status: string;
      statusDetail: string | null;
      /** Desafio do banco (3DS): o formulário de status do Mercado Pago abre com estes dados. */
      challenge: { externalResourceUrl: string; creq: string } | null;
    }
  | { ok: false; error: CardPayError };

function notificationUrl(): string | undefined {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return base?.startsWith("https://") ? `${base}/api/webhooks/mercadopago` : undefined;
}

async function readOrder(orderId: string): Promise<CardOrder | null> {
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .select("id, status, payment_method, amount_cents, buyer_name, buyer_email, product_title, variant_label, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`ler pedido ${orderId} falhou: ${error.message}`);
  return data as CardOrder | null;
}

/** Cobra o pedido pendente com o cartão que o formulário tokenizou e aplica o resultado ao pedido. */
export async function payStoreOrderWithCard(orderId: string, form: CardForm, viewerId: string | null): Promise<CardPayResult> {
  const order = await readOrder(orderId);
  if (!order || order.status !== "pendente" || order.payment_method !== "cartao") return { ok: false, error: "pedido" };
  // Pedido de quem estava logado só se paga logado na mesma conta.
  if (order.user_id && order.user_id !== viewerId) return { ok: false, error: "dono" };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireServerEnv("MP_ACCESS_TOKEN")}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": cardIdempotencyKey(orderId, form.token),
  };
  // Identificação do aparelho que o SDK do Mercado Pago gera: ajuda a análise antifraude a aprovar.
  if (form.deviceId) headers["X-meli-session-id"] = form.deviceId;
  let response: Response;
  try {
    response = await fetch(MP_PAYMENTS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(buildCardPaymentBody(order, form, notificationUrl())),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[loja/cartao] falha de rede:", err instanceof Error ? err.message : err);
    return { ok: false, error: "pagamento" };
  }
  const parsed = paymentResponseSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) {
    console.error("[loja/cartao] pagamento recusado pela API: HTTP", response.status);
    return { ok: false, error: response.status >= 400 && response.status < 500 ? "recusado" : "pagamento" };
  }
  const payment = parsed.data;
  const { error: saveError } = await createServiceClient()
    .from("store_orders")
    .update({ mp_payment_id: String(payment.id), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pendente");
  if (saveError) console.error("[loja/cartao] gravar o pagamento no pedido falhou:", saveError.message);
  // Aprovado vira pedido pago na hora (o webhook que chegar depois vira no-op); recusado deixa tentar de novo.
  await applyStorePayment(orderId, toSnapshot(payment));
  const challenge = payment.three_ds_info
    ? { externalResourceUrl: payment.three_ds_info.external_resource_url, creq: payment.three_ds_info.creq }
    : null;
  return { ok: true, paymentId: String(payment.id), status: payment.status, statusDetail: payment.status_detail ?? null, challenge };
}
