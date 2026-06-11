// Mercado Pago API client — server-only.
// Cobre: PIX avulso (createPixPayment), Pix Automático subscription (createPreapproval,
// cancelPreapproval, getPreapproval, getPaymentDetail, getAuthorizedPaymentDetail)
// e validação HMAC do webhook (verifyMpWebhookSignature).
//
// NENHUM SDK MP é necessário — fetch nativo é suficiente e evita deps desnecessárias.
//
// DIFERENÇAS CRÍTICAS vs AbacatePay (ler antes de modificar):
//   1. Amount em REAIS float (47.00), não centavos int (4700)
//   2. qr_code_base64 sem prefixo data URI — função adiciona ao retornar
//   3. Webhook HMAC: digest HEX sobre manifest de headers (não sobre raw body em base64)
//   4. Header: x-signature (não x-webhook-signature)

import crypto from "node:crypto";
import { requireServerEnv } from "@/lib/env";
import {
  type CreatePixPaymentInput,
  type MpPixPaymentData,
  type MpResult,
  type CreatePreapprovalInput,
  type MpPreapprovalData,
  type MpPaymentDetail,
  type MpPreapprovalDetail,
  type MpAuthorizedPaymentDetail,
  createPixPaymentInputSchema,
  mpPaymentApiResponseSchema,
  mpPreapprovalApiResponseSchema,
  mpPaymentDetailSchema,
  mpPreapprovalDetailSchema,
  mpAuthorizedPaymentDetailSchema,
} from "./types";

const MP_BASE_URL = "https://api.mercadopago.com";

// Retorna true se o Access Token é de sandbox (prefixo TEST-)
function isTestMode(): boolean {
  const token = process.env.MP_ACCESS_TOKEN ?? "";
  return token.startsWith("TEST-");
}

// Headers comuns para todas as chamadas à API MP
function buildHeaders(idempotencyKey?: string): Record<string, string> {
  const token = requireServerEnv("MP_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

// ====================================================
// PIX AVULSO — POST /v1/payments
// ====================================================

/**
 * Cria um pagamento PIX avulso no Mercado Pago.
 * Retorna QR Code para exibir ao usuário.
 *
 * Usado no checkout de pacotes avulsos (fichas).
 * Implementação canônica desde 2026-06-11 — fundida do src/lib/mercadopago.ts legado
 * (que rodava em produção no checkout), preservando comportamento:
 *   - valida input com Zod
 *   - envia statement_descriptor + additional_info.items (quality_checklist MP [REQUIRED])
 *   - X-Idempotency-Key = idempotencyKey ?? externalReference (retry não duplica payment)
 *   - retorna qrCodeBase64 CRU (caller concatena o prefixo data URI ao renderizar)
 * DIFERENÇA vs AbacatePay: `amount` em reais (10.00), não centavos (1000).
 */
export async function createPixPayment(
  input: CreatePixPaymentInput
): Promise<MpResult<MpPixPaymentData>> {
  const parsed = createPixPaymentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Input inválido para criar PIX." };
  }

  const payerObj: Record<string, string> = { email: parsed.data.payerEmail };
  if (parsed.data.payerFirstName) payerObj.first_name = parsed.data.payerFirstName;
  if (parsed.data.payerLastName) payerObj.last_name = parsed.data.payerLastName;

  const body = {
    transaction_amount: parsed.data.amount, // reais float — NÃO multiplicar por 100
    description: parsed.data.description,
    payment_method_id: "pix",
    payer: payerObj,
    external_reference: parsed.data.externalReference,
    notification_url: parsed.data.notificationUrl,
    statement_descriptor: parsed.data.statementDescriptor,
    // Expiração explícita: 24h (igual ao default MP pra PIX; range: 30min → 30 dias)
    date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
    response = await fetch(`${MP_BASE_URL}/v1/payments`, {
      method: "POST",
      headers: buildHeaders(parsed.data.idempotencyKey ?? parsed.data.externalReference),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] createPixPayment fetch falhou:", err);
    return { success: false, error: "Falha de rede ao contatar Mercado Pago." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    console.error("[mercadopago] createPixPayment resposta não-JSON, status:", response.status);
    return { success: false, error: "Resposta inválida do Mercado Pago." };
  }

  if (!response.ok) {
    console.error("[mercadopago] createPixPayment erro API:", json);
    return { success: false, error: "Mercado Pago recusou o pagamento." };
  }

  const validated = mpPaymentApiResponseSchema.safeParse(json);
  if (!validated.success) {
    console.error("[mercadopago] createPixPayment resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada do Mercado Pago." };
  }

  const txData = validated.data.point_of_interaction?.transaction_data;
  if (!txData) {
    return { success: false, error: "Mercado Pago não retornou QR Code PIX." };
  }

  return {
    success: true,
    data: {
      id: String(validated.data.id),
      status: validated.data.status,
      qrCode: txData.qr_code,
      // CRU de propósito — checkout adiciona "data:image/png;base64," ao renderizar
      qrCodeBase64: txData.qr_code_base64,
      ticketUrl: txData.ticket_url,
      expiresAt: validated.data.date_of_expiration,
    },
  };
}

// ====================================================
// PREAPPROVAL (Pix Automático Subscription)
// POST /preapproval
// ====================================================

/**
 * Cria uma assinatura recorrente via Pix Automático (preapproval).
 * Modelo: pending-payment sem card_token_id.
 * User redireciona para init_point → autoriza PIX no app do banco → MP dispara webhook.
 */
export async function createPreapproval(
  input: CreatePreapprovalInput
): Promise<MpResult<MpPreapprovalData>> {
  const body = {
    reason: input.reason,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: input.transactionAmount, // reais float
      currency_id: "BRL",
      // sem start_date/end_date = recorrência indefinida
    },
    back_url: input.backUrl,
    status: "pending", // pending-payment model para PIX (sem card_token_id)
  };

  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/preapproval`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] createPreapproval fetch falhou:", err);
    return { success: false, error: "Falha de rede ao criar assinatura." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    console.error("[mercadopago] createPreapproval resposta não-JSON, status:", response.status);
    return { success: false, error: "Resposta inválida ao criar assinatura." };
  }

  if (!response.ok) {
    console.error("[mercadopago] createPreapproval erro API:", json);
    return { success: false, error: "Mercado Pago recusou a criação da assinatura." };
  }

  const validated = mpPreapprovalApiResponseSchema.safeParse(json);
  if (!validated.success) {
    console.error("[mercadopago] createPreapproval resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada ao criar assinatura." };
  }

  return {
    success: true,
    data: {
      id: validated.data.id,
      initPoint: validated.data.init_point,
      sandboxInitPoint: validated.data.sandbox_init_point,
      status: validated.data.status,
    },
  };
}

/**
 * Cancela uma assinatura existente via PUT /preapproval/{id}.
 * Status passa a 'cancelled' no MP; webhook confirma e atualiza DB local.
 */
export async function cancelPreapproval(preapprovalId: string): Promise<MpResult<void>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/preapproval/${preapprovalId}`, {
      method: "PUT",
      headers: buildHeaders(),
      body: JSON.stringify({ status: "cancelled" }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] cancelPreapproval fetch falhou:", err);
    return { success: false, error: "Falha de rede ao cancelar assinatura." };
  }

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    console.error("[mercadopago] cancelPreapproval erro API:", json);
    return { success: false, error: "Mercado Pago não conseguiu cancelar a assinatura." };
  }

  return { success: true, data: undefined };
}

// ====================================================
// GET helpers — busca dados completos via ID
// (webhook MP envia apenas o ID, não o payload completo)
// ====================================================

/** Busca detalhes de um pagamento avulso (evento payment.*) */
export async function getPaymentDetail(paymentId: string): Promise<MpResult<MpPaymentDetail>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] getPaymentDetail fetch falhou:", err);
    return { success: false, error: "Falha de rede ao buscar pagamento." };
  }

  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[mercadopago] getPaymentDetail erro API:", json);
    return { success: false, error: "Pagamento não encontrado no Mercado Pago." };
  }

  const validated = mpPaymentDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada ao buscar pagamento." };
  }

  return { success: true, data: validated.data };
}

