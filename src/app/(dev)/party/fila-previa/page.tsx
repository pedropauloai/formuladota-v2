// Prévia da página pública da fila (/party) com dados de exemplo, só em desenvolvimento: o grupo (dev)
// responde 404 em produção, e a página abre sem banco. ?cena= escolhe o momento de quem olha: comprar
// (padrão), na-fila, na-party, fila-aberta e esgotado. A fila sai da mesma conta do servidor (model.ts),
// com a vaga do dia (migration 194), uma cortesia por partida e o selo do Battlepass.

import { HowItWorks } from "@/components/loja/fila/how-it-works";
import { PartyQueuePage } from "@/components/loja/fila/party-queue-page";
import {
  orderEntries,
  queuePositions,
  toPublicQueue,
  type MyQueueEntry,
  type QueueEntry,
  type QueueLive,
  type QueueSnapshot,
  type QueueView,
} from "@/lib/loja/fila/model";
import { StaticQueue } from "./static-queue";

const MIN = 60_000;
const PRICE_CENTS = 2500;

interface Seed {
  id: string;
  name: string;
  hero: string;
  /** Minutos desde que entrou na fila. */
  queued: number;
  /** Minutos desde a última vez na party; null = nunca jogou. */
  lastTurn: number | null;
  extra?: Partial<QueueEntry>;
}

const PEOPLE: Seed[] = [
  { id: "kaiser", name: "Kaiser", hero: "juggernaut", queued: 160, lastTurn: 20, extra: { state: "na_party", dayPass: true, played: 2, source: "battlepass" } },
  { id: "rafa", name: "Rafa Supp", hero: "crystal_maiden", queued: 138, lastTurn: null, extra: { state: "na_party", dayPass: true } },
  { id: "gabi", name: "Gabizinha", hero: "windrunner", queued: 121, lastTurn: 70, extra: { state: "na_party", matches: 2, played: 1, source: "cortesia" } },
  { id: "pudge", name: "O Rei do Pudge Hook (BR)", hero: "pudge", queued: 2, lastTurn: null, extra: { dayPass: true } },
  { id: "juninho", name: "Juninho Pos5", hero: "lion", queued: 99, lastTurn: null, extra: { dayPass: true } },
  { id: "ze", name: "Zé do Tinker", hero: "tinker", queued: 70, lastTurn: 25, extra: { dayPass: true, played: 1 } },
  { id: "lukinhas", name: "Lukinhas", hero: "phantom_assassin", queued: 90, lastTurn: 45, extra: { dayPass: true, played: 1, source: "battlepass" } },
];
const MEMBERS = new Set(["user-kaiser", "user-lukinhas"]);

const ago = (now: number, minutes: number) => new Date(now - minutes * MIN).toISOString();

function entry(now: number, seed: Seed): QueueEntry {
  return {
    id: `previa-${seed.id}`,
    userId: `user-${seed.id}`,
    state: "aguardando",
    matches: 1,
    played: 0,
    queuedAt: ago(now, seed.queued),
    calledAt: seed.extra?.state === "na_party" ? ago(now, 9) : null,
    lastTurnAt: seed.lastTurn === null ? null : ago(now, seed.lastTurn),
    source: "pedido",
    dayPass: false,
    ...seed.extra,
  };
}

function live(now: number, offAir: boolean, occupied: number): QueueLive {
  return {
    id: "previa-live",
    status: offAir ? "fila" : "ao_vivo",
    startsAt: offAir ? "2026-01-01T03:00:00.000Z" : ago(now, 72),
    onAirAt: offAir ? null : ago(now, 72),
    queueSize: 20,
    seatsPerMatch: 4,
    occupied,
    youtubeVideoId: null,
    matchesDone: 3,
  };
}

/** A vez de quem olha, como a rota /api/party/fila/minha devolve. */
function mineOf(snapshot: QueueSnapshot, id: string | null): MyQueueEntry[] {
  const own = snapshot.entries.find((e) => e.id === `previa-${id}`);
  if (!own) return [];
  const pos = queuePositions(snapshot).get(own.id);
  return [
    {
      id: own.id,
      state: own.state,
      position: pos?.position ?? null,
      matchesUntilTurn: pos?.matchesUntilTurn ?? null,
      matches: own.matches,
      played: own.played,
      noShows: 0,
      calledAt: own.calledAt,
      exit: null,
      source: own.source,
      dayPass: own.dayPass,
    },
  ];
}

function scene(name: string): QueueView {
  const now = Date.now();
  const offAir = name === "fila-aberta";
  const people = PEOPLE.map((seed) => entry(now, seed)).map((e) => (offAir ? { ...e, state: "aguardando" as const, calledAt: null } : e));
  const occupied = name === "esgotado" ? 20 : people.filter((e) => (e.dayPass ? e.played === 0 : true)).length;
  const snapshot: QueueSnapshot = { live: live(now, offAir, occupied), entries: orderEntries(people) };
  const names = new Map(PEOPLE.map((p) => [`user-${p.id}`, { name: p.name, avatarUrl: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${p.hero}.png` }]));
  const queue = toPublicQueue(snapshot, (id) => (id ? names.get(id) : undefined), new Date(now), (id) => !!id && MEMBERS.has(id), {
    priceCents: PRICE_CENTS,
    mode: "dia",
  });
  const viewerId = name === "na-fila" ? "ze" : name === "na-party" ? "kaiser" : null;
  return { queue, mine: { entries: mineOf(snapshot, viewerId), pending: null, battlepass: false } };
}

export default async function FilaPrevia({ searchParams }: { searchParams: Promise<{ cena?: string }> }) {
  const { cena } = await searchParams;
  return (
    <div className="min-h-screen bg-bg-deep">
      <StaticQueue />
      <PartyQueuePage
        initial={scene(cena ?? "comprar")}
        viewer={{ loggedIn: true, hasSteam: true, dotaId: "412883017" }}
        offer={{ priceCents: PRICE_CENTS, maxQuantity: 1, onSale: true }}
        initialQuantity={1}
        howItWorks={<HowItWorks />}
      />
    </div>
  );
}
