import { describe, expect, it } from "vitest";
import { matchesUntilTurn, orderEntries, partySeatsView, queuePositions, seatsOpen, toPublicQueue, type PublicQueue, type QueueEntry, type QueueSnapshot } from "./model";

const entry = (id: string, over: Partial<QueueEntry> = {}): QueueEntry => ({
  id,
  userId: `user-${id}`,
  state: "aguardando",
  matches: 1,
  played: 0,
  queuedAt: "2026-11-19T16:00:00.000Z",
  calledAt: null,
  ...over,
});

const live = {
  id: "live-1",
  status: "ao_vivo" as const,
  startsAt: "2026-11-19T16:00:00.000Z",
  onAirAt: "2026-11-19T16:00:00.000Z",
  queueSize: 8,
  seatsPerMatch: 4,
  occupied: 5,
  youtubeVideoId: null,
  matchesDone: 0,
};

describe("matchesUntilTurn", () => {
  it("com lugar livre na party, quem espera entra já (0 partidas)", () => {
    expect(matchesUntilTurn([1, 1], [1, 1], 4)).toEqual([0, 0]);
  });

  it("party cheia: cada partida jogada abre os lugares de quem terminou", () => {
    // 4 na party com 1 partida cada: depois de 1 partida os 4 saem e os próximos 4 entram.
    expect(matchesUntilTurn([1, 1, 1, 1], [1, 1, 1, 1, 1], 4)).toEqual([1, 1, 1, 1, 2]);
  });

  it("quem comprou várias partidas segura o lugar por mais tempo", () => {
    // Party de 1 lugar: a primeira pessoa tem 3 partidas pela frente, a segunda espera as 3.
    expect(matchesUntilTurn([3], [2, 1], 1)).toEqual([3, 5]);
  });

  it("party vazia e fila vazia não travam", () => {
    expect(matchesUntilTurn([], [], 4)).toEqual([]);
    expect(matchesUntilTurn([], [5], 4)).toEqual([0]);
  });
});

describe("orderEntries", () => {
  it("party primeiro na ordem da chamada, depois a fila na ordem do pagamento", () => {
    const ordered = orderEntries([
      entry("c", { queuedAt: "2026-11-19T16:03:00.000Z" }),
      entry("p2", { state: "na_party", calledAt: "2026-11-19T16:10:00.000Z" }),
      entry("a", { queuedAt: "2026-11-19T16:01:00.000Z" }),
      entry("p1", { state: "na_party", calledAt: "2026-11-19T16:05:00.000Z" }),
      entry("b", { queuedAt: "2026-11-19T16:02:00.000Z" }),
    ]);
    expect(ordered.map((e) => e.id)).toEqual(["p1", "p2", "a", "b", "c"]);
  });

  it("compara a hora como hora, não como texto (frações de segundo de tamanhos diferentes)", () => {
    const ordered = orderEntries([entry("tarde", { queuedAt: "2026-11-19T16:00:00.5+00:00" }), entry("cedo", { queuedAt: "2026-11-19T16:00:00.12+00:00" })]);
    expect(ordered.map((e) => e.id)).toEqual(["cedo", "tarde"]);
  });
});

describe("posições e vagas", () => {
  it("numera quem espera a partir de 1 e soma o que falta jogar", () => {
    const snapshot: QueueSnapshot = {
      live: { ...live, seatsPerMatch: 1 },
      entries: [entry("p", { state: "na_party", matches: 2, played: 1 }), entry("a", { matches: 3 }), entry("b")],
    };
    const positions = queuePositions(snapshot);
    expect(positions.get("a")).toEqual({ position: 1, matchesUntilTurn: 1 });
    expect(positions.get("b")).toEqual({ position: 2, matchesUntilTurn: 4 });
  });

  it("vagas abertas = tamanho da fila menos o que ocupa, nunca negativo", () => {
    expect(seatsOpen(live)).toBe(3);
    expect(seatsOpen({ queueSize: 2, occupied: 5 })).toBe(0);
    expect(seatsOpen(null)).toBe(0);
  });
});

describe("toPublicQueue", () => {
  const snapshot: QueueSnapshot = {
    live,
    entries: [entry("p", { state: "na_party", calledAt: "2026-11-19T16:05:00.000Z" }), entry("a", { userId: null })],
  };
  const names = new Map([["user-p", { name: "Fulano", avatarUrl: "https://avatars.steamstatic.com/x.jpg" }]]);
  const queue = toPublicQueue(snapshot, (id) => (id ? names.get(id) : undefined), new Date("2026-11-19T16:30:00.000Z"));

  it("mostra o nome público e a posição", () => {
    expect(queue.party[0]?.name).toBe("Fulano");
    expect(queue.queue[0]).toMatchObject({ id: "a", name: "Jogador", position: 1 });
    expect(queue.live?.seatsOpen).toBe(3);
    expect(queue.updatedAt).toBe("2026-11-19T16:30:00.000Z");
  });

  it("não leva id de usuário nem contato para o JSON", () => {
    const json = JSON.stringify(queue);
    expect(json).not.toContain("user-p");
    expect(json).not.toMatch(/userId|email|whatsapp|steam_id/i);
  });

  it("sem live, devolve a fila sem vagas", () => {
    const empty = toPublicQueue({ live: null, entries: [] }, () => undefined);
    expect(empty.live).toBeNull();
    expect(empty.queue).toEqual([]);
  });

  it("fila aberta sem live: vende as vagas e não mostra data de live", () => {
    const open = { ...live, id: "fila", status: "fila" as const, startsAt: "2026-01-01T03:00:00.000Z", onAirAt: null, queueSize: 20, occupied: 3 };
    const body = toPublicQueue({ live: open, entries: [entry("a")] }, () => ({ name: "Ana", avatarUrl: null }));
    expect(body.live?.status).toBe("fila");
    expect(body.live?.startsAt).toBeNull();
    expect(body.live?.seatsOpen).toBe(17);
    expect(body.queue[0]?.position).toBe(1);
  });
});

