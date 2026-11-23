// Pedido que não chegou a abrir pagamento (o Mercado Pago não gerou o Pix ou o cartão, ou a reserva
// falhou): cancela o pedido e solta na hora as vagas que ele segurava. Sem isso, a última vaga da
// fila ficava esgotada até o prazo da reserva vencer (10 min na fila, 35 na agenda).

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface CancelUnpaidResult {
  /** O pedido estava pendente e foi cancelado agora. */
  cancelled: boolean;
  /** Quantas reservas seguradas pelo pedido voltaram a ficar livres. */
  released: number;
}

/** Cancela o pedido ainda pendente e devolve as reservas dele; pedido pago ou já fechado fica como está. */
export async function cancelUnpaidOrder(orderId: string, now = new Date()): Promise<CancelUnpaidResult> {
  const supabase = createServiceClient();
  const stamp = now.toISOString();
  const { data: orders, error } = await supabase
    .from("store_orders")
    .update({ status: "cancelado", updated_at: stamp })
    .eq("id", orderId)
    .eq("status", "pendente")
    .select("id");
  if (error) {
    console.error("[loja] cancelar pedido sem pagamento falhou:", error.message);
    return { cancelled: false, released: 0 };
  }
  if (!orders?.length) return { cancelled: false, released: 0 };
  // Só a reserva segurada (status reservado) volta: vaga confirmada nunca sai por aqui.
  const { data: holds, error: holdError } = await supabase
    .from("store_bookings")
    .update({ status: "cancelado", updated_at: stamp })
    .eq("order_id", orderId)
    .eq("status", "reservado")
    .select("id");
  if (holdError) console.error("[loja] soltar a vaga do pedido cancelado falhou:", holdError.message);
  return { cancelled: true, released: holds?.length ?? 0 };
}
