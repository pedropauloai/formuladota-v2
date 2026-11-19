// Agendamentos de um pedido depois da compra: marcar a próxima sessão (acompanhamento, ou horário
// perdido quando o pagamento chegou tarde) e remarcar com 24 horas de antecedência. O UUID do pedido
// é a chave de acesso, como na página do pedido.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { getActiveProduct } from "./catalog";
import { AGENDA, bookingLine, canReschedule, isSlotAvailable } from "./agenda";
import { getBusyIntervals, getWeeklyWindows, sessionDuration } from "./agenda-server";
import { sendAgendaEvent } from "./notify";
import { isUuid } from "./refs";

export interface OrderBooking {
  id: string;
  kind: "agenda" | "live";
  startsAt: string;
  endsAt: string;
  status: string;
  seats: number;
  /** Vaga comprada fora da live, na fila aberta: não tem data, joga na próxima live. */
  queue: boolean;
}

export type AgendaActionResult = { ok: true } | { ok: false; error: string };

export async function getOrderBookings(orderId: string): Promise<OrderBooking[]> {
  const { data, error } = await createServiceClient()
    .from("store_bookings")
    .select("id, kind, starts_at, ends_at, status, seats, store_live_sessions (status)")
    .eq("order_id", orderId)
    .neq("status", "cancelado")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`ler horários do pedido falhou: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id,
    kind: b.kind === "live" ? "live" : "agenda",
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    seats: b.seats,
    queue: b.store_live_sessions?.status === "fila",
  }));
}

async function loadPaidOrder(orderId: string) {
  if (!isUuid(orderId)) return null;
  const { data } = await createServiceClient()
    .from("store_orders")
    .select("id, status, quantity, buyer_name, product_title, is_test, store_products (slug)")
    .eq("id", orderId)
    .maybeSingle();
  if (!data || data.status !== "pago" || data.is_test !== isTestMode()) return null;
  const slug = (data.store_products as { slug: string } | null)?.slug;
  const product = slug ? await getActiveProduct(slug) : null;
  return product?.bookingMode === "agenda" ? { order: data, product } : null;
}

/** Marca a próxima sessão do pedido pago, enquanto faltar sessão. */
export async function scheduleNextSession(orderId: string, startIso: string): Promise<AgendaActionResult> {
  const loaded = await loadPaidOrder(orderId);
  if (!loaded) return { ok: false, error: "Este pedido não tem sessão para marcar." };
  const { order, product } = loaded;
  const booked = (await getOrderBookings(orderId)).filter((b) => b.kind === "agenda").length;
  if (booked >= product.sessionsPerOrder) return { ok: false, error: "Todas as sessões deste pedido já estão marcadas." };
  const start = new Date(startIso).toISOString();
  const duration = sessionDuration(product, order.quantity);
  const [windows, busy] = await Promise.all([getWeeklyWindows(), getBusyIntervals()]);
  if (!isSlotAvailable({ windows, busy, now: new Date(), durationMinutes: duration }, start)) {
    return { ok: false, error: "Esse horário não está mais livre. Escolha outro." };
  }
  const end = new Date(Date.parse(start) + duration * 60_000).toISOString();
  const { data, error } = await createServiceClient().rpc("store_reservar_agenda", {
    p_order_id: orderId, p_product_id: product.id, p_starts: start, p_ends: end,
    // O tipo gerado marca o parâmetro como texto, mas nulo significa "já confirmado".
    p_hold_until: null as unknown as string, p_is_test: isTestMode(),
  });
  if (error) throw new Error(`marcar sessão falhou: ${error.message}`);
  if (!data) return { ok: false, error: "Esse horário acabou de ser reservado. Escolha outro." };
  await sendAgendaEvent(`${order.buyer_name} marcou ${order.product_title} (sessão ${booked + 1} de ${product.sessionsPerOrder}): ${bookingLine(start, end)}.`, orderId, order.is_test);
  return { ok: true };
}

/** Troca o horário confirmado por outro, com pelo menos 24 horas de antecedência. */
export async function rescheduleBooking(orderId: string, bookingId: string, startIso: string): Promise<AgendaActionResult> {
  const loaded = await loadPaidOrder(orderId);
  if (!loaded || !isUuid(bookingId)) return { ok: false, error: "Este horário não pode ser remarcado." };
  const { order, product } = loaded;
  const current = (await getOrderBookings(orderId)).find((b) => b.id === bookingId && b.kind === "agenda");
  if (!current || !canReschedule(current.startsAt, current.status, new Date())) {
    return { ok: false, error: `Só dá para remarcar até ${AGENDA.rescheduleMinHours} horas antes do horário.` };
  }
  const start = new Date(startIso).toISOString();
  const duration = Math.round((Date.parse(current.endsAt) - Date.parse(current.startsAt)) / 60_000);
  const [windows, busy] = await Promise.all([getWeeklyWindows(), getBusyIntervals(new Date(), bookingId)]);
  if (!isSlotAvailable({ windows, busy, now: new Date(), durationMinutes: duration }, start)) {
    return { ok: false, error: "Esse horário não está mais livre. Escolha outro." };
  }
  const end = new Date(Date.parse(start) + duration * 60_000).toISOString();
  const { data, error } = await createServiceClient().rpc("store_remarcar_agenda", { p_booking_id: bookingId, p_starts: start, p_ends: end });
  if (error) throw new Error(`remarcar falhou: ${error.message}`);
  if (!data) return { ok: false, error: "Esse horário acabou de ser reservado. Escolha outro." };
  await sendAgendaEvent(
    `${order.buyer_name} remarcou ${product.title}: de ${bookingLine(current.startsAt, current.endsAt)} para ${bookingLine(start, end)}.`,
    orderId,
    order.is_test
  );
  return { ok: true };
}
