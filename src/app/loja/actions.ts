"use server";

// Ações da loja: criar o pedido (botão de pagar) e consultar o status (página do pedido).

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { createStoreOrder, type CreateOrderResult } from "@/lib/loja/orders";
import { reconcileStoreOrder } from "@/lib/loja/order-payments";
import { getPublicOrder } from "@/lib/loja/public-order";
import { ORIGIN_COOKIE, parseOrigin } from "@/lib/loja/attribution";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { isUuid } from "@/lib/loja/refs";
import type { StoreOrderStatus } from "@/lib/loja/payment-state";

export async function criarPedido(slug: string, values: Record<string, unknown>): Promise<CreateOrderResult> {
  const { loja } = await getFeatureFlags();
  if (!loja) return { ok: false, error: "A loja está fechada agora." };
  // Freio de abuso: cada pedido abre uma cobrança no Mercado Pago.
  if (!allowRequest("pedido", clientIp(await headers()), 8, 10 * 60_000)) {
    return { ok: false, error: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = parseOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
  return createStoreOrder({ slug, raw: values, userId: user?.id ?? null, origin });
}

/** Status do pedido para a página que espera o pagamento; concilia com o Mercado Pago antes. */
export async function consultarPedido(orderId: string): Promise<{ status: StoreOrderStatus } | null> {
  if (!isUuid(orderId)) return null;
  if (!allowRequest("consulta", clientIp(await headers()), 120, 60_000)) return null;
  await reconcileStoreOrder(orderId);
  const order = await getPublicOrder(orderId);
  return order ? { status: order.status } : null;
}