/** Busca detalhes de um preapproval (evento subscription_preapproval.*) */
export async function getPreapprovalDetail(
  preapprovalId: string
): Promise<MpResult<MpPreapprovalDetail>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/preapproval/${preapprovalId}`, {
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] getPreapprovalDetail fetch falhou:", err);
    return { success: false, error: "Falha de rede ao buscar assinatura." };
  }

  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[mercadopago] getPreapprovalDetail erro API:", json);
    return { success: false, error: "Assinatura não encontrada no Mercado Pago." };
  }

  const validated = mpPreapprovalDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada ao buscar assinatura." };
  }

  return { success: true, data: validated.data };
}

/** Busca detalhes de um authorized_payment (evento subscription_authorized_payment.*) */
export async function getAuthorizedPaymentDetail(
  authorizedPaymentId: string
): Promise<MpResult<MpAuthorizedPaymentDetail>> {
  let response: Response;
  try {
    response = await fetch(`${MP_BASE_URL}/authorized_payments/${authorizedPaymentId}`, {
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[mercadopago] getAuthorizedPaymentDetail fetch falhou:", err);
    return { success: false, error: "Falha de rede ao buscar cobrança recorrente." };
  }

  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[mercadopago] getAuthorizedPaymentDetail erro API:", json);
    return { success: false, error: "Cobrança recorrente não encontrada." };
  }

  const validated = mpAuthorizedPaymentDetailSchema.safeParse(json);
  if (!validated.success) {
    return { success: false, error: "Resposta inesperada ao buscar cobrança recorrente." };
  }

  return { success: true, data: validated.data };
}

// ====================================================
// WEBHOOK SIGNATURE VALIDATION
// ====================================================

/**
 * Valida a assinatura HMAC-SHA256 do webhook Mercado Pago.
 *
 * DIFERENÇA vs AbacatePay:
 *   - AbacatePay: assina raw body inteiro, digest base64, header x-webhook-signature
 *   - Mercado Pago: assina manifest de headers, digest HEX, header x-signature
 *
 * Manifest: `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * Fonte: https://www.mercadopago.com.mx/developers/en/docs/your-integrations/notifications/webhooks
 *
 * @param dataId - query param `data.id` da URL recebida
 * @param requestId - header `x-request-id`
 * @param signatureHeader - header `x-signature` (formato: `ts=...,v1=...`)
 */
export function verifyMpWebhookSignature(
  dataId: string,
  requestId: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  let secret: string;
  try {
    secret = requireServerEnv("MP_WEBHOOK_SECRET");
  } catch {
    console.error("[mercadopago] MP_WEBHOOK_SECRET não configurado — assinatura não validada");
    return false;
  }

  // Parse: "ts=1704908010,v1=618c85345248dd..."
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [key, ...rest] = part.split("=");
    if (key && rest.length > 0) {
      parts[key.trim()] = rest.join("=").trim();
    }
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Manifest exato conforme docs MP — ponto-e-vírgula no final é obrigatório
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(manifest, "utf8"))
    .digest("hex"); // HEX — não base64 (diferente do AbacatePay)

  // timingSafeEqual previne timing attacks (per C8)
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    // Buffer.from com hex inválido pode lançar
    return false;
  }
}

// Exporta isTestMode para uso em Server Actions
export { isTestMode };
