import { describe, expect, it } from "vitest";
import type { AdminQueue, AdminQueueEntry } from "./admin";
import type { QueueLive } from "./model";
import { nextStep, stepStatus, turnGroup } from "./mesa";

const live = (over: Partial<QueueLive> = {}): QueueLive => ({
  id: "live-1",
  status: "ao_vivo",
  startsAt: "2026-11-23T20:00:00.000Z",
  onAirAt: "2026-11-23T20:00:00.000Z",
  queueSize: 20,
  seatsPerMatch: 4,
  occupied: 6,
  youtubeVideoId: null,
  matchesDone: 3,
  ...over,
});

const entry = (name: string, over: Partial<AdminQueueEntry> = {}): AdminQueueEntry => ({
  id: name,
  state: "aguardando",
  position: 1,
  matchesUntilTurn: 0,
  matches: 1,
  played: 0,
  noShows: 0,
  queuedAt: "2026-11-23T19:00:00.000Z",
  calledAt: null,
  name,
  avatarUrl: null,
  steamPersona: null,
  steamProfileUrl: null,
  dotaFriendId: null,
  carriedOver: false,
  boughtOffline: false,
  battlepass: false,
  courtesy: false,
  dayPass: false,
  lastTurnAt: null,
  ...over,
});

const inParty = (name: string) => entry(name, { state: "na_party", position: null, matchesUntilTurn: null });
const queue = (liveValue: QueueLive | null, entries: AdminQueueEntry[]): AdminQueue => ({ live: liveValue, entries, finished: [] });

describe("nextStep", () => {
  it("fora do ar, pede para completar a party com quem comprou na fila aberta (o chamado abre a live)", () => {
    expect(nextStep(queue(live({ status: "fila" }), [entry("Ana")]))).toBe("completar");
    expect(nextStep(queue(live({ status: "fila" }), []))).toBe("esperar");
    expect(nextStep(queue(null, []))).toBe("esperar");
  });

  it("nunca pede para marcar partida com a live fora do ar", () => {
    expect(nextStep(queue(live({ status: "fila" }), [inParty("Ana")]))).toBe("esperar");
  });

  it("pede para completar a party quando há lugar livre e alguém esperando", () => {
    expect(nextStep(queue(live(), [inParty("Ana"), entry("Beto")]))).toBe("completar");
  });

  it("pede para marcar a partida com a party cheia, ou com gente na party e ninguém esperando", () => {
    const full = ["Ana", "Beto", "Caio", "Dani"].map(inParty);
    expect(nextStep(queue(live(), [...full, entry("Enzo")]))).toBe("terminar");
    expect(nextStep(queue(live(), [inParty("Ana")]))).toBe("terminar");
  });

  it("espera quando a live está no ar e não há ninguém", () => {
    expect(nextStep(queue(live(), []))).toBe("esperar");
  });
});

describe("turnGroup", () => {
  it("separa quem entra agora, na próxima partida e depois", () => {
    expect(turnGroup(entry("Ana", { matchesUntilTurn: 0 }))).toBe(0);
    expect(turnGroup(entry("Beto", { matchesUntilTurn: 1 }))).toBe(1);
    expect(turnGroup(entry("Caio", { matchesUntilTurn: 3 }))).toBe(2);
    expect(turnGroup(entry("Dani", { matchesUntilTurn: null }))).toBe(2);
  });
});

describe("stepStatus", () => {
  it("diz quantos lugares estão livres e quem entra neles, no singular e no plural", () => {
    const two = queue(live(), [inParty("Ana"), inParty("Beto"), entry("Caio"), entry("Dani"), entry("Enzo")]);
    expect(stepStatus(two, "completar")).toEqual(["2 lugares livres.", "Entram Caio e Dani. Depois, convide cada um pelo ID do Dota."]);
    const one = queue(live(), [inParty("Ana"), inParty("Beto"), inParty("Caio"), entry("Dani"), entry("Enzo")]);
    expect(stepStatus(one, "completar")).toEqual(["1 lugar livre.", "Entra Dani. Depois, convide cada um pelo ID do Dota."]);
  });

  it("numera a partida em jogo a partir das que a live já contou", () => {
    const full = queue(live({ matchesDone: 3 }), ["Ana", "Beto", "Caio", "Dani"].map(inParty));
    const [lead, rest] = stepStatus(full, "terminar");
    expect(lead).toBe("Partida 4 em jogo.");
    expect(rest).toContain("Partida 4 terminou");
  });

  it("fora do ar, avisa que completar a party abre a live sozinha", () => {
    const off = queue(live({ status: "fila" }), [entry("Ana"), entry("Beto")]);
    expect(stepStatus(off, "completar")).toEqual(["4 lugares livres.", "Entram Ana e Beto, e a live abre sozinha. Depois, convide cada um pelo ID do Dota."]);
    expect(stepStatus(queue(live({ status: "fila" }), []), "esperar")[1]).toContain("A live abre sozinha no primeiro chamado.");
    expect(stepStatus(queue(live(), []), "esperar")[1]).not.toContain("abre sozinha");
  });
});
