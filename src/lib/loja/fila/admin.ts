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
import { queuePositions, toQueueExit, type QueueExit, type QueueLive, type QueueState } from "./model";

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
  /** Comprou fora da live, na fila aberta. */
  boughtOffline: boolean;
  /** Entrou pelo Battlepass, sem pagar a vaga. */
  battlepass: boolean;
  /** O Pedro pôs na fila pelo painel, sem pagamento. */
  courtesy: boolean;
  /** Vaga do dia (ou Battlepass): joga a live inteira no revezamento, e played são as partidas de hoje. */
  dayPass: boolean;
  /** Última vez na party do PPA: a base do revezamento (null = nunca jogou). */
  lastTurnAt: string | null;
}

export interface AdminFinishedEntry {
  id: string;
  name: string;
  state: "concluido" | "removido";
  exit: QueueExit | null;
  matches: number;
  played: number;
  finishedAt: string | null;
  /** Quem saiu sozinho recebe de volta o que não jogou (a vaga do dia, se não jogou nenhuma); o Pedro devolve no Mercado Pago. */
  refundCents: number;
  dayPass: boolean;
}

export interface AdminQueue {
  live: QueueLive | null;
  entries: AdminQueueEntry[];
  finished: AdminFinishedEntry[];
}

const FINISHED_WINDOW_MS = 12 * 60 * 60 * 1000;

/** ID do Dota que o pedido guardou (compra sem Steam vinculada, anterior à fila). */
function orderDotaId(details: unknown): string | null {
  const value = details && typeof details === "object" ? (details as Record<string, unknown>).dota_id : null;
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

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
    .select("id, seats, matches_played, modo, queue_state, queue_exit, finished_at, user_id, source, store_orders (amount_cents, quantity)")
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
    ids.length
      ? supabase
          .from("store_bookings")
          .select("id, no_shows, live_session_id, store_orders (buyer_name, details), store_live_sessions (status)")
          .in("id", ids)
      : Promise.resolve({ data: [], error: null }),
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
  const userIds = [...snapshot.entries.map((e) => e.userId), ...finishedRows.map((r) => r.user_id)].filter((id): id is string => !!id);
  const [details, identities] = await Promise.all([
    readDetails(snapshot.entries.map((e) => e.id), [...new Set(userIds)]),
    getIdentityMap(await createClient(), userIds),
  ]);
  const positions = queuePositions(snapshot);
  const entries = snapshot.entries.map((e): AdminQueueEntry => {
    const steam = e.userId ? details.steam.get(e.userId) : undefined;
    const who = e.userId ? identities.get(e.userId) : undefined;
    const booking = details.booking.get(e.id);
    const boughtOffline = booking?.store_live_sessions?.status === "fila";
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
      name: who?.name ?? steam?.persona ?? booking?.store_orders?.buyer_name ?? "Jogador",
      avatarUrl: who?.avatarUrl ?? null,
      steamPersona: steam?.persona ?? null,
      steamProfileUrl: steam ? `https://steamcommunity.com/profiles/${steam.steam_id_64}` : null,
      dotaFriendId: steam ? String(steam64To32(steam.steam_id_64)) : orderDotaId(booking?.store_orders?.details),
      carriedOver: !!snapshot.live && !!booking && !boughtOffline && booking.live_session_id !== snapshot.live.id,
      boughtOffline,
      battlepass: e.source === "battlepass",
      courtesy: e.source === "cortesia",
      dayPass: !!e.dayPass,
      lastTurnAt: e.lastTurnAt ?? null,
    };
  });
  const finished = finishedRows.map((r): AdminFinishedEntry => {
    const exit = toQueueExit(r.queue_exit);
    // Entrada do Battlepass e cortesia não têm pedido nem nada a devolver.
    const order = r.source === "pedido" ? r.store_orders : null;
    const perMatch = order ? Math.round(order.amount_cents / Math.max(1, order.quantity)) : 0;
    return {
      id: r.id,
      name: identities.get(r.user_id ?? "")?.name ?? "Jogador",
      state: r.queue_state === "removido" ? "removido" : "concluido",
      exit,
      matches: r.seats,
      played: r.matches_played,
      finishedAt: r.finished_at,
      refundCents: exit === "saiu" ? perMatch * Math.max(0, r.seats - r.matches_played) : 0,
      dayPass: r.modo === "dia",
    };
  });
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

