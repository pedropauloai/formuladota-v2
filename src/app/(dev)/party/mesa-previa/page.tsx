// Prévia da mesa da fila (/admin/loja/fila) com dados de exemplo, só em desenvolvimento: o grupo
// (dev) responde 404 em produção. Mora em /party porque essa rota é aberta no middleware, então abre
// sem login e sem banco. A moldura imita a casca do admin (barra de cima, menu do admin e a faixa do
// JOGAR DOTA) nas mesmas medidas. ?cena= escolhe o momento: completar (padrão), jogando, sem-live, vazia;
// ?cena=estados mostra o "Partida terminou" com a partida achada, que só aparece com o banco.
// A maioria das vagas é do dia (migration 194); a cortesia e uma vaga comprada antes seguem por partida.

import type { AdminFinishedEntry, AdminQueue, AdminQueueEntry } from "@/lib/loja/fila/admin";
import type { HistoryMatch } from "@/lib/loja/fila/admin-history";
import { matchesUntilTurn, remainingMatches, type QueueLive } from "@/lib/loja/fila/model";
import { FoundMatch, type Found } from "@/app/admin/loja/fila/match-end";
import { AdminQueuePanel } from "@/app/admin/loja/fila/panel";

const MIN = 60_000;

interface Seed {
  name: string;
  hero: string | null;
  persona: string | null;
  dotaId: string | null;
  /** Minutos desde a última vez na party; null = nunca jogou. */
  lastTurn: number | null;
  /** Minutos desde que entrou na fila. */
  queued: number;
  extra?: Partial<AdminQueueEntry>;
}

const PEOPLE: Seed[] = [
  { name: "Kaiser", hero: "juggernaut", persona: "Kaiser", dotaId: "412883017", lastTurn: 20, queued: 160, extra: { battlepass: true, dayPass: true, played: 2 } },
  { name: "mlkzinho_mid", hero: "invoker", persona: "mlk", dotaId: "198220455", lastTurn: 40, queued: 150, extra: { matches: 2, played: 1 } },
  { name: "Rafa Supp", hero: "crystal_maiden", persona: "Rafa", dotaId: "305771912", lastTurn: null, queued: 138, extra: { dayPass: true } },
  { name: "Gabizinha", hero: "windrunner", persona: "gabi <3", dotaId: "87412093", lastTurn: null, queued: 121, extra: { courtesy: true } },
  { name: "O Rei do Pudge Hook (BR)", hero: "pudge", persona: "reidopudge", dotaId: "260019384", lastTurn: null, queued: 2, extra: { dayPass: true } },
  { name: "Tavinho", hero: null, persona: null, dotaId: "377120558", lastTurn: 130, queued: 110, extra: { noShows: 1, dayPass: true } },
  { name: "Juninho Pos5", hero: "lion", persona: "Juninho", dotaId: "102938475", lastTurn: null, queued: 99, extra: { boughtOffline: true, dayPass: true } },
  { name: "Lukinhas", hero: "phantom_assassin", persona: "Lukinhas", dotaId: "455128830", lastTurn: 210, queued: 90, extra: { battlepass: true, dayPass: true } },
  { name: "Mari Offlane", hero: "mars", persona: "Mari", dotaId: "291004417", lastTurn: null, queued: 1, extra: { dayPass: true } },
  { name: "Zé do Tinker", hero: "tinker", persona: "zé", dotaId: null, lastTurn: 25, queued: 70, extra: { dayPass: true, played: 2 } },
  { name: "Biel", hero: "sniper", persona: "Biel", dotaId: "133904721", lastTurn: null, queued: 64, extra: { carriedOver: true, dayPass: true } },
  { name: "Dudu Carry", hero: "faceless_void", persona: "Dudu", dotaId: "219877302", lastTurn: 260, queued: 52, extra: { courtesy: true, matches: 2 } },
];

const ago = (now: number, minutes: number) => new Date(now - minutes * MIN).toISOString();

function entry(now: number, seed: Seed, i: number): AdminQueueEntry {
  return {
    id: `previa-${i}`,
    state: "aguardando",
    position: null,
    matchesUntilTurn: null,
    matches: 1,
    played: 0,
    noShows: 0,
    queuedAt: ago(now, seed.queued),
    calledAt: null,
    name: seed.name,
    avatarUrl: seed.hero ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${seed.hero}.png` : null,
    steamPersona: seed.persona,
    steamProfileUrl: seed.persona ? `https://steamcommunity.com/profiles/765611988000000${String(i).padStart(2, "0")}` : null,
    dotaFriendId: seed.dotaId,
    carriedOver: false,
    boughtOffline: false,
    battlepass: false,
    courtesy: false,
    dayPass: false,
    lastTurnAt: seed.lastTurn === null ? null : ago(now, seed.lastTurn),
    ...seed.extra,
  };
}

/** Os primeiros `inParty` na party; o resto na fila, com posição e vez pela mesma conta do servidor. */
function arrange(now: number, entries: AdminQueueEntry[], inParty: number, seats: number): AdminQueueEntry[] {
  const party = entries.slice(0, inParty).map((e) => ({ ...e, state: "na_party" as const, calledAt: ago(now, 9) }));
  const waiting = entries.slice(inParty);
  const turns = matchesUntilTurn(party.map(remainingMatches), waiting.map(remainingMatches), seats);
  return [...party, ...waiting.map((w, i) => ({ ...w, position: i + 1, matchesUntilTurn: turns[i] ?? null }))];
}

function live(now: number, status: QueueLive["status"], matchesDone: number, occupied: number): QueueLive {
  return {
    id: "previa-live",
    status,
    startsAt: status === "fila" ? "2026-01-01T03:00:00.000Z" : ago(now, 72),
    onAirAt: status === "ao_vivo" ? ago(now, 72) : null,
    queueSize: 20,
    seatsPerMatch: 4,
    occupied,
    youtubeVideoId: null,
    matchesDone,
  };
}

