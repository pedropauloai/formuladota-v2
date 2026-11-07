// Mercado Pago do lado da loja: preferência do Checkout Pro (cartão) e leitura de pagamentos.
// O Pix usa createPixPayment da lib comum (o mesmo que já rodou em produção nas fichas).
// A aplicação FormulaDota só tem permissão em Payments e Preferences (sondagem de 06/11/2026).

import "server-only";
import { z } from "zod";
import { requireServerEnv } from "@/lib/env";
import { getPaymentDetail, isTestMode } from "@/lib/mercadopago";
import type { MpResult } from "@/lib/mercadopago";
import { centsToReais, reaisToCents } from "./money";
import type { PaymentSnapshot } from "./payment-state";

const MP_BASE_URL = "https://api.mercadopago.com";
const PREFERENCE_TTL_MS = 24 * 60 * 60 * 1000;

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${requireServerEnv("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json" };
}

export interface CardPreferenceInput {
  orderRef: string;
  itemId: string;
  title: string;
  description: string;
  amountCents: number;
  payer: { name: string; email: string; whatsapp: string };
  returnUrl: string;
  notificationUrl?: string;
}

const preferenceResponseSchema = z.object({
  id: z.string(),
  init_point: z.string().url(),
  sandbox_init_point: z.string().url().optional(),
});

function payerOf(payer: CardPreferenceInput["payer"]) {
  const [name = "", ...rest] = payer.name.trim().split(/\s+/);
  const national = payer.whatsapp.startsWith("55") ? payer.whatsapp.slice(2) : payer.whatsapp;
  return {
    name,
    surname: rest.join(" ") || name,
    email: payer.email,
    phone: { area_code: national.slice(0, 2), number: national.slice(2) },
  };
}

export function buildPreferenceBody(input: CardPreferenceInput, now: Date) {
  const https = input.returnUrl.startsWith("https://");
  return {
    items: [
      {
        id: input.itemId,
        title: input.title.slice(0, 256),
        description: input.description.slice(0, 256),
        quantity: 1,
        unit_price: centsToReais(input.amountCents),
        currency_id: "BRL",
        category_id: "services",
      },
    ],
    payer: payerOf(input.payer),
    external_reference: input.orderRef,
    back_urls: { success: input.returnUrl, pending: input.returnUrl, failure: input.returnUrl },
    // O Mercado Pago só volta sozinho para endereço https: no localhost o comprador clica em voltar.
    ...(https ? { auto_return: "approved" } : {}),
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
    statement_descriptor: "FORMULADOTA",
    // Boleto e lotérica demoram dias; o pedido de serviço espera minutos.
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
    expires: true,
    expiration_date_from: now.toISOString(),
    expiration_date_to: new Date(now.getTime() + PREFERENCE_TTL_MS).toISOString(),
    metadata: { pedido: input.orderRef },
  };
}

export async function createCardPreference(
  input: CardPreferenceInput
): Promise<MpResult<{ id: string; checkoutUrl: string }>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(buildPreferenceBody(input, new Date())),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[loja/mp] preferência: falha de rede", err);
    return { success: false, error: "Falha de rede ao contatar o Mercado Pago." };
  }
  const json: unknown = await response.json().catch(() => null);
  const parsed = preferenceResponseSchema.safeParse(json);
  if (!response.ok || !parsed.success) {
    console.error("[loja/mp] preferência recusada: HTTP", response.status);
    return { success: false, error: "O Mercado Pago não abriu o pagamento com cartão." };
  }
  // Com credencial de teste o comprador paga no ambiente de teste do Mercado Pago.
  const checkoutUrl = isTestMode() && parsed.data.sandbox_init_point ? parsed.data.sandbox_init_point : parsed.data.init_point;
  return { success: true, data: { id: parsed.data.id, checkoutUrl } };
}

const searchResultSchema = z.object({
  id: z.number(),
  status: z.string(),
  status_detail: z.string().nullish(),
  transaction_amount: z.number().nullish(),
  currency_id: z.string().nullish(),
  external_reference: z.string().nullish(),
  live_mode: z.boolean().nullish(),
});
type SearchResult = z.infer<typeof searchResultSchema>;

export function toSnapshot(p: SearchResult): PaymentSnapshot {
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail ?? undefined,
    amountCents: typeof p.transaction_amount === "number" ? reaisToCents(p.transaction_amount) : null,
    currency: p.currency_id ?? undefined,
    externalReference: p.external_reference ?? undefined,
    liveMode: p.live_mode ?? undefined,
  };
}

/** Pagamentos de uma referência externa (todas as tentativas de cartão de um pedido). */
export async function searchPaymentsByReference(ref: string): Promise<MpResult<PaymentSnapshot[]>> {
  const query = new URLSearchParams({ external_reference: ref, sort: "date_created", criteria: "desc", limit: "20" });
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/v1/payments/search?${query}`, { headers: headers(), cache: "no-store" });
  } catch (err) {
    console.error("[loja/mp] busca de pagamentos: falha de rede", err);
    return { success: false, error: "Falha de rede ao consultar o Mercado Pago." };
  }
  const json = (await response.json().catch(() => null)) as { results?: unknown[] } | null;
  if (!response.ok || !Array.isArray(json?.results)) {
    console.error("[loja/mp] busca de pagamentos recusada: HTTP", response.status);
    return { success: false, error: "O Mercado Pago não respondeu a consulta." };
  }
  const snapshots = json.results.flatMap((item) => {
    const parsed = searchResultSchema.safeParse(item);
    return parsed.success ? [toSnapshot(parsed.data)] : [];
  });
  return { success: true, data: snapshots };
}

/** Um pagamento pelo ID (o Pix do pedido, ou o que o webhook avisou). */
export async function getPaymentSnapshot(paymentId: string): Promise<MpResult<PaymentSnapshot>> {
  const result = await getPaymentDetail(paymentId);
  if (!result.success) return result;
  return { success: true, data: toSnapshot(result.data) };
}
