// AbacatePay V2 Transparent PIX — schemas Zod e tipos.
// Fonte canônica: https://docs.abacatepay.com/pages/transparents/create.md
// Webhook events: https://docs.abacatepay.com/pages/webhooks/events/transparent.md

import { z } from "zod";

// ====== REQUEST: criar PIX ======

export const createTransparentPixInputSchema = z.object({
  amount: z.number().int().positive(), // centavos
  description: z.string().min(1).max(200),
  externalId: z.string().uuid(), // nosso purchase.id
  expiresIn: z.number().int().positive().optional(), // segundos, default 3600
});
export type CreateTransparentPixInput = z.infer<typeof createTransparentPixInputSchema>;

// ====== RESPONSE: criar PIX ======

export const transparentPixDataSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.string(),
  brCode: z.string(),         // texto copiar-e-colar
  brCodeBase64: z.string(),   // PNG inline (data:image/png;base64,...)
  expiresAt: z.string(),
});
export type TransparentPixData = z.infer<typeof transparentPixDataSchema>;

export const transparentPixResponseSchema = z.object({
  success: z.boolean(),
  data: transparentPixDataSchema.optional(),
  error: z.string().optional(),
});
export type TransparentPixResponse = z.infer<typeof transparentPixResponseSchema>;

// ====== WEBHOOK: payload events transparent.* ======

export const ABACATEPAY_WEBHOOK_EVENTS = [
  "transparent.completed",
  "transparent.disputed",
  "transparent.refunded",
] as const;
export type AbacatepayWebhookEvent = (typeof ABACATEPAY_WEBHOOK_EVENTS)[number];

export const webhookCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const webhookTransparentSchema = z.object({
  id: z.string(),                       // external_payment_id no nosso DB
  externalId: z.string().optional(),    // purchase.id que passamos como metadata
  amount: z.number(),
  status: z.string(),
});

export const webhookPayloadSchema = z.object({
  event: z.enum(ABACATEPAY_WEBHOOK_EVENTS),
  apiVersion: z.number().optional(),
  devMode: z.boolean().optional(),
  data: z.object({
    transparent: webhookTransparentSchema,
    customer: webhookCustomerSchema.optional(),
  }),
});
export type AbacatepayWebhookPayload = z.infer<typeof webhookPayloadSchema>;
