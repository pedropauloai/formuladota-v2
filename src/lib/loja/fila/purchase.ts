// Compra da vaga pela fila da party: nada digitado. Nome público e e-mail vêm do login com Discord,
// o ID do Dota sai da Steam vinculada (o Pedro convida por ele), e o pedido segue o fluxo da loja
// (pedido, Pix, webhook). A trava de lotação mora no banco (store_reservar_fila).

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getActiveProduct } from "@/lib/loja/catalog";
import { openStoreOrder, type PricedOrder } from "@/lib/loja/orders";
import { priceOrder } from "@/lib/loja/pricing";
import { AGENDA } from "@/lib/loja/agenda";
import type { Origin } from "@/lib/loja/attribution";
import type { PaymentMethod } from "@/lib/loja/checkout-schema";
import { PARTY_PRODUCT_SLUG, getQueueSnapshot, getViewerSteam, type ViewerSteam } from "./server";
import { seatsOpen } from "./model";

/** O que pode dar errado, em código: a página traduz para o idioma de quem compra. */
export type BuySeatError = "fechada" | "steam" | "email" | "sem_live" | "sem_vaga" | "quantidade" | "pagamento";

export type BuySeatResult =
  | { ok: true; orderId: string; method: PaymentMethod; redirectUrl: string }
  | { ok: false; error: BuySeatError };

export interface BuySeatArgs {
  userId: string;
  email: string | null | undefined;
  quantity: number;
  method: PaymentMethod;
  origin: Origin | null;
}

/** O pedido guarda de 2 a 120 caracteres de nome. */
function buyerName(name: string): string {
  const trimmed = name.trim().slice(0, 120);
  return trimmed.length >= 2 ? trimmed : `Jogador ${trimmed}`.trim();
}

async function publicName(userId: string, steam: ViewerSteam): Promise<string> {
  const identity = (await getIdentityMap(await createClient(), [userId])).get(userId);
  return buyerName(identity?.name || steam.persona || "Jogador");
}

/** Vagas à venda agora, antes de abrir o pedido; a conta final é a do banco, com trava. */
async function precheck(quantity: number): Promise<BuySeatError | null> {
  const { live } = await getQueueSnapshot();
  if (!live) return "sem_live";
  return seatsOpen(live) >= quantity ? null : "sem_vaga";
}

export async function buySeat(args: BuySeatArgs): Promise<BuySeatResult> {
  const product = await getActiveProduct(PARTY_PRODUCT_SLUG);
  const variant = product?.variants[0];
  if (!product || !variant || product.liveSeat !== "party") return { ok: false, error: "fechada" };
  const steam = await getViewerSteam(args.userId);
  if (!steam) return { ok: false, error: "steam" };
  if (!args.email) return { ok: false, error: "email" };
  const price = priceOrder(product, variant, { quantity: args.quantity });
  if (!price.ok) return { ok: false, error: "quantidade" };
  const blocked = await precheck(price.quantity);
  if (blocked) return { ok: false, error: blocked };

  const order: PricedOrder = {
    product,
    variant,
    amountCents: price.amountCents,
    quantity: price.quantity,
    label: price.label,
    method: args.method,
    buyer: { name: await publicName(args.userId, steam), email: args.email, whatsapp: null },
    details: { dota_id: steam.dotaId, steam: `https://steamcommunity.com/profiles/${steam.steamId64}` },
    paymentMinutes: AGENDA.paymentMinutes,
  };
  const result = await openStoreOrder(order, { userId: args.userId, origin: args.origin, returnPath: () => "/party" }, { kind: "fila" });
  if (result.ok) return { ok: true, orderId: result.orderId, method: args.method, redirectUrl: result.redirectUrl };
  // A reserva recusada marca o campo da quantidade: a fila encheu entre a conferência e a compra.
  return { ok: false, error: result.fieldErrors?.quantity ? "sem_vaga" : "pagamento" };
}