function history(now: number, people: AdminQueueEntry[]): HistoryMatch[] {
  const p = (i: number, confirmed: boolean, kind: "jogou" | "nao_apareceu" = "jogou") => {
    const e = people[i % people.length] as AdminQueueEntry;
    return { userId: e.id, name: e.name, avatarUrl: e.avatarUrl, kind, confirmed };
  };
  return [
    { key: "h3", matchId: "9101887263", playedAt: ago(now, 14), players: [p(7, true), p(9, true), p(11, false), p(5, false, "nao_apareceu")] },
    { key: "h2", matchId: "9101790118", playedAt: ago(now, 58), players: [p(0, true), p(1, true), p(11, true), p(10, false)] },
    { key: "h1", matchId: null, playedAt: ago(now, 101), players: [p(0, false), p(3, false)] },
  ];
}

function finished(now: number): AdminFinishedEntry[] {
  return [
    { id: "f1", name: "Caio Midlaner", state: "concluido", exit: null, matches: 1, played: 3, finishedAt: ago(now, 20), refundCents: 0, dayPass: true },
    { id: "f2", name: "Henrique", state: "removido", exit: "saiu", matches: 3, played: 1, finishedAt: ago(now, 45), refundCents: 5000, dayPass: false },
    { id: "f3", name: "Vitinho", state: "removido", exit: "saiu", matches: 1, played: 0, finishedAt: ago(now, 62), refundCents: 2500, dayPass: true },
    { id: "f4", name: "Paulinho", state: "removido", exit: "tirado", matches: 1, played: 1, finishedAt: ago(now, 80), refundCents: 0, dayPass: true },
  ];
}

function scene(name: string): { data: AdminQueue; history: HistoryMatch[] } {
  const now = Date.now();
  const people = PEOPLE.map((seed, i) => entry(now, seed, i));
  const hist = history(now, people);
  if (name === "vazia") return { data: { live: live(now, "ao_vivo", 3, 0), entries: [], finished: finished(now) }, history: hist };
  if (name === "sem-live") {
    const offline = people.slice(2, 9).map((e) => ({ ...e, boughtOffline: !e.battlepass && !e.courtesy }));
    return { data: { live: live(now, "fila", 0, 9), entries: arrange(now, offline, 0, 4), finished: [] }, history: hist };
  }
  if (name === "jogando") return { data: { live: live(now, "ao_vivo", 3, 16), entries: arrange(now, people, 4, 4), finished: finished(now) }, history: hist };
  return { data: { live: live(now, "ao_vivo", 3, 14), entries: arrange(now, people, 2, 4), finished: finished(now) }, history: hist };
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center border-b border-white/[0.06] bg-bg-deep/90 px-5 text-xs text-text-faded xl:h-14">barra superior do site</div>
      <div className="grid min-h-0 flex-1 grid-cols-1">
        <main className="relative overflow-y-auto overflow-x-hidden pb-[80px] xl:pb-[96px] 2xl:pb-[112px]">
          <div className="relative z-[var(--z-elevated)] h-full">
            <div className="flex h-full">
              <aside className="hidden w-60 border-r border-border-subtle bg-bg-base/60 p-5 text-xs text-text-faded md:block">menu do admin</aside>
              <div className="flex-1 overflow-x-auto">{children}</div>
            </div>
          </div>
        </main>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-overlay)] flex h-20 items-end justify-end px-10 pb-5 xl:h-24 2xl:h-28">
        <div className="flex h-11 w-[268px] items-center justify-center rounded-md border-2 border-play-primary/50 bg-play-primary/15 text-sm font-bold uppercase tracking-[0.25em] text-play-primary xl:h-12 xl:w-[308px] 2xl:w-[328px]">
          Jogar Dota
        </div>
      </div>
    </div>
  );
}

/** A partida achada nos três jeitos que ela volta da OpenDota. */
function foundCases(party: AdminQueueEntry[]): { title: string; match: Found }[] {
  const now = Date.now();
  const base = { ok: true as const, matchId: "9102003417", endedAt: ago(now, 3), hidden: 0, beforeLive: false };
  return [
    { title: "Vitória, todos conferidos", match: { ...base, won: true, confirmed: party.map((p) => p.id) } },
    { title: "Derrota, um com o perfil fechado", match: { ...base, won: false, confirmed: party.slice(0, 3).map((p) => p.id), hidden: 1 } },
    { title: "Terminou antes de a live abrir", match: { ...base, matchId: "9100417730", endedAt: ago(now, 190), won: null, confirmed: [], beforeLive: true } },
  ];
}

/** O "Partida terminou" com a partida achada, que na mesa de verdade só aparece com o banco. */
function States({ party, cases }: { party: AdminQueueEntry[]; cases: { title: string; match: Found }[] }) {
  return (
    <div className="flex flex-wrap items-start gap-8 p-8">
      {cases.map((c) => (
        <div key={c.title} className="space-y-2">
          <p className="text-sm text-text-muted">{c.title}</p>
          <div className="w-[420px] rounded-md border border-white/10 bg-bg-elevated shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
            <FoundMatch match={c.match} party={party} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function MesaPreviaPage({ searchParams }: { searchParams: Promise<{ cena?: string }> }) {
  const { cena = "completar" } = await searchParams;
  if (cena === "estados") {
    const party = scene("jogando").data.entries.filter((e) => e.state === "na_party");
    return <States party={party} cases={foundCases(party)} />;
  }
  const { data, history: hist } = scene(cena);
  return (
    <Chrome>
      <AdminQueuePanel data={data} history={hist} />
    </Chrome>
  );
}
