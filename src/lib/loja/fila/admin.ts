// Painel do Pedro para operar a fila durante a live: lê a fila com a Steam de cada um (para o
// convite) e chama as funções do banco, que travam a linha da live. Service role; quem chama
// (as ações do painel) confere antes se é admin.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/mercadopago";
import { getIdentityMap } from "@/lib/queries/identities";
import { steam64To32 } from "@/lib/dota/opendota";
import { getQueueSnapshot } from "./server";
import { queuePositions, type QueueLive, type QueueState } from "./model";

export interface AdminQueueEntry {
  id: string;
  state: QueueState;
  position: number | null;
  matchesUntilTurn: number | null;
  matches: number;
  played: number;
  noShows: number;
  queuedAt: string;
  calledAt: string | null;
  name: string;
  avatarUrl: string | null;
  steamPersona: string | null;
  steamProfileUrl: string | null;
  dotaFriendId: string | null;
  /** Comprou numa live anterior e passou para esta. */
  carriedOver: boolean;
}

export interface AdminFinishedEntry {
  id: string;
  name: string;
  state: "concluido" | "removido";
  matches: number;
  played: number;
  finishedAt: string | null;
}

export interface AdminQueue {
  live: QueueLive | null;
  entries: AdminQueueEntry[];
  finished: AdminFinishedEntry[];
}

const FINISHED_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin === true;
}

async function readFinished(isTest: boolean) {
  const { data, error } = await createServiceClient()
    .from("store_bookings")
    .select("id, seats, matches_played, queue_state, finished_at, store_orders!inner (user_id)")
    .eq("is_test", isTest)
    .in("queue_state", ["concluido", "removido"])
    .gte("updated_at", new Date(Date.now() - FINISHED_WINDOW_MS).toISOString())
    .order("finished_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`ler quem já jogou falhou: ${error.message}`);
  return data ?? [];
}

async function readDetails(ids: string[], userIds: string[]) {
  const supabase = createServiceClient();
  const [bookings, steam] = await Promise.all([
    ids.length ? supabase.from("store_bookings").select("id, no_shows, live_session_id").in("id", ids) : Promise.resolve({ data: [], error: null }),
    userIds.length ? supabase.from("steam_links").select("user_id, steam_id_64, persona").in("user_id", userIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const failed = bookings.error ?? steam.error;
  if (failed) throw new Error(`ler detalhes da fila falhou: ${failed.message}`);
  return {
    booking: new Map((bookings.data ?? []).map((b) => [b.id, b])),
    steam: new Map((steam.data ?? []).map((s) => [s.user_id, s])),
  };
}

export async function getAdminQueue(): Promise<AdminQueue> {
  const isTest = isTestMode();
  const [snapshot, finishedRows] = await Promise.all([getQueueSnapshot(), readFinished(isTest)]);
  const userIds = [...snapshot.entries.map((e) => e.userId), ...finishedRows.map((r) => r.store_orders.user_id)].filter((id): id is string => !!id);
  const [details, identities] = await Promise.all([
    readDetails(snapshot.entries.map((e) => e.id), [...new Set(userIds)]),
    getIdentityMap(await createClient(), userIds),
  ]);
  const positions = queuePositions(snapshot);
  const entries = snapshot.entries.map((e): AdminQueueEntry => {
    const steam = e.userId ? details.steam.get(e.userId) : undefined;
    const who = e.userId ? identities.get(e.userId) : undefined;
    const booking = details.booking.get(e.id);
    return {
      id: e.id,
      state: e.state,
      position: positions.get(e.id)?.position ?? null,
      matchesUntilTurn: positions.get(e.id)?.matchesUntilTurn ?? null,
      matches: e.matches,
      played: e.played,
      noShows: booking?.no_shows ?? 0,
      queuedAt: e.queuedAt,
      calledAt: e.calledAt,
      name: who?.name ?? steam?.persona ?? "Jogador",
      avatarUrl: who?.avatarUrl ?? null,
      steamPersona: steam?.persona ?? null,
      steamProfileUrl: steam ? `https://steamcommunity.com/profiles/${steam.steam_id_64}` : null,
      dotaFriendId: steam ? String(steam64To32(steam.steam_id_64)) : null,
      carriedOver: !!snapshot.live && !!booking && booking.live_session_id !== snapshot.live.id,
    };
  });
  const finished = finishedRows.map((r): AdminFinishedEntry => ({
    id: r.id,
    name: identities.get(r.store_orders.user_id ?? "")?.name ?? "Jogador",
    state: r.queue_state === "removido" ? "removido" : "concluido",
    matches: r.seats,
    played: r.matches_played,
    finishedAt: r.finished_at,
  }));
  return { live: snapshot.live, entries, finished };
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  // Os nomes das funções são fixos neste arquivo; o tipo gerado do banco não aceita nome dinâmico.
  const client = createServiceClient() as unknown as {
    rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: T; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} falhou: ${error.message}`);
  return data;
}

/** Operações da fila. Cada uma devolve o que o banco respondeu (null/false = nada mudou). */
export const queueOps = {
  open: (queueSize: number, seatsPerMatch: number, youtubeVideoId: string | null) =>
    rpc<string | null>("party_fila_abrir_live", {
      p_is_test: isTestMode(), p_party_seats: queueSize, p_seats_per_match: seatsPerMatch, p_youtube_video_id: youtubeVideoId,
    }),
  close: (liveId: string) => rpc<boolean>("party_fila_encerrar_live", { p_live_id: liveId }),
  call: (liveId: string, bookingId: string | null) => rpc<string | null>("party_fila_chamar", { p_live_id: liveId, p_booking_id: bookingId }),
  played: (bookingId: string) => rpc<string | null>("party_fila_jogou", { p_booking_id: bookingId }),
  matchOver: (liveId: string) => rpc<number>("party_fila_partida_terminou", { p_live_id: liveId }),
  noShow: (bookingId: string) => rpc<boolean>("party_fila_ausente", { p_booking_id: bookingId }),
  remove: (bookingId: string) => rpc<boolean>("party_fila_remover", { p_booking_id: bookingId }),
};

/** Muda o tamanho da fila, os lugares por partida e o vídeo da live (sem mexer em quem já pagou). */
export async function resizeLive(liveId: string, queueSize: number, seatsPerMatch: number, youtubeVideoId?: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("store_live_sessions")
    .update({ party_seats: queueSize, seats_per_match: seatsPerMatch, ...(youtubeVideoId ? { youtube_video_id: youtubeVideoId } : {}) })
    .eq("id", liveId)
    .in("status", ["marcada", "ao_vivo"]);
  if (error) throw new Error(`mudar as vagas da live falhou: ${error.message}`);
}

const STALE_ON_AIR_MS = 12 * 60 * 60 * 1000;

/** Rede de segurança do cron: live esquecida aberta por mais de 12 horas é encerrada. */
export async function closeStaleLives(): Promise<{ closed: number }> {
  const { data, error } = await createServiceClient()
    .from("store_live_sessions")
    .select("id")
    .eq("status", "ao_vivo")
    .lt("on_air_at", new Date(Date.now() - STALE_ON_AIR_MS).toISOString());
  if (error) throw new Error(`ler lives abertas falhou: ${error.message}`);
  let closed = 0;
  for (const live of data ?? []) {
    if (await queueOps.close(live.id)) closed += 1;
  }
  return { closed };
}
