// Schemas Zod pra payloads Mercado Pago.
// Cobre: criar pagamento PIX avulso (/v1/payments), criar preapproval Pix Automático,
// e webhooks de notificação (payment.* + subscription_preapproval + subscription_authorized_payment).

import { z } from "zod";

// =============== INPUT: criar pagamento PIX avulso ===============

export const createPixPaymentInputSchema = z.object({
  amount: z.number().positive(),                    // valor em reais (ex: 47.00)
  description: z.string().min(1).max(200),
  externalReference: z.string().min(1),             // purchase.id pra correlacionar
  payerEmail: z.string().email(),
  payerFirstName: z.string().min(1).optional(),     // melhor aprovação MP (quality_checklist [REQUIRED])
  payerLastName: z.string().min(1).optional(),
  notificationUrl: z.string().url().optional(),
  // Item array completo (quality_checklist [REQUIRED])
  itemId: z.string().min(1),                        // package.id
  itemTitle: z.string().min(1).max(200),            // package.nome
  itemCategoryId: z.string().default("services"),
  statementDescriptor: z.string().max(22).default("FORMULADOTA"), // aparece na fatura
});
export type CreatePixPaymentInput = z.infer<typeof createPixPaymentInputSchema>;

// =============== RESPONSE: pagamento PIX criado ===============

export const pixPaymentResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  status: z.string(),                                // "pending" / "approved" / "rejected" / "cancelled"
  point_of_interaction: z
    .object({
      transaction_data: z.object({
        qr_code: z.string(),                         // BR Code text (copiar-e-colar)
        qr_code_base64: z.string(),                  // PNG base64 (data URL)
        ticket_url: z.string().url().optional(),
      }),
    })
    .optional(),
  date_of_expiration: z.string().optional(),
});
export type PixPaymentResponse = z.infer<typeof pixPaymentResponseSchema>;

// =============== INPUT: criar preapproval (subscription Pix Automático) ===============

export const createPreapprovalInputSchema = z.object({
  reason: z.string().min(1).max(200),                // ex: "FORMULADOTA HUB Mensalidade"
  amount: z.number().positive(),                     // valor mensal em reais (ex: 47.00)
  payerEmail: z.string().email(),
  externalReference: z.string().min(1),              // user.id pra correlacionar
  backUrl: z.string().url(),                         // URL pós-autorização
});
export type CreatePreapprovalInput = z.infer<typeof createPreapprovalInputSchema>;

// =============== RESPONSE: preapproval criado ===============

export const preapprovalResponseSchema = z.object({
  id: z.string(),                                    // mp_preapproval_id
  status: z.string(),                                // "pending" / "authorized" / "paused" / "cancelled"
  init_point: z.string().url(),                      // URL onde user autoriza Pix Automático
  next_payment_date: z.string().optional(),          // ISO timestamp
});
export type PreapprovalResponse = z.infer<typeof preapprovalResponseSchema>;

// =============== WEBHOOK: notificação MP ===============
// MP envia notificações com formato:
// { action, api_version, data: { id }, date_created, id, live_mode, type, user_id }
// Onde `type` é "payment" | "subscription_preapproval" | "subscription_authorized_payment"
// e `data.id` é o ID do recurso a buscar via API GET.

export const webhookNotificationSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),                                  // "payment" | "subscription_preapproval" | "subscription_authorized_payment"
  action: z.string().optional(),                     // ex: "payment.created", "payment.updated"
  api_version: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
  }),
  date_created: z.string().optional(),
  live_mode: z.boolean().optional(),
  user_id: z.union([z.string(), z.number()]).transform(String).optional(),
});
export type WebhookNotification = z.infer<typeof webhookNotificationSchema>;

// =============== GET /v1/payments/{id} response ===============

export const paymentDetailSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  status: z.string(),                                // "pending"|"approved"|"rejected"|"cancelled"
  external_reference: z.string().optional(),
  payer: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
  transaction_amount: z.number().optional(),
  description: z.string().optional(),
  date_approved: z.string().nullable().optional(),
});
export type PaymentDetail = z.infer<typeof paymentDetailSchema>;

// =============== GET /preapproval/{id} response ===============

export const preapprovalDetailSchema = z.object({
  id: z.string(),
  status: z.string(),                                // "pending"|"authorized"|"paused"|"cancelled"
  external_reference: z.string().optional(),
  payer_email: z.string().email().optional(),
  next_payment_date: z.string().optional(),
  auto_recurring: z
    .object({
      transaction_amount: z.number().optional(),
      currency_id: z.string().optional(),
      frequency: z.number().optional(),
      frequency_type: z.string().optional(),
    })
    .optional(),
});
export type PreapprovalDetail = z.infer<typeof preapprovalDetailSchema>;

// =============== GET /authorized_payments/{id} response (renovação mensal) ===============

export const authorizedPaymentDetailSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  preapproval_id: z.string(),
  status: z.string(),
  payment_id: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  transaction_amount: z.number().optional(),
  payment_date: z.string().optional(),
  next_payment_date: z.string().optional(),
});
export type AuthorizedPaymentDetail = z.infer<typeof authorizedPaymentDetailSchema>;
