// Ponto de entrada público da lib Mercado Pago.
// Importar via "@/lib/mercadopago" (não diretamente dos sub-módulos).

export {
  createPixPayment,
  createPreapproval,
  cancelPreapproval,
  getPaymentDetail,
  getPreapprovalDetail,
  getAuthorizedPaymentDetail,
  verifyMpWebhookSignature,
  isTestMode,
} from "./client";

export type {
  CreatePixPaymentInput,
  MpPixPaymentData,
  CreatePreapprovalInput,
  MpPreapprovalData,
  MpPaymentDetail,
  MpPreapprovalDetail,
  MpAuthorizedPaymentDetail,
  MpWebhookPayload,
  MpWebhookEventType,
  MpResult,
} from "./types";

export {
  createPixPaymentInputSchema,
  createPreapprovalInputSchema,
  mpWebhookPayloadSchema,
  MP_WEBHOOK_EVENT_TYPES,
} from "./types";