/** Um tamanho só: o que o Pedro põe na live vale também para a fila aberta, fora dela. */
async function mirrorToOpenQueue(isTest: boolean, queueSize: number, seatsPerMatch: number): Promise<void> {
  const { error } = await createServiceClient()
    .from("store_live_sessions")
    .update({ party_seats: queueSize, seats_per_match: seatsPerMatch })
    .eq("status", "fila")
    .eq("is_test", isTest);
  if (error) throw new Error(`mudar o tamanho da fila aberta falhou: ${error.message}`);
}

/** Operações da fila. Cada uma devolve o que o banco respondeu (null/false = nada mudou). */
export const queueOps = {
  open: async (queueSize: number, seatsPerMatch: number, youtubeVideoId: string | null) => {
    const liveId = await rpc<string | null>("party_fila_abrir_live", {
      p_is_test: isTestMode(), p_party_seats: queueSize, p_seats_per_match: seatsPerMatch, p_youtube_video_id: youtubeVideoId,
    });
    if (liveId) await mirrorToOpenQueue(isTestMode(), queueSize, seatsPerMatch);
    return liveId;
  },
  close: (liveId: string) => rpc<boolean>("party_fila_encerrar_live", { p_live_id: liveId }),
  call: (liveId: string, bookingId: string | null) => rpc<string | null>("party_fila_chamar", { p_live_id: liveId, p_booking_id: bookingId }),
  played: (bookingId: string) => rpc<string | null>("party_fila_jogou", { p_booking_id: bookingId }),
  /**
   * -1 = essa partida já tinha sido marcada (segundo toque ou repetição da requisição). Com a partida
   * (ID, hora em que acabou e quem a OpenDota mostrou no time do PPA), grava a participação de cada um.
   */
  matchOver: (liveId: string, expectedCount: number, match?: { matchId: string; playedAt: string; confirmedUserIds: string[] }) =>
    rpc<number>("party_fila_partida_terminou", {
      p_live_id: liveId,
      p_expected_count: expectedCount,
      p_dota_match_id: match ? Number(match.matchId) : null,
      p_played_at: match?.playedAt ?? null,
      p_confirmed: match?.confirmedUserIds ?? null,
    }),
  /** Tira da party de volta para a fila, no mesmo lugar, sem gastar a vez: joga quem está presente. */
  leaveParty: (bookingId: string) => rpc<boolean>("party_fila_tirar_da_party", { p_booking_id: bookingId }),
  remove: (bookingId: string) => rpc<boolean>("party_fila_remover", { p_booking_id: bookingId }),
  /** Cortesia: põe na fila sem pagamento, ou soma partidas à cortesia que a pessoa já tem. */
  addCourtesy: (userId: string, matches: number) =>
    rpc<string | null>("party_fila_adicionar_cortesia", { p_user_id: userId, p_matches: matches, p_is_test: isTestMode() }),
  /** Soma ou tira partidas de quem está na fila (mínimo 1 por jogar, máximo 20); devolve o total novo. */
  adjustMatches: (bookingId: string, delta: number) => rpc<number | null>("party_fila_ajustar_partidas", { p_booking_id: bookingId, p_delta: delta }),
  /** A própria pessoa sai (o banco confere que a vaga é dela e que ainda espera). */
  leave: (bookingId: string, userId: string) => rpc<boolean>("party_fila_sair", { p_booking_id: bookingId, p_user_id: userId }),
};

/**
 * Muda o tamanho da fila, os lugares por partida e o vídeo da live (sem mexer em quem já pagou).
 * Vale para a fila aberta também, que não guarda vídeo: o vídeo é de uma transmissão.
 */
export async function resizeLive(liveId: string, queueSize: number, seatsPerMatch: number, youtubeVideoId?: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: live, error: readError } = await supabase.from("store_live_sessions").select("status, is_test").eq("id", liveId).maybeSingle();
  if (readError) throw new Error(`ler a live falhou: ${readError.message}`);
  if (!live) return;
  const video = youtubeVideoId && live.status !== "fila" ? { youtube_video_id: youtubeVideoId } : {};
  const { error } = await supabase
    .from("store_live_sessions")
    .update({ party_seats: queueSize, seats_per_match: seatsPerMatch, ...video })
    .eq("id", liveId)
    .in("status", ["marcada", "ao_vivo", "fila"]);
  if (error) throw new Error(`mudar as vagas da live falhou: ${error.message}`);
  if (live.status === "ao_vivo") await mirrorToOpenQueue(live.is_test, queueSize, seatsPerMatch);
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
