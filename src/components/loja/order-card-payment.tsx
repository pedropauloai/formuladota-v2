"use client";

// O formulário de cartão na página do pedido: quando o pagamento aprova (ou entra em análise), a
// página se redesenha com o novo status.

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CardPaymentBox } from "./card-payment-box";

export function OrderCardPayment(props: { orderId: string; amountCents: number; email: string | null; publicKey: string }) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  return <CardPaymentBox {...props} onSettled={refresh} />;
}
