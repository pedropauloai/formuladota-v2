// Agenda no servidor: lê disponibilidade, ocupação e lives, e reserva, confirma ou libera horários
// pelas funções do banco (a trava contra horário duplicado mora lá). Service role: as tabelas da
// agenda não têm leitura pública, e daqui só saem horários, nunca dados de outro comprador.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { AGENDA, isSlotAvailable, seatsLeft, type Interval, type WeeklyWindow } from "./agenda";
import type { StoreProduct } from "./catalog";

export interface LiveOption {
  id: string;
  startsAt: string;
  endsAt: string;
  seatsLeft: number;
  notes: string;
}

export interface AgendaData {
  windows: WeeklyWindow[];
  busy: Interval[];
  durationMinutes: number;
}

const ACTIVE = ["reservado", "confirmado"];

export async function getWeeklyWindows(): Promise<WeeklyWindow[]> {
  const { data, error } = await createServiceClient().from("store_availability").select("weekday, start_time, end_time");
  if (error) throw new Error(`ler disponibilidade falhou: ${error.message}`);
  return (data ?? []).map((r) => ({ weekday: r.weekday, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }));
}

/** Tudo que ocupa a agenda daqui para frente: agendamentos vivos, lives marcadas e bloqueios. */
export async function getBusyIntervals(now = new Date(), ignoreBookingId?: string): Promise<Interval[]> {
  const supabase = createServiceClient();
  const from = now.toISOString();
  const [bookings, lives, blocks] = await Promise.all([
    supabase.from("store_bookings").select("id, starts_at, ends_at, status, hold_until").eq("kind", "agenda").eq("is_test", isTestMode()).in("status", ACTIVE).gte("ends_at", from),
    supabase.from("store_live_sessions").select("starts_at, ends_at").eq("status", "marcada").gte("ends_at", from),
    supabase.from("store_blocked_periods").select("starts_at, ends_at").gte("ends_at", from),
  ]);
  const failed = bookings.error ?? lives.error ?? blocks.error;
  if (failed) throw new Error(`ler ocupação da agenda falhou: ${failed.message}`);
  const alive = (bookings.data ?? []).filter(
    (b) => b.id !== ignoreBookingId && (b.status === "confirmado" || !b.hold_until || new Date(b.hold_until) >= now)
  );
  return [...alive, ...(lives.data ?? []), ...(blocks.data ?? [])].map((r) => ({ start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) }));
}

export function sessionDuration(product: StoreProduct, quantity: number): number {
  // Jogar junto marca um bloco por partida; mentoria e acompanhamento, uma sessão por vez.
  return (product.sessionMinutes ?? 60) * (product.maxQuantity > 1 ? quantity : 1);
}

export async function getAgendaData(product: StoreProduct, quantity = 1): Promise<AgendaData> {
  const [windows, busy] = await Promise.all([getWeeklyWindows(), getBusyIntervals()]);
  return { windows, busy, durationMinutes: sessionDuration(product, quantity) };
}

/** Lives marcadas com vaga para o tipo do produto (party ou replay). */
export async function getUpcomingLives(product: StoreProduct, now = new Date()): Promise<LiveOption[]> {
  const supabase = createServiceClient();
  const { data: lives, error } = await supabase
    .from("store_live_sessions")
    .select("id, starts_at, ends_at, party_seats, replay_seats, notes")
    .eq("status", "marcada")
    .gt("starts_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(`ler lives falhou: ${error.message}`);
  if (!lives?.length) return [];
  const { data: bookings } = await supabase
    .from("store_bookings")
    .select("live_session_id, seats, status, hold_until, store_products!inner (live_seat)")
    .in("live_session_id", lives.map((l) => l.id))
    .eq("is_test", isTestMode())
    .eq("store_products.live_seat", product.liveSeat ?? "party");
  return lives
    .map((l) => {
      const capacity = product.liveSeat === "replay" ? l.replay_seats : l.party_seats;
      const taken = (bookings ?? [])
        .filter((b) => b.live_session_id === l.id)
        .map((b) => ({ seats: b.seats, status: b.status, holdUntil: b.hold_until }));
      return { id: l.id, startsAt: l.starts_at, endsAt: l.ends_at, seatsLeft: seatsLeft(capacity, taken, now), notes: l.notes };
    })
    .filter((l) => l.seatsLeft > 0);
}

export type BookingChoice = { kind: "agenda"; start: string } | { kind: "live"; liveId: string };

/** Reserva o horário (ou a vaga na live) do pedido. Devolve a mensagem de erro, ou null quando reservou. */
export async function reserveBooking(
  orderId: string,
  product: StoreProduct,
  choice: BookingChoice,
  quantity: number,
  holdUntil: Date | null
): Promise<string | null> {
  const supabase = createServiceClient();
  const isTest = isTestMode();
  // O tipo gerado do banco marca o parâmetro como texto, mas a função aceita nulo (horário já confirmado).
  const hold = (holdUntil?.toISOString() ?? null) as string;
  if (choice.kind === "live") {
    const { data, error } = await supabase.rpc("store_reservar_live", {
      p_order_id: orderId, p_product_id: product.id, p_live_id: choice.liveId, p_seats: quantity,
      p_hold_until: hold, p_is_test: isTest,
    });
    if (error) throw new Error(`reservar live falhou: ${error.message}`);
    return data ? null : "As vagas dessa live acabaram. Escolha outra.";
  }
  const agenda = await getAgendaData(product, quantity);
  if (!isSlotAvailable({ ...agenda, now: new Date() }, choice.start)) return "Esse horário não está mais livre. Escolha outro.";
  const ends = new Date(Date.parse(choice.start) + agenda.durationMinutes * 60_000).toISOString();
  const { data, error } = await supabase.rpc("store_reservar_agenda", {
    p_order_id: orderId, p_product_id: product.id, p_starts: choice.start, p_ends: ends,
    p_hold_until: hold, p_is_test: isTest,
  });
  if (error) throw new Error(`reservar horário falhou: ${error.message}`);
  return data ? null : "Esse horário acabou de ser reservado. Escolha outro.";
}

/** Pagamento aprovado: a reserva vira horário confirmado. */
export async function confirmOrderBookings(orderId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("store_bookings")
    .update({ status: "confirmado", hold_until: null, updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "reservado");
  if (error) throw new Error(`confirmar horário falhou: ${error.message}`);
}

/** Pedido vencido, cancelado ou reembolsado: devolve os horários futuros à agenda. */
export async function releaseOrderBookings(orderId: string, now = new Date()): Promise<void> {
  const { error } = await createServiceClient()
    .from("store_bookings")
    .update({ status: "cancelado", updated_at: now.toISOString() })
    .eq("order_id", orderId)
    .in("status", ACTIVE)
    .gte("starts_at", now.toISOString());
  if (error) throw new Error(`liberar horário falhou: ${error.message}`);
}

export const HOLD_MS = AGENDA.holdMinutes * 60_000;
