// Mercado Pago do lado da loja: leitura de pagamentos (conciliação e webhook).
// O Pix usa createPixPayment da lib comum; o cartão sai pela API de Payments em card-payment.ts.
// A aplicação FormulaDota tem permissão em Payments e Preferences (sondagem de 06/11/2026).

import "server-only";
import { z } from "zod";
import { requireServerEnv } from "@/lib/env";
import { getPaymentDetail } from "@/lib/mercadopago";
import type { MpResult } from "@/lib/mercadopago";
import { reaisToCents } from "./money";
import type { PaymentSnapshot } from "./payment-state";

const MP_BASE_URL = "https://api.mercadopago.com";

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${requireServerEnv("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json" };
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
