// O que um pagamento do Mercado Pago faz com um pedido da loja. Regra pura: o webhook e a
// conciliação da página do pedido chamam esta mesma função, então os dois decidem igual.

export const STORE_ORDER_STATUSES = [
  "pendente",
  "pago",
  "em_revisao",
  "expirado",
  "cancelado",
  "reembolsado",
] as const;
export type StoreOrderStatus = (typeof STORE_ORDER_STATUSES)[number];

export interface PaymentSnapshot {
  id: string;
  status: string;
  statusDetail?: string;
  /** transaction_amount em centavos; null quando o Mercado Pago não informou. */
  amountCents: number | null;
  currency?: string;
  externalReference?: string;
  liveMode?: boolean;
}

export interface OrderForDecision {
  status: StoreOrderStatus;
  amountCents: number;
  /** ID do Pix que o próprio pedido gerou: só ele vencido expira o pedido. */
  pixPaymentId: string | null;
}

export type ReviewReason = "valor_menor" | "moeda";

export type Transition =
  | { kind: "pagar"; paidAmountCents: number }
  | { kind: "revisar"; reason: ReviewReason; paidAmountCents: number | null }
  | { kind: "reembolsar" }
  | { kind: "expirar" }
  | { kind: "nada" };

const REFUNDED = new Set(["refunded", "charged_back"]);
const NOTHING: Transition = { kind: "nada" };

function decideApproved(order: OrderForDecision, payment: PaymentSnapshot): Transition {
  // Só pedido pendente muda: pago, revisado ou reembolsado não volta por notificação repetida.
  if (order.status !== "pendente") return NOTHING;
  if (payment.currency && payment.currency !== "BRL") {
    return { kind: "revisar", reason: "moeda", paidAmountCents: payment.amountCents };
  }
  if (payment.amountCents === null || payment.amountCents < order.amountCents) {
    return { kind: "revisar", reason: "valor_menor", paidAmountCents: payment.amountCents };
  }
  return { kind: "pagar", paidAmountCents: payment.amountCents };
}

export function decideTransition(order: OrderForDecision, payment: PaymentSnapshot): Transition {
  if (payment.status === "approved") return decideApproved(order, payment);
  if (REFUNDED.has(payment.status)) {
    return order.status === "pago" || order.status === "em_revisao" ? { kind: "reembolsar" } : NOTHING;
  }
  // Pix vencido (cancelled) só expira o pedido quando é o Pix dele; cartão recusado deixa tentar de novo.
  if (payment.status === "cancelled" && order.status === "pendente" && payment.id === order.pixPaymentId) {
    return { kind: "expirar" };
  }
  return NOTHING;
}

/** Na conciliação chegam vários pagamentos da mesma referência: o aprovado decide primeiro. */
export function orderPaymentsForDecision(payments: PaymentSnapshot[]): PaymentSnapshot[] {
  const rank = (p: PaymentSnapshot) => (p.status === "approved" ? 0 : REFUNDED.has(p.status) ? 1 : 2);
  return [...payments].sort((a, b) => rank(a) - rank(b));
}
