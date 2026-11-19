// Cobrança mensal do cartão: o que conta como pagamento do Battlepass. Regra pura, testada com o
// formato documentado da API de assinaturas (o ID da cobrança chega como número).

export interface AuthorizedPaymentLike {
  id: string;
  status?: string | null;
  transaction_amount?: number | null;
  debit_date?: string | null;
  date_created?: string | null;
  payment?: { id?: string | null; status?: string | null } | null;
}

export interface PaymentDetailLike {
  status: string;
  transaction_amount?: number | null;
  currency_id?: string | null;
  date_approved?: string | null;
}

export interface Charge {
  authorizedId: string;
  paymentId: string;
  amountCents: number;
  paidAt: string;
}

/** A cobrança só entra no livro com o pagamento aprovado, em real e com valor. */
export function chargeFrom(item: AuthorizedPaymentLike, detail: PaymentDetailLike | null): Charge | null {
  const paymentId = item.payment?.id;
  if (!paymentId || item.payment?.status !== "approved" || !detail) return null;
  if (detail.status !== "approved") return null;
  if (detail.currency_id && detail.currency_id !== "BRL") return null;
  const amount = detail.transaction_amount ?? item.transaction_amount;
  if (typeof amount !== "number" || amount <= 0) return null;
  return {
    authorizedId: item.id,
    paymentId,
    amountCents: Math.round(amount * 100),
    paidAt: detail.date_approved ?? item.debit_date ?? item.date_created ?? new Date().toISOString(),
  };
}
