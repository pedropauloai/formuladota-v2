// Leitura da fila da party no servidor. Service role: as reservas não têm leitura pública, e daqui
// só saem nome público, números e a vez de quem está logado. Spec: docs/loja/fila-da-party.md.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/mercadopago";
import { getIdentityMap } from "@/lib/queries/identities";
import { reconcileStoreOrder } from "@/lib/loja/order-payments";
import { steam64To32 } from "@/lib/dota/opendota";
import {
  orderEntries,
  queuePositions,
  toPublicQueue,
  type MyEntryState,
  type MyPendingOrder,
  type MyQueueEntry,
  type PublicQueue,
  type QueueEntry,
  type QueueLive,
  type QueueSnapshot,
  type QueueView,
  toQueueExit,
} from "./model";

/** Produto da vaga na party (catálogo da versão B). */
export const PARTY_PRODUCT_SLUG = "vaga-na-party";

const ACTIVE_STATES = ["aguardando", "na_party"];
/** Quem jogou ou saiu continua vendo o próprio resultado na página por algumas horas. */
const MINE_WINDOW_MS = 12 * 60 * 60 * 1000;
/** O Pix da fila vence em 30 minutos; 35 cobre o relógio do Mercado Pago. */
const PENDING_WINDOW_MS = 35 * 60 * 1000;

interface LiveRow {
  id: string;
  status: string;
  starts_at: string;
  on_air_at: string | null;
  party_seats: number;
  seats_per_match: number;
  youtube_video_id: string | null;
  match_count: number;
}

async function readLive(isTest: boolean): Promise<QueueLive | null> {
  const supabase = createServiceClient();
  const { data: liveId, error } = await supabase.rpc("party_fila_live_atual", { p_is_test: isTest });
  if (error) throw new Error(`ler a live da fila falhou: ${error.message}`);
  if (!liveId) return null;
  const [live, occupied] = await Promise.all([
    supabase
      .from("store_live_sessions")
      .select("id, status, starts_at, on_air_at, party_seats, seats_per_match, youtube_video_id, match_count")
      .eq("id", liveId)
      .maybeSingle<LiveRow>(),
    supabase.rpc("party_fila_ocupacao", { p_live_id: liveId }),
  ]);
  const failed = live.error ?? occupied.error;
  if (failed) throw new Error(`ler a live da fila falhou: ${failed.message}`);
  if (!live.data) return null;
  return {
    id: live.data.id,
    status: live.data.status === "ao_vivo" ? "ao_vivo" : "marcada",
    startsAt: live.data.starts_at,
    onAirAt: live.data.on_air_at,
    queueSize: live.data.party_seats,
    seatsPerMatch: live.data.seats_per_match,
    occupied: occupied.data ?? 0,
    youtubeVideoId: live.data.youtube_video_id,
    matchesDone: live.data.match_count,
  };
}

async function readEntries(isTest: boolean, live: QueueLive | null): Promise<QueueEntry[]> {
  const { data, error } = await createServiceClient()
    .from("store_bookings")
    .select("id, seats, matches_played, queue_state, queued_at, called_at, store_live_sessions!inner (starts_at), store_orders!inner (user_id)")
    .eq("is_test", isTest)
    .in("queue_state", ACTIVE_STATES)
    .order("queued_at", { ascending: true })
    .limit(300);
  if (error) throw new Error(`ler a fila falhou: ${error.message}`);
  // A fila da live atual inclui quem não jogou nas anteriores; a reserva de uma live futura espera a vez dela.
  const cutoff = live ? Date.parse(live.startsAt) : Date.now();
  return (data ?? [])
    .filter((row) => Date.parse(row.store_live_sessions.starts_at) <= cutoff)
    .map((row) => ({
      id: row.id,
      userId: row.store_orders.user_id,
      state: row.queue_state === "na_party" ? "na_party" : "aguardando",
      matches: row.seats,
      played: row.matches_played,
      queuedAt: row.queued_at ?? new Date(0).toISOString(),
      calledAt: row.called_at,
    }));
}

/** Live da fila e as entradas em ordem (party primeiro). */
export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const isTest = isTestMode();
  const live = await readLive(isTest);
  return { live, entries: orderEntries(await readEntries(isTest, live)) };
}

/** O JSON público da fila: o que a página e os overlays mostram. */
export async function getPublicQueue(snapshot?: QueueSnapshot): Promise<PublicQueue> {
  const current = snapshot ?? (await getQueueSnapshot());
  const ids = current.entries.map((e) => e.userId).filter((id): id is string => !!id);
  const identities = await getIdentityMap(await createClient(), ids);
  return toPublicQueue(current, (id) => (id ? identities.get(id) : undefined));
}

