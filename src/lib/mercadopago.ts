// Cliente Mercado Pago V2 — PIX avulso (/v1/payments) + Pix Automático (/preapproval).
// Substitui src/lib/abacatepay.ts (apagado em Phase 4 migration 2026-05-02).
//
// Docs:
// - https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
// - https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post
// - https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

import crypto from "node:crypto";
import { requireServerEnv } from "@/lib/env";
import {
  createPixPaymentInputSchema,
  pixPaymentResponseSchema,
  createPreapprovalInputSchema,
  preapprovalResponseSchema,
  paymentDetailSchema,
  preapprovalDetailSchema,
  authorizedPaymentDetailSchema,
  type CreatePixPaymentInput,
  type CreatePreapprovalInput,
  type PaymentDetail,
  type PreapprovalDetail,
  type AuthorizedPaymentDetail,
} from "@/types/mercadopago";

const BASE_URL = "https://api.mercadopago.com";

// Resultado discriminated union — força caller a checar .success
export type MpResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface PixPaymentSuccessData {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
}

/**
 * Cria pagamento PIX avulso no Mercado Pago.
 * Retorna { id, qrCode, qrCodeBase64 } pra renderizar no checkout.
 *
 * X-Idempotency-Key header garante que retry HTTP não duplica payment.
 */
export async function createPixPayment(
  input: CreatePixPaymentInput
): Promise<MpResult<PixPaymentSuccessData>> {
  const parsed = createPixPaymentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Input inválido para criar PIX." };
  }

  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");
  const payerObj: Record<string, string> = { email: parsed.data.payerEmail };
  if (parsed.data.payerFirstName) payerObj.first_name = parsed.data.payerFirstName;
  if (parsed.data.payerLastName) payerObj.last_name = parsed.data.payerLastName;

  // Body com items completo + statement_descriptor (quality_checklist MP [REQUIRED])
  const body = {
    transaction_amount: parsed.data.amount,
    description: parsed.data.description,
    payment_method_id: "pix",
    payer: payerObj,
    external_reference: parsed.data.externalReference,
    notification_url: parsed.data.notificationUrl,
    statement_descriptor: parsed.data.statementDescriptor,
    additional_info: {
      items: [
        {
          id: parsed.data.itemId,
          title: parsed.data.itemTitle,
          description: parsed.data.description,
          category_id: parsed.data.itemCategoryId,
          quantity: 1,
          unit_price: parsed.data.amount,
        },
      ],
    },
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": parsed.data.externalReference,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] fetch /v1/payments falhou:", err);
    return { success: false, error: "Falha de rede ao contatar Mercado Pago." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "Resposta inválida do Mercado Pago." };
  }

  const validated = pixPaymentResponseSchema.safeParse(json);
  if (!validated.success) {
    console.error("[mercadopago] /v1/payments resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada do Mercado Pago." };
  }

  const txData = validated.data.point_of_interaction?.transaction_data;
  if (!txData) {
    return { success: false, error: "Mercado Pago não retornou QR Code PIX." };
  }

  return {
    success: true,
    data: {
      id: validated.data.id,
      status: validated.data.status,
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      ticketUrl: txData.ticket_url,
    },
  };
}

interface PreapprovalSuccessData {
  id: string;
  status: string;
  initPoint: string;
}

/**
 * Cria preapproval (subscription Pix Automático) no Mercado Pago.
 * Retorna { id, initPoint } — user redireciona pra initPoint pra autorizar Pix Automático.
 */
export async function createPreapproval(
  input: CreatePreapprovalInput
): Promise<MpResult<PreapprovalSuccessData>> {
  const parsed = createPreapprovalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Input inválido para criar preapproval." };
  }

  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");
  const body = {
    reason: parsed.data.reason,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: parsed.data.amount,
      currency_id: "BRL",
    },
    back_url: parsed.data.backUrl,
    external_reference: parsed.data.externalReference,
    payer_email: parsed.data.payerEmail,
    status: "pending",
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] fetch /preapproval falhou:", err);
    return { success: false, error: "Falha de rede ao contatar Mercado Pago." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "Resposta inválida do Mercado Pago." };
  }

  const validated = preapprovalResponseSchema.safeParse(json);
  if (!validated.success) {
    console.error("[mercadopago] /preapproval resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada do Mercado Pago." };
  }

  return {
    success: true,
    data: {
      id: validated.data.id,
      status: validated.data.status,
      initPoint: validated.data.init_point,
    },
  };
}

/**
 * Cancela preapproval no Mercado Pago — chama PUT /preapproval/{id} com status='cancelled'.
 * MP cancela imediato; nosso DB mantém next_payment_date pra cancel híbrido (acesso até fim do período).
 */
export async function cancelPreapproval(
  preapprovalId: string
): Promise<MpResult<{ id: string; status: string }>> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/preapproval/${preapprovalId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] cancelPreapproval falhou:", err);
    return { success: false, error: "Falha de rede ao cancelar preapproval." };
  }

  if (!response.ok) {
    return { success: false, error: `MP retornou HTTP ${response.status}` };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "Resposta inválida do Mercado Pago." };
  }

  const validated = preapprovalResponseSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada do Mercado Pago." };
  }

  return {
    success: true,
    data: { id: validated.data.id, status: validated.data.status },
  };
}

/**
 * GET /v1/payments/{id} — pra webhook handler buscar detalhes.
 */
export async function fetchPayment(
  paymentId: string
): Promise<MpResult<PaymentDetail>> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] fetchPayment falhou:", err);
    return { success: false, error: "Falha de rede." };
  }
  if (!response.ok) {
    return { success: false, error: `MP HTTP ${response.status}` };
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "JSON inválido." };
  }
  const validated = paymentDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada." };
  }
  return { success: true, data: validated.data };
}

/**
 * GET /preapproval/{id} — pra webhook handler buscar detalhes da subscription.
 */
export async function fetchPreapproval(
  preapprovalId: string
): Promise<MpResult<PreapprovalDetail>> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] fetchPreapproval falhou:", err);
    return { success: false, error: "Falha de rede." };
  }
  if (!response.ok) {
    return { success: false, error: `MP HTTP ${response.status}` };
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "JSON inválido." };
  }
  const validated = preapprovalDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada." };
  }
  return { success: true, data: validated.data };
}

/**
 * GET /authorized_payments/{id} — pra webhook handler buscar detalhes de renovação mensal.
 */
export async function fetchAuthorizedPayment(
  authorizedPaymentId: string
): Promise<MpResult<AuthorizedPaymentDetail>> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");
  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/authorized_payments/${authorizedPaymentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );
  } catch (err) {
    console.error("[mercadopago] fetchAuthorizedPayment falhou:", err);
    return { success: false, error: "Falha de rede." };
  }
  if (!response.ok) {
    return { success: false, error: `MP HTTP ${response.status}` };
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { success: false, error: "JSON inválido." };
  }
  const validated = authorizedPaymentDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada." };
  }
  return { success: true, data: validated.data };
}

/**
 * Verifica HMAC SHA-256 do webhook MP.
 *
 * Header `x-signature` formato: `ts=1234567890,v1=hashhex`
 * Manifest a hashar: `id:{data_id};request-id:{x-request-id};ts:{ts};`
 * Comparação via `crypto.timingSafeEqual` (per C8).
 */
export function verifyMercadopagoWebhookSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
}): boolean {
  if (!input.signatureHeader || !input.requestId) return false;

  const parts = input.signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    },
    {}
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const secret = requireServerEnv("MP_WEBHOOK_SECRET");
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
