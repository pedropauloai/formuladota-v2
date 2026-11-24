// O que a página do pedido mostra. O UUID do pedido é a chave de acesso, então a leitura devolve
// produto, valor, status, o Pix, os horários e a entrega: nada de e-mail, WhatsApp nem respostas
// do formulário.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isUuid } from "./refs";
import { getOrderBookings, type OrderBooking } from "./order-bookings";
import type { BookingMode } from "./catalog";
import type { StoreOrderStatus } from "./payment-state";

export interface PublicOrder {
  id: string;
  productTitle: string;
  productSlug: string | null;
  variantLabel: string;
  amountCents: number;
  quantity: number;
  status: StoreOrderStatus;
  method: "pix" | "cartao";
  pix: { copiaECola: string; qrBase64: string | null; expiresAt: string | null } | null;
  /** E-mail do comprador só enquanto o cartão espera pagamento: o formulário vem preenchido. */
  cardEmail: string | null;
  deliveryMd: string;
  createdAt: string;
  paidAt: string | null;
  isTest: boolean;
  bookingMode: BookingMode;
  /** Sessões que o pedido dá direito a marcar (o acompanhamento tem 4). */
  sessionsPerOrder: number;
  /** Duração de uma sessão marcada depois da compra (por partida, no jogar junto). */
  sessionMinutes: number;
  bookings: OrderBooking[];
  delivery: { url: string | null; note: string | null } | null;
}

interface Row {
  id: string;
  product_title: string;
  variant_label: string;
  amount_cents: number;
  quantity: number;
  status: string;
  payment_method: string;
  buyer_email: string;
  pix_copia_e_cola: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  created_at: string;
  paid_at: string | null;
  is_test: boolean;
  delivery_url: string | null;
  delivery_note: string | null;
  store_products: { slug: string; delivery_md: string; booking_mode: string; sessions_per_order: number; session_minutes: number | null; max_quantity: number } | null;
}

const SELECT =
  "id, product_title, variant_label, amount_cents, quantity, status, payment_method, buyer_email, pix_copia_e_cola, pix_qr_base64, " +
  "pix_expires_at, created_at, paid_at, is_test, delivery_url, delivery_note, " +
  "store_products (slug, delivery_md, booking_mode, sessions_per_order, session_minutes, max_quantity)";

export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  if (!isUuid(orderId)) return null;
  const [{ data, error }, bookings] = await Promise.all([
    createServiceClient().from("store_orders").select(SELECT).eq("id", orderId).maybeSingle(),
    getOrderBookings(orderId).catch(() => []),
  ]);
  if (error || !data) return null;
  const row = data as unknown as Row;
  // O QR só interessa enquanto dá para pagar.
  const showPix = row.payment_method === "pix" && row.status === "pendente" && !!row.pix_copia_e_cola;
  const mode = row.store_products?.booking_mode;
  return {
    id: row.id,
    productTitle: row.product_title,
    productSlug: row.store_products?.slug ?? null,
    variantLabel: row.variant_label,
    amountCents: row.amount_cents,
    quantity: row.quantity,
    status: row.status as StoreOrderStatus,
    method: row.payment_method === "cartao" ? "cartao" : "pix",
    pix: showPix
      ? {
          copiaECola: row.pix_copia_e_cola as string,
          qrBase64: row.pix_qr_base64 ? `data:image/png;base64,${row.pix_qr_base64}` : null,
          expiresAt: row.pix_expires_at,
        }
      : null,
    cardEmail: row.payment_method === "cartao" && row.status === "pendente" ? row.buyer_email : null,
    deliveryMd: row.store_products?.delivery_md ?? "",
    createdAt: row.created_at,
    paidAt: row.paid_at,
    isTest: row.is_test,
    bookingMode: mode === "agenda" || mode === "live" ? mode : "nenhum",
    sessionsPerOrder: row.store_products?.sessions_per_order ?? 1,
    sessionMinutes: (row.store_products?.session_minutes ?? 60) * ((row.store_products?.max_quantity ?? 1) > 1 ? row.quantity : 1),
    bookings,
    delivery: row.delivery_url || row.delivery_note ? { url: row.delivery_url, note: row.delivery_note } : null,
  };
}
