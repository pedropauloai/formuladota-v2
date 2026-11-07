// Criação do pedido da loja: valida contra o produto do banco, confere as vagas do mês, grava
// pendente e abre o pagamento. Escreve com service role porque o checkout aceita visitante
// (serviço se compra sem login) e a tabela não tem política de escrita para o cliente: o preço
// e o status nunca vêm do navegador.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createPixPayment, isTestMode } from "@/lib/mercadopago";
import { publicEnv } from "@/lib/env";
import { getActiveProduct, type StoreProduct, type StoreVariant } from "./catalog";
import { buildCheckoutSchema, detailsFrom, fieldErrors, type CheckoutInput } from "./checkout-schema";
import { toStoreReference } from "./refs";
import { centsToReais } from "./money";
import { createCardPreference } from "./mercadopago";
import { priceOrder } from "./pricing";
import { getSlots } from "./slots";
import type { Origin } from "./attribution";

export type CreateOrderResult =
  | { ok: true; orderId: string; redirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export interface CreateOrderArgs {
  slug: string;
  raw: Record<string, unknown>;
  userId: string | null;
  origin: Origin | null;
}

/** O que foi vendido, já com o preço final: o mesmo valor vai para o pedido e para o Mercado Pago. */
interface PricedOrder {
  product: StoreProduct;
  variant: StoreVariant;
  input: CheckoutInput;
  amountCents: number;
  quantity: number;
  label: string;
}

function siteUrl(): string {
  return publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

/** O Mercado Pago só entrega notificação em endereço público com https. */
function notificationUrl(): string | undefined {
  const url = siteUrl();
  return url.startsWith("https://") ? `${url}/api/webhooks/mercadopago` : undefined;
}

const numberOrUndefined = (value: unknown) => (typeof value === "number" ? value : undefined);

const REOPEN_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

/** Mensagem de vaga esgotada, ou null quando ainda cabe o pedido. */
async function soldOutMessage(product: StoreProduct, quantity: number): Promise<string | null> {
  if (product.monthlyCapacity === null) return null;
  const slots = await getSlots([product]);
  const info = slots?.get(product.id);
  if (!info) return "Não deu para conferir as vagas agora. Tente de novo em instantes.";
  if (info.left >= quantity) return null;
  return `As vagas deste mês acabaram. Abrem de novo em ${REOPEN_FORMAT.format(new Date(info.reopensAt))}.`;
}

export async function createStoreOrder(args: CreateOrderArgs): Promise<CreateOrderResult> {
  const product = await getActiveProduct(args.slug);
  if (!product) return { ok: false, error: "Este produto não está à venda agora." };
  if (product.requiresLogin && !args.userId) {
    return { ok: false, error: "Entre com o Discord para comprar este produto." };
  }
  const parsed = buildCheckoutSchema(product.formFields).safeParse(args.raw);
  if (!parsed.success) {
    return { ok: false, error: "Confira os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  }
  const variant = product.variants.find((v) => v.id === parsed.data.variantId);
  if (!variant) {
    return { ok: false, error: "Esta opção saiu de venda.", fieldErrors: { variantId: "Escolha outra opção." } };
  }
  const data = parsed.data as Record<string, unknown>;
  const price = priceOrder(product, variant, {
    quantity: numberOrUndefined(data.quantity),
    mmr_atual: numberOrUndefined(data.mmr_atual),
    mmr_alvo: numberOrUndefined(data.mmr_alvo),
  });
  if (!price.ok) return { ok: false, error: "Confira os campos destacados.", fieldErrors: { [price.field]: price.message } };
  const soldOut = await soldOutMessage(product, price.quantity);
  if (soldOut) return { ok: false, error: soldOut };

  const order: PricedOrder = { product, variant, input: parsed.data, amountCents: price.amountCents, quantity: price.quantity, label: price.label };
  const orderId = await insertOrder(order, args);
  if (!orderId) return { ok: false, error: "Não deu para registrar o pedido. Tente de novo em instantes." };
  return parsed.data.method === "pix" ? startPix(orderId, order) : startCard(orderId, order);
}

async function insertOrder(order: PricedOrder, args: CreateOrderArgs): Promise<string | null> {
  const origin = args.origin ?? {};
  const { product, variant, input } = order;
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .insert({
      product_id: product.id,
      variant_id: variant.id,
      product_title: product.title,
      variant_label: order.label,
      amount_cents: order.amountCents,
      quantity: order.quantity,
      user_id: args.userId,
      buyer_name: input.name,
      buyer_email: input.email,
      buyer_whatsapp: input.whatsapp,
      details: detailsFrom(input as Record<string, unknown>, product.formFields),
      payment_method: input.method,
      utm_source: origin.utm_source ?? null,
      utm_medium: origin.utm_medium ?? null,
      utm_campaign: origin.utm_campaign ?? null,
      utm_content: origin.utm_content ?? null,
      utm_term: origin.utm_term ?? null,
      referrer_host: origin.referrer_host ?? null,
      landing_path: origin.landing_path ?? null,
      is_test: isTestMode(),
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[loja] gravar pedido falhou:", error?.message);
    return null;
  }
  return data.id;
}

async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("store_orders")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pendente");
  if (error) console.error("[loja] cancelar pedido sem pagamento falhou:", error.message);
}

function splitName(name: string): { first: string; last?: string } {
  const [first = name, ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.join(" ") || undefined };
}

async function startPix(orderId: string, order: PricedOrder): Promise<CreateOrderResult> {
  const { first, last } = splitName(order.input.name);
  const pix = await createPixPayment({
    amount: centsToReais(order.amountCents),
    description: `FORMULADOTA: ${order.product.title} (${order.label})`.slice(0, 200),
    payerEmail: order.input.email,
    payerFirstName: first,
    payerLastName: last,
    externalReference: toStoreReference(orderId),
    notificationUrl: notificationUrl(),
    statementDescriptor: "FORMULADOTA",
    itemId: order.variant.id,
    itemTitle: `${order.product.title}: ${order.label}`,
    itemCategoryId: "services",
    idempotencyKey: `loja-pix-${orderId}`,
  });
  if (!pix.success) {
    await cancelOrder(orderId);
    return { ok: false, error: "O Mercado Pago não gerou o Pix agora. Tente de novo ou pague com cartão." };
  }
  const { error } = await createServiceClient()
    .from("store_orders")
    .update({
      mp_payment_id: pix.data.id,
      pix_copia_e_cola: pix.data.qrCode,
      pix_qr_base64: pix.data.qrCodeBase64,
      pix_expires_at: pix.data.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) console.error("[loja] gravar Pix no pedido falhou:", error.message);
  return { ok: true, orderId, redirectUrl: `/loja/pedido/${orderId}` };
}

async function startCard(orderId: string, order: PricedOrder): Promise<CreateOrderResult> {
  const preference = await createCardPreference({
    orderRef: toStoreReference(orderId),
    itemId: order.variant.id,
    title: `${order.product.title}: ${order.label}`,
    description: order.product.summary || order.product.title,
    amountCents: order.amountCents,
    payer: { name: order.input.name, email: order.input.email, whatsapp: order.input.whatsapp },
    returnUrl: `${siteUrl()}/loja/pedido/${orderId}`,
    notificationUrl: notificationUrl(),
  });
  if (!preference.success) {
    await cancelOrder(orderId);
    return { ok: false, error: "O Mercado Pago não abriu o pagamento com cartão agora. Tente de novo ou pague com Pix." };
  }
  const { error } = await createServiceClient()
    .from("store_orders")
    .update({ mp_preference_id: preference.data.id, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) console.error("[loja] gravar preferência no pedido falhou:", error.message);
  return { ok: true, orderId, redirectUrl: preference.data.checkoutUrl };
}