describe("partySeatsView (lugares livres da party, iguais aos dos overlays)", () => {
  const publicLive = { status: "ao_vivo" as const, startsAt: null, onAirAt: null, queueSize: 8, seatsPerMatch: 4, youtubeVideoId: null, matchesDone: 0 };
  const member = (id: string) => ({ id, name: id, avatarUrl: null, matches: 1, played: 0, battlepass: false });
  const waiting = (id: string, matchesUntilTurn: number, position: number) => ({ ...member(id), position, matchesUntilTurn });
  const queueOf = (party: number, turns: number[], seatsOpenNow: number): PublicQueue => ({
    live: { ...publicLive, seatsOpen: seatsOpenNow },
    party: Array.from({ length: party }, (_, i) => member(`p${i}`)),
    queue: turns.map((turn, i) => waiting(`q${i}`, turn, i + 1)),
    updatedAt: "2026-11-19T16:00:00.000Z",
  });

  it("lugar livre de quem está com a vez não aparece como vaga", () => {
    // 1 na party, 3 livres; 2 esperando com a vez agora: só 1 lugar à venda.
    expect(partySeatsView(queueOf(1, [0, 0, 1], 5))).toEqual({ free: 3, reserved: 2, forSale: 1, closed: 0 });
  });

  it("as vagas à venda nunca passam das vagas abertas da fila", () => {
    // 3 livres, ninguém esperando, mas a fila só tem 1 vaga aberta: 1 à venda e 2 esgotados.
    expect(partySeatsView(queueOf(1, [], 1))).toEqual({ free: 3, reserved: 0, forSale: 1, closed: 2 });
  });

  it("party cheia: nenhum lugar livre", () => {
    expect(partySeatsView(queueOf(4, [1, 1], 2))).toEqual({ free: 0, reserved: 0, forSale: 0, closed: 0 });
  });

  it("fora da live, quem já espera tem dono dos primeiros lugares da próxima party", () => {
    const offAir = { ...queueOf(0, [0, 0], 18), live: { ...publicLive, status: "fila" as const, seatsOpen: 18 } };
    expect(partySeatsView(offAir)).toEqual({ free: 4, reserved: 2, forSale: 2, closed: 0 });
  });
});

describe("revezamento (Battlepass, migration 192)", () => {
  it("quem jogou há mais tempo vem primeiro; quem nunca jogou vai na frente de todos", () => {
    const ordered = orderEntries([
      entry("recente", { lastTurnAt: "2026-11-19T15:00:00.000Z", queuedAt: "2026-11-19T10:00:00.000Z" }),
      entry("antigo", { lastTurnAt: "2026-11-17T15:00:00.000Z", queuedAt: "2026-11-19T12:00:00.000Z" }),
      entry("novo", { lastTurnAt: null, queuedAt: "2026-11-19T14:00:00.000Z" }),
    ]);
    expect(ordered.map((e) => e.id)).toEqual(["novo", "antigo", "recente"]);
  });

  it("empate no revezamento: quem entrou antes na fila", () => {
    const ordered = orderEntries([
      entry("b", { queuedAt: "2026-11-19T12:00:00.000Z" }),
      entry("a", { queuedAt: "2026-11-19T11:00:00.000Z" }),
    ]);
    expect(ordered.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("a party continua na ordem da chamada, sem revezamento", () => {
    const ordered = orderEntries([
      entry("p2", { state: "na_party", calledAt: "2026-11-19T16:05:00.000Z", lastTurnAt: null }),
      entry("p1", { state: "na_party", calledAt: "2026-11-19T16:01:00.000Z", lastTurnAt: "2026-11-19T15:00:00.000Z" }),
    ]);
    expect(ordered.map((e) => e.id)).toEqual(["p1", "p2"]);
  });

  it("o JSON público leva o selo só de quem tem o Battlepass, sem o id de usuário", () => {
    const body = toPublicQueue({ live, entries: [entry("a"), entry("b")] }, () => ({ name: "X", avatarUrl: null }), new Date(), (id) => id === "user-a");
    expect(body.queue.map((e) => e.battlepass)).toEqual([true, false]);
    expect(JSON.stringify(body)).not.toContain("user-a");
  });
});
