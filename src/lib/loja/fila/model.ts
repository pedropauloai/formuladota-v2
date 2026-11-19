// Regra pura da fila da party: ordem, partidas até a vez e o que o JSON público mostra.
// Sem banco: server.ts lê as reservas e entrega aqui. Spec: docs/loja/fila-da-party.md.

export type QueueState = "aguardando" | "na_party";

/** Vaga paga (pedido da loja), entrada do Battlepass (migration 192) ou cortesia do Pedro pelo painel (migration 178), as duas sem pagamento. */
export type QueueSource = "pedido" | "battlepass" | "cortesia";

export function toQueueSource(value: string | null): QueueSource {
  return value === "battlepass" || value === "cortesia" ? value : "pedido";
}

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
  /** Última vez na party do PPA (jogou ou não apareceu): o revezamento ordena por ela; null = nunca jogou. */
  lastTurnAt?: string | null;
  source?: QueueSource;
}

/** No ar, a próxima marcada, ou a fila aberta: sem live, a vaga vende para a próxima (migration 177). */
export type LiveStatus = "ao_vivo" | "marcada" | "fila";

export interface QueueLive {
  id: string;
  status: LiveStatus;
  /** Na fila aberta, uma data fixa no passado (a fila dela inclui todas as lives). */
  startsAt: string;
  onAirAt: string | null;
  /** Tamanho máximo da fila, em partidas (store_live_sessions.party_seats). */
  queueSize: number;
  /** Lugares na party por partida: o Pedro e até 4. */
  seatsPerMatch: number;
  /** Partidas que já ocupam a fila (party_fila_ocupacao no banco). */
  occupied: number;
  youtubeVideoId: string | null;
  /** Partidas já terminadas nesta live: o painel manda esse número em "Partida terminou". */
  matchesDone: number;
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
  /** Tem o Battlepass ativo: o selo ao lado do nome. */
  battlepass: boolean;
}

export interface PublicQueuedEntry extends PublicEntry {
  position: number;
  /** Partidas até entrar na party; 0 = entra quando o Pedro chamar o próximo. */
  matchesUntilTurn: number;
}

export interface PublicLive {
  status: LiveStatus;
  /** Null na fila aberta: não há live marcada. */
  startsAt: string | null;
  onAirAt: string | null;
  seatsOpen: number;
  queueSize: number;
  seatsPerMatch: number;
  youtubeVideoId: string | null;
  matchesDone: number;
}

/** O que a página e os overlays leem: nome público e números, nada que identifique a pessoa além do nome. */
export interface PublicQueue {
  live: PublicLive | null;
  party: PublicEntry[];
  queue: PublicQueuedEntry[];
  updatedAt: string;
}

export type MyEntryState = "aguardando" | "na_party" | "concluido" | "removido";

/** Por que a vaga saiu da fila: a pessoa saiu, o Pedro tirou, ou o pedido foi cancelado ou reembolsado. */
export type QueueExit = "saiu" | "tirado" | "cancelado";

export function toQueueExit(value: string | null): QueueExit | null {
  return value === "saiu" || value === "tirado" || value === "cancelado" ? value : null;
}

export interface MyQueueEntry {
  id: string;
  state: MyEntryState;
  position: number | null;
  matchesUntilTurn: number | null;
  matches: number;
  played: number;
  noShows: number;
  calledAt: string | null;
  exit: QueueExit | null;
  source?: QueueSource;
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
  /** Quem olha tem o Battlepass ativo: entra na fila sem pagar. */
  battlepass?: boolean;
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

/** Quem nunca esteve na party do PPA vem antes de todos no revezamento. */
const turnTime = (entry: QueueEntry): number => (entry.lastTurnAt ? Date.parse(entry.lastTurnAt) : Number.NEGATIVE_INFINITY);

/**
 * A party primeiro (na ordem em que o Pedro chamou), depois a fila pelo revezamento: a última vez na
 * party do PPA, quem nunca jogou na frente, e o empate pela hora em que entrou (party_fila_chamar faz igual).
 */
export function orderEntries(entries: readonly QueueEntry[]): QueueEntry[] {
  const party = entries
    .filter((e) => e.state === "na_party")
    .sort((a, b) => time(a.calledAt) - time(b.calledAt) || time(a.queuedAt) - time(b.queuedAt));
  const waiting = entries
    .filter((e) => e.state === "aguardando")
    .sort((a, b) => turnTime(a) - turnTime(b) || time(a.queuedAt) - time(b.queuedAt) || a.id.localeCompare(b.id));
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

/** Lugares livres da party, do jeito que a página e os overlays mostram (o mesmo número nos dois). */
export interface PartySeatsView {
  /** Lugares sem ninguém na party agora. */
  free: number;
  /** Livres que a fila já tem dono: quem está com a vez (0 partidas até entrar). */
  reserved: number;
  /** Livres à venda, até o limite das vagas abertas da fila. */
  forSale: number;
  /** Livres fora de venda: a fila chegou ao tamanho máximo. */
  closed: number;
}

export function partySeatsView(queue: PublicQueue): PartySeatsView {
  const seats = Math.min(4, Math.max(1, queue.live?.seatsPerMatch ?? 4));
  const free = Math.max(0, seats - queue.party.length);
  const reserved = Math.min(free, queue.queue.filter((e) => e.matchesUntilTurn === 0).length);
  const forSale = Math.min(free - reserved, queue.live?.seatsOpen ?? 0);
  return { free, reserved, forSale, closed: free - reserved - forSale };
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
export function toPublicQueue(
  snapshot: QueueSnapshot,
  identity: (userId: string | null) => PublicIdentity | undefined,
  now = new Date(),
  isMember: (userId: string | null) => boolean = () => false
): PublicQueue {
  const positions = queuePositions(snapshot);
  const publicEntry = (e: QueueEntry): PublicEntry => {
    const who = identity(e.userId);
    return { id: e.id, name: who?.name || FALLBACK_NAME, avatarUrl: who?.avatarUrl ?? null, matches: e.matches, played: e.played, battlepass: isMember(e.userId) };
  };
  const live = snapshot.live;
  return {
    live: live
      ? {
          status: live.status,
          startsAt: live.status === "fila" ? null : live.startsAt,
          onAirAt: live.onAirAt,
          seatsOpen: seatsOpen(live),
          queueSize: live.queueSize,
          seatsPerMatch: live.seatsPerMatch,
          youtubeVideoId: live.youtubeVideoId,
          matchesDone: live.matchesDone,
        }
      : null,
    party: snapshot.entries.filter((e) => e.state === "na_party").map(publicEntry),
    queue: snapshot.entries
      .filter((e) => e.state === "aguardando")
      .map((e) => ({ ...publicEntry(e), ...(positions.get(e.id) ?? { position: 0, matchesUntilTurn: 0 }) })),
    updatedAt: now.toISOString(),
  };
}