export interface ViewerSteam {
  steamId64: string;
  persona: string | null;
  /** ID de amigo do Dota: é por ele que o Pedro convida. */
  dotaId: string;
}

/** A Steam vinculada de quem está logado; a vaga exige, porque o convite sai por ela. */
export async function getViewerSteam(userId: string): Promise<ViewerSteam | null> {
  const { data, error } = await createServiceClient().from("steam_links").select("steam_id_64, persona").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`ler a Steam vinculada falhou: ${error.message}`);
  if (!data || !/^\d{17}$/.test(data.steam_id_64)) return null;
  return { steamId64: data.steam_id_64, persona: data.persona, dotaId: String(steam64To32(data.steam_id_64)) };
}

/** Há live no ar? Para o sinal da aba Loja e o botão da barra inferior. */
export const isLiveOnAir = cache(async (): Promise<boolean> => {
  const { data, error } = await createServiceClient()
    .from("store_live_sessions")
    .select("id")
    .eq("status", "ao_vivo")
    .eq("is_test", isTestMode())
    .limit(1);
  if (error) {
    console.error("[fila] ler live no ar falhou:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
});

export async function readPendingOrder(userId: string, isTest: boolean): Promise<MyPendingOrder | null> {
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .select("id, payment_method, quantity, amount_cents, pix_copia_e_cola, pix_qr_base64, pix_expires_at, store_products!inner (slug)")
    .eq("user_id", userId)
    .eq("is_test", isTest)
    .eq("status", "pendente")
    .eq("store_products.slug", PARTY_PRODUCT_SLUG)
    .gte("created_at", new Date(Date.now() - PENDING_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`ler pedido pendente falhou: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    method: data.payment_method === "cartao" ? "cartao" : "pix",
    quantity: data.quantity,
    amountCents: data.amount_cents,
    pix: data.pix_copia_e_cola
      ? { copiaECola: data.pix_copia_e_cola, qrDataUrl: data.pix_qr_base64 ? `data:image/png;base64,${data.pix_qr_base64}` : null, expiresAt: data.pix_expires_at }
      : null,
  };
}

async function readMyBookings(userId: string, isTest: boolean, snapshot: QueueSnapshot): Promise<MyQueueEntry[]> {
  const { data, error } = await createServiceClient()
    .from("store_bookings")
    .select("id, seats, matches_played, queue_state, queue_exit, called_at, no_shows, queued_at, store_orders!inner (user_id)")
    .eq("store_orders.user_id", userId)
    .eq("is_test", isTest)
    // Quem ainda espera aparece sempre (inclusive quem passou de uma live para a outra); quem já
    // saiu ou jogou, só nas últimas 12 horas.
    .or(`queue_state.in.(aguardando,na_party),and(queue_state.not.is.null,updated_at.gte."${new Date(Date.now() - MINE_WINDOW_MS).toISOString()}")`)
    .order("queued_at", { ascending: true });
  if (error) throw new Error(`ler a minha vez falhou: ${error.message}`);
  const positions = queuePositions(snapshot);
  return (data ?? []).map((row) => {
    const pos = positions.get(row.id);
    return {
      id: row.id,
      state: (row.queue_state ?? "removido") as MyEntryState,
      position: pos?.position ?? null,
      matchesUntilTurn: pos?.matchesUntilTurn ?? null,
      matches: row.seats,
      played: row.matches_played,
      noShows: row.no_shows,
      calledAt: row.called_at,
      exit: toQueueExit(row.queue_exit),
    };
  });
}

/**
 * Fila pública e, com login, a vez da pessoa. Concilia antes o Pix pendente com o Mercado Pago (no
 * máximo uma consulta a cada 3 s por pedido): a página que espera o pagamento já mostra a posição.
 */
export async function getQueueState(userId: string | null): Promise<QueueView> {
  const isTest = isTestMode();
  let pending = userId ? await readPendingOrder(userId, isTest) : null;
  if (userId && pending && (await reconcileStoreOrder(pending.id)) !== "nada") pending = await readPendingOrder(userId, isTest);
  const snapshot = await getQueueSnapshot();
  const [queue, entries] = await Promise.all([getPublicQueue(snapshot), userId ? readMyBookings(userId, isTest, snapshot) : null]);
  return { queue, mine: userId && entries ? { entries, pending } : null };
}
