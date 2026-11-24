// Regras da mesa de operação da fila (/admin/loja/fila), sem tela: qual é o próximo passo da live,
// em que grupo da fila cada pessoa está e a frase que o topo da party mostra. Não existe "abrir a
// live": o primeiro chamado da party abre, e o cron fecha a live parada (live-auto.ts).

import type { AdminQueue, AdminQueueEntry } from "./admin";

export type Step = "completar" | "terminar" | "esperar";

/** O passo da live que a mesa pede agora; um só por vez. Fora do ar, completar a party abre a live. */
export function nextStep(data: AdminQueue): Step {
  const live = data.live;
  if (!live) return "esperar";
  const party = data.entries.filter((e) => e.state === "na_party").length;
  const waiting = data.entries.length - party;
  if (party < live.seatsPerMatch && waiting > 0) return "completar";
  // Só a live no ar conta partida.
  return party > 0 && live.status === "ao_vivo" ? "terminar" : "esperar";
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
  const onAir = live?.status === "ao_vivo";
  if (step === "completar") {
    const free = Math.max(0, seats - party.length);
    const opens = onAir ? "" : ", e a live abre sozinha";
    return [`${plural(free, "lugar livre", "lugares livres")}.`, `Entra${waiting.length > 1 && free > 1 ? "m" : ""} ${names(waiting.slice(0, free))}${opens}. Depois, convide cada um pelo ID do Dota.`];
  }
  if (step === "terminar") {
    const full = party.length >= seats;
    const lead = full ? `Partida ${n} em jogo.` : `Partida ${n} com ${plural(party.length, "jogador", "jogadores")}.`;
    return [lead, `${full ? "" : "Ninguém esperando na fila. "}Quando acabar, toque em Partida ${n} terminou: o site acha o ID na OpenDota e você só confere.`];
  }
  const qr = "Mostre o QR na tela (formuladota.com.br/qr): quem comprar aparece aqui na hora.";
  return ["Ninguém na fila ainda.", onAir ? qr : `${qr} A live abre sozinha no primeiro chamado.`];
}
