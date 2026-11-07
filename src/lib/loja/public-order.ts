// O que a página do pedido mostra. O UUID do pedido é a chave de acesso, então a leitura
// devolve só produto, valor, status e o Pix: nada de e-mail, WhatsApp nem respostas do formulário.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isUuid } from "./refs";
import type { StoreOrderStatus } from "./payment-state";

export interface PublicOrder {
  id: string;
  productTitle: string;
  productSlug: string | null;
  variantLabel: string;
  amountCents: number;
  status: StoreOrderStatus;
  method: "pix" | "cartao";
  pix: { copiaECola: string; qrBase64: string | null; expiresAt: string | null } | null;
  deliveryMd: string;
  createdAt: string;
  paidAt: string | null;
  isTest: boolean;
}

interface Row {
  id: string;
  product_title: string;
  variant_label: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  pix_copia_e_cola: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  created_at: string;
  paid_at: string | null;
  is_test: boolean;
  store_products: { slug: string; delivery_md: string } | null;
}

export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  if (!isUuid(orderId)) return null;
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .select(
      "id, product_title, variant_label, amount_cents, status, payment_method, pix_copia_e_cola, pix_qr_base64, pix_expires_at, created_at, paid_at, is_test, store_products (slug, delivery_md)"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Row;
  // O QR só interessa enquanto dá para pagar.
  const showPix = row.payment_method === "pix" && row.status === "pendente" && !!row.pix_copia_e_cola;
  return {
    id: row.id,
    productTitle: row.product_title,
    productSlug: row.store_products?.slug ?? null,
    variantLabel: row.variant_label,
    amountCents: row.amount_cents,
    status: row.status as StoreOrderStatus,
    method: row.payment_method === "cartao" ? "cartao" : "pix",
    pix: showPix
      ? {
          copiaECola: row.pix_copia_e_cola as string,
          qrBase64: row.pix_qr_base64 ? `data:image/png;base64,${row.pix_qr_base64}` : null,
          expiresAt: row.pix_expires_at,
        }
      : null,
    deliveryMd: row.store_products?.delivery_md ?? "",
    createdAt: row.created_at,
    paidAt: row.paid_at,
    isTest: row.is_test,
  };
}
