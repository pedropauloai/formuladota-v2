// Mercado Pago — Zod schemas e tipos TypeScript.
// Cobre: PIX avulso (POST /v1/payments) + preapproval (POST /preapproval) + webhook events.
//
// Diferenças críticas vs AbacatePay:
//   - amount em REAIS float (ex: 47.00) — AbacatePay usava centavos int (ex: 4700)
//   - qr_code_base64 SEM prefixo data URI — concatenar `data:image/png;base64,` ao renderizar
//   - webhook: HMAC-SHA256 HEX sobre manifest (não sobre raw body como AbacatePay)
//   - webhook: header `x-signature` (não `x-webhook-signature`)

import { z } from "zod";

// ====================================================
// PIX AVULSO — POST /v1/payments
// ====================================================

export const createPixPaymentInputSchema = z.object({
  amount: z.number().positive(),             // reais float (ex: 47.00)
  description: z.string().min(1).max(200),
  payerEmail: z.string().email(),
  externalReference: z.string(),             // nosso purchase.id
  notificationUrl: z.string().url(),
  idempotencyKey: z.string(),                // purchase.id (evita duplicatas)
});
export type CreatePixPaymentInput = z.infer<typeof createPixPaymentInputSchema>;

// Shape interno processado (campos da API MP → camelCase para o app)
export interface MpPixPaymentData {
  id: string;             // int do MP convertido para string
  qrCode: string;         // brCode texto copiar-e-colar
  qrCodeBase64: string;   // "data:image/png;base64,..." (prefixo já concatenado)
  ticketUrl: string;      // URL alternativa MP
  expiresAt: string;      // ISO 8601
}

// Schema Zod para a resposta bruta da API MP /v1/payments
export const mpPaymentApiResponseSchema = z.object({
  id: z.number(),
  status: z.string(),
  point_of_interaction: z.object({
    transaction_data: z.object({
      qr_code: z.string(),
      qr_code_base64: z.string(),
      ticket_url: z.string(),
    }),
  }),
  date_of_expiration: z.string(),
});

// ====================================================
// PREAPPROVAL (Pix Automático Subscription)
// POST /preapproval
// ====================================================

export const createPreapprovalInputSchema = z.object({
  reason: z.string().min(1).max(200),
  payerEmail: z.string().email(),
  externalReference: z.string(),             // `user-${user.id}`
  transactionAmount: z.number().positive(),  // reais float (ex: 47.00)
  backUrl: z.string().url(),                 // redirect após autorização
});
export type CreatePreapprovalInput = z.infer<typeof createPreapprovalInputSchema>;

// Shape interno processado
export interface MpPreapprovalData {
  id: string;                  // mp_preapproval_id salvo no DB
  initPoint: string;           // URL produção — redirect do user
  sandboxInitPoint: string;    // URL sandbox — usar em TEST- mode
  status: string;              // 'pending' inicialmente
}

// Schema Zod para a resposta bruta da API MP /preapproval
export const mpPreapprovalApiResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  init_point: z.string(),
  sandbox_init_point: z.string(),
  next_payment_date: z.string().optional(),
  payer_email: z.string().optional(),
});

// ====================================================
// WEBHOOK EVENTS
// ====================================================

// Eventos que o handler suporta
export const MP_WEBHOOK_EVENT_TYPES = [
  "payment",
  "subscription_preapproval",
  "subscription_authorized_payment",
] as const;
export type MpWebhookEventType = (typeof MP_WEBHOOK_EVENT_TYPES)[number];

// Payload shallow que MP envia (dados completos requerem GET separado)
export const mpWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  type: z.string(),
  action: z.string(),
  data: z.object({
    id: z.string(),        // payment_id OU preapproval_id OU authorized_payment_id
  }),
  live_mode: z.boolean().optional(),
  date_created: z.string().optional(),
});
export type MpWebhookPayload = z.infer<typeof mpWebhookPayloadSchema>;

// Resposta do GET /v1/payments/{id} (apenas campos relevantes)
export const mpPaymentDetailSchema = z.object({
  id: z.number(),
  status: z.string(),                        // 'approved', 'pending', 'rejected', etc.
  external_reference: z.string().optional(), // nosso purchase.id
  transaction_amount: z.number().optional(),
});
export type MpPaymentDetail = z.infer<typeof mpPaymentDetailSchema>;

// Resposta do GET /preapproval/{id}
export const mpPreapprovalDetailSchema = z.object({
  id: z.string(),
  status: z.string(),               // 'pending', 'authorized', 'cancelled', 'paused'
  next_payment_date: z.string().optional(),
  payer_email: z.string().optional(),
  external_reference: z.string().optional(),
});
export type MpPreapprovalDetail = z.infer<typeof mpPreapprovalDetailSchema>;

// Resposta do GET /authorized_payments/{id}
export const mpAuthorizedPaymentDetailSchema = z.object({
  id: z.string(),
  status: z.string(),
  preapproval_id: z.string(),
  date_approved: z.string().optional(),
  transaction_amount: z.number().optional(),
});
export type MpAuthorizedPaymentDetail = z.infer<typeof mpAuthorizedPaymentDetailSchema>;

// ====================================================
// RESULTADO discriminado (force caller a checar .success)
// ====================================================

export type MpResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
