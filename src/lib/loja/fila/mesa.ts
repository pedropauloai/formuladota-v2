// Regras da mesa de operação da fila (/admin/loja/fila), sem tela: qual é o próximo passo da live,
// em que grupo da fila cada pessoa está e a frase que o topo da party mostra.

import type { AdminQueue, AdminQueueEntry } from "./admin";

export type Step = "abrir" | "completar" | "terminar" | "esperar";

/** O passo da live que a mesa pede agora; um só por vez. */
export function nextStep(data: AdminQueue): Step {
  const live = data.live;
  if (!live || live.status !== "ao_vivo") return "abrir";
  const party = data.entries.filter((e) => e.state === "na_party").length;
  const waiting = data.entries.length - party;
  if (party < live.seatsPerMatch && waiting > 0) return "completar";
  return party > 0 ? "terminar" : "esperar";
}

/** Grupo pela vez: 0 entra no lugar livre de agora, 1 depois da partida em jogo, 2 mais tarde. */
export function turnGroup(entry: AdminQueueEntry): 0 | 1 | 2 {
  const turn = entry.matchesUntilTurn ?? 2;
  return turn <= 0 ? 0 : turn === 1 ? 1 : 2;
}

function names(list: AdminQueueEntry[]): string {
  const shown = list.map((e) => e.name);
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} e ${shown.at(-1)}` : (shown[0] ?? "");
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A frase do passo: o fato (em destaque na tela) e, em seguida, o que fazer. */
export function stepStatus(data: AdminQueue, step: Step): [lead: string, rest: string] {
  const live = data.live;
  const party = data.entries.filter((e) => e.state === "na_party");
  const waiting = data.entries.filter((e) => e.state === "aguardando");
  const seats = live?.seatsPerMatch ?? 4;
  const n = (live?.matchesDone ?? 0) + 1;
  if (step === "abrir") {
    const lead = waiting.length > 0 ? `${plural(waiting.length, "pessoa esperando", "pessoas esperando")} a live.` : "A live está fora do ar.";
    return [lead, "Ao abrir, a party começa a chamar a fila. Quem comprou fora da live já está na ordem."];
  }
  if (step === "completar") {
    const free = Math.max(0, seats - party.length);
    return [`${plural(free, "lugar livre", "lugares livres")}.`, `Entra${waiting.length > 1 && free > 1 ? "m" : ""} ${names(waiting.slice(0, free))}. Depois, convide cada um pelo ID do Dota.`];
  }
  if (step === "terminar") {
    const full = party.length >= seats;
    const lead = full ? `Partida ${n} em jogo.` : `Partida ${n} com ${plural(party.length, "jogador", "jogadores")}.`;
    return [lead, `${full ? "" : "Ninguém esperando na fila. "}Quando acabar, toque em Partida ${n} terminou: o site acha o ID na OpenDota e você só confere.`];
  }
  return ["Ninguém na fila ainda.", "Mostre o QR na tela (formuladota.com.br/qr): quem comprar aparece aqui na hora."];
}
