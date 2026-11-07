// Criação do pedido da loja: valida contra o produto do banco, grava pendente e abre o pagamento.
// Escreve com service role porque o checkout aceita visitante (serviço se compra sem login) e a
// tabela não tem política de escrita para o cliente: o preço e o status nunca vêm do navegador.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createPixPayment, isTestMode } from "@/lib/mercadopago";
import { publicEnv } from "@/lib/env";
import { getActiveProduct, type StoreProduct, type StoreVariant } from "./catalog";
import { buildCheckoutSchema, detailsFrom, fieldErrors, type CheckoutInput } from "./checkout-schema";
import { toStoreReference } from "./refs";
import { centsToReais } from "./money";
import { createCardPreference } from "./mercadopago";
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

function siteUrl(): string {
  return publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

/** O Mercado Pago só entrega notificação em endereço público com https. */
function notificationUrl(): string | undefined {
  const url = siteUrl();
  return url.startsWith("https://") ? `${url}/api/webhooks/mercadopago` : undefined;
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
  const orderId = await insertOrder(product, variant, parsed.data, args);
  if (!orderId) return { ok: false, error: "Não deu para registrar o pedido. Tente de novo em instantes." };
  return parsed.data.method === "pix"
    ? startPix(orderId, product, variant, parsed.data)
    : startCard(orderId, product, variant, parsed.data);
}

async function insertOrder(
  product: StoreProduct,
  variant: StoreVariant,
  input: CheckoutInput,
  args: CreateOrderArgs
): Promise<string | null> {
  const origin = args.origin ?? {};
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .insert({
      product_id: product.id,
      variant_id: variant.id,
      product_title: product.title,
      variant_label: variant.label,
      amount_cents: variant.priceCents,
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

async function startPix(orderId: string, product: StoreProduct, variant: StoreVariant, input: CheckoutInput): Promise<CreateOrderResult> {
  const { first, last } = splitName(input.name);
  const pix = await createPixPayment({
    amount: centsToReais(variant.priceCents),
    description: `FORMULADOTA: ${product.title} (${variant.label})`.slice(0, 200),
    payerEmail: input.email,
    payerFirstName: first,
    payerLastName: last,
    externalReference: toStoreReference(orderId),
    notificationUrl: notificationUrl(),
    statementDescriptor: "FORMULADOTA",
    itemId: variant.id,
    itemTitle: `${product.title}: ${variant.label}`,
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

async function startCard(orderId: string, product: StoreProduct, variant: StoreVariant, input: CheckoutInput): Promise<CreateOrderResult> {
  const preference = await createCardPreference({
    orderRef: toStoreReference(orderId),
    itemId: variant.id,
    title: `${product.title}: ${variant.label}`,
    description: product.summary || product.title,
    amountCents: variant.priceCents,
    payer: { name: input.name, email: input.email, whatsapp: input.whatsapp },
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
