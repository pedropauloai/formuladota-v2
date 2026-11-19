// Regra pura da fila da party: ordem, partidas até a vez e o que o JSON público mostra.
// Sem banco: server.ts lê as reservas e entrega aqui. Spec: docs/loja/fila-da-party.md.

export type QueueState = "aguardando" | "na_party";

export interface QueueEntry {
  /** ID da reserva (store_bookings): vai para o JSON público e não identifica ninguém. */
  id: string;
  /** Dono do pedido: só o servidor usa, para o nome público e para achar a vez de quem está logado. */
  userId: string | null;
  state: QueueState;
  /** Partidas compradas. */
  matches: number;
  played: number;
  queuedAt: string;
  calledAt: string | null;
}

export interface QueueLive {
  id: string;
  status: "ao_vivo" | "marcada";
  startsAt: string;
  onAirAt: string | null;
  /** Tamanho máximo da fila, em partidas (store_live_sessions.party_seats). */
  queueSize: number;
  /** Lugares na party por partida: o Pedro e até 4. */
  seatsPerMatch: number;
  /** Partidas que já ocupam a fila (party_fila_ocupacao no banco). */
  occupied: number;
  youtubeVideoId: string | null;
}

export interface QueueSnapshot {
  live: QueueLive | null;
  /** Em ordem: a party primeiro, depois a fila. */
  entries: QueueEntry[];
}

export interface PublicEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  matches: number;
  played: number;
}

export interface PublicQueuedEntry extends PublicEntry {
  position: number;
  /** Partidas até entrar na party; 0 = entra quando o Pedro chamar o próximo. */
  matchesUntilTurn: number;
}

export interface PublicLive {
  status: "ao_vivo" | "marcada";
  startsAt: string;
  onAirAt: string | null;
  seatsOpen: number;
  queueSize: number;
  seatsPerMatch: number;
  youtubeVideoId: string | null;
}

/** O que a página e os overlays leem: nome público e números, nada que identifique a pessoa além do nome. */
export interface PublicQueue {
  live: PublicLive | null;
  party: PublicEntry[];
  queue: PublicQueuedEntry[];
  updatedAt: string;
}

export type MyEntryState = "aguardando" | "na_party" | "concluido" | "removido";

export interface MyQueueEntry {
  id: string;
  state: MyEntryState;
  position: number | null;
  matchesUntilTurn: number | null;
  matches: number;
  played: number;
  noShows: number;
  calledAt: string | null;
}

export interface MyPendingOrder {
  id: string;
  method: "pix" | "cartao";
  quantity: number;
  amountCents: number;
  pix: { copiaECola: string; qrDataUrl: string | null; expiresAt: string | null } | null;
}

export interface MyQueue {
  entries: MyQueueEntry[];
  pending: MyPendingOrder | null;
}

/** O que a página da fila recebe a cada consulta: a fila pública e, com login, a vez da pessoa. */
export interface QueueView {
  queue: PublicQueue;
  mine: MyQueue | null;
}

export interface PublicIdentity {
  name: string;
  avatarUrl: string | null;
}

export const remainingMatches = (entry: Pick<QueueEntry, "matches" | "played">): number =>
  Math.max(0, entry.matches - entry.played);

const time = (iso: string | null): number => (iso ? Date.parse(iso) : 0);

/** A party primeiro (na ordem em que o Pedro chamou), depois a fila na ordem do pagamento. */
export function orderEntries(entries: readonly QueueEntry[]): QueueEntry[] {
  const party = entries
    .filter((e) => e.state === "na_party")
    .sort((a, b) => time(a.calledAt) - time(b.calledAt) || time(a.queuedAt) - time(b.queuedAt));
  const waiting = entries
    .filter((e) => e.state === "aguardando")
    .sort((a, b) => time(a.queuedAt) - time(b.queuedAt) || a.id.localeCompare(b.id));
  return [...party, ...waiting];
}

/**
 * Partidas até cada pessoa da fila entrar na party, simulando partida a partida: quem está na
 * party joga, quem completa as partidas compradas sai, e os lugares livres vão para a fila na ordem.
 */
export function matchesUntilTurn(partyRemaining: readonly number[], waitingMatches: readonly number[], seatsPerMatch: number): number[] {
  const seats = Math.max(1, Math.floor(seatsPerMatch));
  let party = partyRemaining.filter((n) => n > 0);
  const result: number[] = [];
  let next = 0;
  let played = 0;
  const fill = () => {
    while (party.length < seats && next < waitingMatches.length) {
      result.push(played);
      party.push(Math.max(1, waitingMatches[next] ?? 1));
      next += 1;
    }
  };
  fill();
  while (next < waitingMatches.length) {
    party = party.map((n) => n - 1).filter((n) => n > 0);
    played += 1;
    fill();
  }
  return result;
}

/** Vagas que ainda cabem na fila da live (cada partida jogada devolve uma). */
export function seatsOpen(live: Pick<QueueLive, "queueSize" | "occupied"> | null): number {
  return live ? Math.max(0, live.queueSize - live.occupied) : 0;
}

/** Posição (1 = o próximo a ser chamado) e partidas até a vez de cada um que espera. */
export function queuePositions(snapshot: QueueSnapshot): Map<string, { position: number; matchesUntilTurn: number }> {
  const party = snapshot.entries.filter((e) => e.state === "na_party");
  const waiting = snapshot.entries.filter((e) => e.state === "aguardando");
  const turns = matchesUntilTurn(party.map(remainingMatches), waiting.map(remainingMatches), snapshot.live?.seatsPerMatch ?? 4);
  return new Map(waiting.map((e, i) => [e.id, { position: i + 1, matchesUntilTurn: turns[i] ?? 0 }]));
}

const FALLBACK_NAME = "Jogador";

/** JSON público da fila: o nome sai da identidade pública, e o id de usuário nunca sai do servidor. */
export function toPublicQueue(snapshot: QueueSnapshot, identity: (userId: string | null) => PublicIdentity | undefined, now = new Date()): PublicQueue {
  const positions = queuePositions(snapshot);
  const publicEntry = (e: QueueEntry): PublicEntry => {
    const who = identity(e.userId);
    return { id: e.id, name: who?.name || FALLBACK_NAME, avatarUrl: who?.avatarUrl ?? null, matches: e.matches, played: e.played };
  };
  const live = snapshot.live;
  return {
    live: live
      ? {
          status: live.status,
          startsAt: live.startsAt,
          onAirAt: live.onAirAt,
          seatsOpen: seatsOpen(live),
          queueSize: live.queueSize,
          seatsPerMatch: live.seatsPerMatch,
          youtubeVideoId: live.youtubeVideoId,
        }
      : null,
    party: snapshot.entries.filter((e) => e.state === "na_party").map(publicEntry),
    queue: snapshot.entries
      .filter((e) => e.state === "aguardando")
      .map((e) => ({ ...publicEntry(e), ...(positions.get(e.id) ?? { position: 0, matchesUntilTurn: 0 }) })),
    updatedAt: now.toISOString(),
  };
}
