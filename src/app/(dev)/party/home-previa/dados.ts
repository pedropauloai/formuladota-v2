// PROTÓTIPO descartável (home-previa): o que o herói mostra. "agora" vem do banco (a fila de verdade);
// "marcada" e "aovivo" são cenas de exemplo, com os mesmos nomes da prévia da fila (party/fila-previa).

import { orderEntries, toPublicQueue, type PublicQueue, type QueueEntry, type QueueSnapshot } from "@/lib/loja/fila/model";

export type Estado = "agora" | "marcada" | "aovivo";

export interface DadosPrevia {
  fila: PublicQueue;
  /** Posição do PPA no ranking da Valve e a medalha (store_owner_proof). */
  rank: number | null;
  rankTier: number | null;
}

const MIN = 60_000;
const heroi = (slug: string) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;

const PESSOAS = [
  { id: "kaiser", nome: "Kaiser", heroi: "juggernaut" },
  { id: "rafa", nome: "Rafa Supp", heroi: "crystal_maiden" },
  { id: "gabi", nome: "Gabizinha", heroi: "windrunner" },
  { id: "ze", nome: "Zé do Tinker", heroi: "tinker" },
  { id: "juninho", nome: "Juninho Pos5", heroi: "lion" },
  { id: "lukinhas", nome: "Lukinhas", heroi: "phantom_assassin" },
  { id: "pudge", nome: "O Rei do Pudge Hook", heroi: "pudge" },
];

function cena(estado: Exclude<Estado, "agora">): PublicQueue {
  const now = Date.now();
  const noAr = estado === "aovivo";
  const entries: QueueEntry[] = PESSOAS.map((p, i) => ({
    id: `previa-${p.id}`,
    userId: `user-${p.id}`,
    state: noAr && i < 3 ? "na_party" : "aguardando",
    matches: 1,
    played: 0,
    queuedAt: new Date(now - (90 - i * 10) * MIN).toISOString(),
    calledAt: noAr && i < 3 ? new Date(now - 9 * MIN).toISOString() : null,
    lastTurnAt: null,
    source: "pedido",
    dayPass: true,
  }));
  // Live marcada para hoje às 19h de Brasília (22h UTC); no ar, começou há uma hora.
  const hoje19 = new Date();
  hoje19.setUTCHours(22, 0, 0, 0);
  const snapshot: QueueSnapshot = {
    live: {
      id: "previa-live",
      status: noAr ? "ao_vivo" : "marcada",
      startsAt: noAr ? new Date(now - 60 * MIN).toISOString() : hoje19.toISOString(),
      onAirAt: noAr ? new Date(now - 60 * MIN).toISOString() : null,
      queueSize: 20,
      seatsPerMatch: 4,
      occupied: entries.length,
      youtubeVideoId: null,
      matchesDone: noAr ? 2 : 0,
    },
    entries: orderEntries(entries),
  };
  const nomes = new Map(PESSOAS.map((p) => [`user-${p.id}`, { name: p.nome, avatarUrl: heroi(p.heroi) }]));
  return toPublicQueue(snapshot, (id) => (id ? nomes.get(id) : undefined), new Date(now), () => false, { priceCents: 2500, mode: "dia" });
}

export function filaDoEstado(estado: Estado, real: PublicQueue): PublicQueue {
  return estado === "agora" ? real : cena(estado);
}

/** "25" a partir de 2500 centavos: a vaga é sempre em reais inteiros. */
export const reais = (cents: number | undefined): string => String(Math.round((cents ?? 2500) / 100));

export interface Situacao {
  tipo: "aovivo" | "marcada" | "fila";
  /** Linha curta do estado da live. */
  rotulo: string;
  /** Complemento: quando joga. */
  detalhe: string;
}

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "numeric" });

export function situacao(fila: PublicQueue): Situacao {
  const live = fila.live;
  if (live?.status === "ao_vivo") return { tipo: "aovivo", rotulo: "Ao vivo agora", detalhe: "A party está jogando" };
  if (live?.status === "marcada" && live.startsAt) {
    const quando = new Date(live.startsAt);
    const hoje = dia.format(quando) === dia.format(new Date());
    return { tipo: "marcada", rotulo: `Próxima live ${hoje ? "hoje" : dia.format(quando)}, ${hora.format(quando).replace(":00", "h")}`, detalhe: "Quem garantir agora joga nela" };
  }
  return { tipo: "fila", rotulo: "Fila aberta", detalhe: "Quem garantir agora joga na próxima live" };
}

export const TITULO = (s: Situacao): string => (s.tipo === "aovivo" ? "Jogue no time do PPA agora" : "Jogue no time do PPA na próxima live");

export const SUBTITULO =
  "A vaga do dia custa R$ 25 e vale a live inteira. Você entra na fila e, quando chegar a sua vez, o PPA convida você pelo ID do Dota.";

export const MICROTEXTO = "Pix ou cartão. Se a live acabar antes da sua primeira partida, a vaga vale para a próxima.";

export const PASSOS = [
  { titulo: "Garanta a vaga", texto: "Pague R$ 25 com Pix ou cartão. Você entra na fila na hora em que o pagamento cai." },
  { titulo: "Acompanhe a fila", texto: "A ordem é o revezamento: quem nunca jogou com o PPA, ou jogou há mais tempo, vem primeiro." },
  { titulo: "Jogue no time do PPA", texto: "Na sua vez, o PPA convida você pelo ID do Dota, com a partida na live. Depois, você volta para a fila e joga de novo." },
];
