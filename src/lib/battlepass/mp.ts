// Mercado Pago do Battlepass: assinatura no cartão (API de assinaturas, /preapproval) e as cobranças
// mensais dela (/authorized_payments). O Pix de 30 dias usa createPixPayment da lib comum, o mesmo da loja.
// Os IDs chegam como número ou texto conforme o endpoint: o esquema aceita os dois.

import "server-only";
import { z } from "zod";
import { requireServerEnv } from "@/lib/env";
import type { MpResult } from "@/lib/mercadopago";
import { BATTLEPASS } from "./config";
import { subscriptionReference } from "./refs";

const MP_BASE_URL = "https://api.mercadopago.com";
const TIMEOUT_MS = 10_000;

const id = z.union([z.string(), z.number()]).transform(String);

const preapprovalSchema = z.object({
  id: z.string(),
  status: z.string(),
  external_reference: z.string().nullish(),
  next_payment_date: z.string().nullish(),
  init_point: z.string().nullish(),
  sandbox_init_point: z.string().nullish(),
  reason: z.string().nullish(),
  auto_recurring: z
    .object({ transaction_amount: z.number().nullish(), currency_id: z.string().nullish() })
    .partial()
    .nullish(),
});
export type MpPreapproval = z.infer<typeof preapprovalSchema>;

const authorizedPaymentSchema = z.object({
  id,
  preapproval_id: z.string(),
  status: z.string().nullish(),
  transaction_amount: z.number().nullish(),
  currency_id: z.string().nullish(),
  date_created: z.string().nullish(),
  debit_date: z.string().nullish(),
  payment: z
    .object({ id: id.nullish(), status: z.string().nullish(), status_detail: z.string().nullish() })
    .partial()
    .nullish(),
});
export type MpAuthorizedPayment = z.infer<typeof authorizedPaymentSchema>;

function headers(idempotencyKey?: string): Record<string, string> {
  const base: Record<string, string> = {
    Authorization: `Bearer ${requireServerEnv("MP_ACCESS_TOKEN")}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) base["X-Idempotency-Key"] = idempotencyKey;
  return base;
}

async function call<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, init: RequestInit = {}): Promise<MpResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    console.error(`[battlepass/mp] ${path}: falha de rede`, err);
    return { success: false, error: "Falha de rede ao falar com o Mercado Pago." };
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(`[battlepass/mp] ${path}: HTTP ${response.status}`, JSON.stringify(json)?.slice(0, 400));
    return { success: false, error: `O Mercado Pago recusou (HTTP ${response.status}).` };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error(`[battlepass/mp] ${path}: resposta inesperada`, JSON.stringify(parsed.error.flatten()).slice(0, 400));
    return { success: false, error: "Resposta inesperada do Mercado Pago." };
  }
  return { success: true, data: parsed.data };
}

export interface CreatePreapprovalArgs {
  subscriptionId: string;
  payerEmail: string;
  backUrl: string;
}

/**
 * Assinatura pendente: o comprador autoriza o cartão no checkout do Mercado Pago (init_point), e a
 * primeira cobrança sai na hora. A referência externa é a linha de subscriptions.
 */
export async function createBattlepassPreapproval(args: CreatePreapprovalArgs): Promise<MpResult<MpPreapproval>> {
  const body = {
    reason: BATTLEPASS.name,
    external_reference: subscriptionReference(args.subscriptionId),
    payer_email: args.payerEmail,
    back_url: args.backUrl,
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: BATTLEPASS.priceCents / 100,
      currency_id: "BRL",
    },
  };
  return call("/preapproval", preapprovalSchema, {
    method: "POST",
    headers: headers(`battlepass-preapproval-${args.subscriptionId}`),
    body: JSON.stringify(body),
  });
}

export async function getBattlepassPreapproval(preapprovalId: string): Promise<MpResult<MpPreapproval>> {
  return call(`/preapproval/${encodeURIComponent(preapprovalId)}`, preapprovalSchema, { headers: headers() });
}

/** Para a renovação: o Mercado Pago não cobra mais, e o acesso segue até o fim do período pago. */
export async function cancelBattlepassPreapproval(preapprovalId: string): Promise<MpResult<MpPreapproval>> {
  return call(`/preapproval/${encodeURIComponent(preapprovalId)}`, preapprovalSchema, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ status: "cancelled" }),
  });
}

const authorizedSearchSchema = z.object({ results: z.array(z.unknown()).default([]) });

/** Cobranças de uma assinatura (a mais nova primeiro). Item fora do formato esperado fica de fora. */
export async function listAuthorizedPayments(preapprovalId: string): Promise<MpResult<MpAuthorizedPayment[]>> {
  const query = new URLSearchParams({ preapproval_id: preapprovalId, limit: "50" });
  const found = await call(`/authorized_payments/search?${query}`, authorizedSearchSchema, { headers: headers() });
  if (!found.success) return found;
  const items = found.data.results.flatMap((item) => {
    const parsed = authorizedPaymentSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return { success: true, data: items };
}

export async function getAuthorizedPayment(authorizedPaymentId: string): Promise<MpResult<MpAuthorizedPayment>> {
  return call(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`, authorizedPaymentSchema, { headers: headers() });
}

/** Link do checkout: no sandbox o Mercado Pago devolve um endereço próprio de teste. */
export function checkoutUrlOf(preapproval: MpPreapproval, testMode: boolean): string | null {
  if (testMode && preapproval.sandbox_init_point) return preapproval.sandbox_init_point;
  return preapproval.init_point ?? preapproval.sandbox_init_point ?? null;
}
