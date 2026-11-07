// Vagas restantes no mês dos produtos com limite (mentoria, acompanhamento). Lê os pedidos com
// service role porque store_orders não tem leitura pública; daqui só sai a contagem.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { monthStartUtc, nextMonthStartUtc, slotsLeft } from "./capacity";
import type { StoreProduct } from "./catalog";

export interface SlotInfo {
  capacity: number;
  left: number;
  /** Quando as vagas abrem de novo (dia 1º do mês seguinte, em São Paulo). */
  reopensAt: string;
}

/** null quando o banco não respondeu: quem chama decide (a vitrine esconde, a compra recusa). */
export async function getSlots(products: readonly StoreProduct[], now = new Date()): Promise<Map<string, SlotInfo> | null> {
  const capped = products.filter((p) => p.monthlyCapacity !== null);
  const result = new Map<string, SlotInfo>();
  if (capped.length === 0) return result;
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .select("product_id, status, quantity, created_at")
    .in("product_id", capped.map((p) => p.id))
    // Venda de teste não ocupa vaga real, e vice-versa.
    .eq("is_test", isTestMode())
    .in("status", ["pendente", "pago", "em_revisao"])
    .gte("created_at", monthStartUtc(now).toISOString());
  if (error) {
    console.error("[loja] contar vagas falhou:", error.message);
    return null;
  }
  const reopensAt = nextMonthStartUtc(now).toISOString();
  for (const product of capped) {
    const orders = (data ?? [])
      .filter((o) => o.product_id === product.id)
      .map((o) => ({ status: o.status, quantity: o.quantity, createdAt: o.created_at }));
    const capacity = product.monthlyCapacity ?? 0;
    result.set(product.id, { capacity, left: slotsLeft(capacity, orders, now), reopensAt });
  }
  return result;
}
