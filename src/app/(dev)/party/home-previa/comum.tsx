// PROTÓTIPO descartável (home-previa): peças que as três versões leem igual (dados, não forma).

import Image from "next/image";
import type { PublicEntry, PublicQueue } from "@/lib/loja/fila/model";
import { OWNER } from "@/lib/loja/owner";

export const ABAS = [
  { href: "/meta", rotulo: "Meta" },
  { href: "/loja", rotulo: "Loja" },
  { href: "/ranking", rotulo: "Ranking" },
  { href: "/partidas", rotulo: "Partidas" },
  { href: "/times", rotulo: "Times" },
  { href: "/torneios", rotulo: "Torneios" },
];

export function Logo({ className }: { className?: string }) {
  return <Image src="/brand/logo-horizontal-white.png" width={1933} height={400} alt="FORMULADOTA" priority className={className} />;
}

/** Lugar da party: o PPA, quem já está nela, e o que sobra até 5 (o PPA e mais 4). */
export type Lugar = { tipo: "dono" } | { tipo: "membro"; pessoa: PublicEntry } | { tipo: "livre"; primeiro: boolean };

export function lugaresDaParty(fila: PublicQueue): Lugar[] {
  const porPartida = fila.live?.seatsPerMatch ?? 4;
  const membros = fila.party.slice(0, porPartida);
  const livres = Math.max(0, porPartida - membros.length);
  return [
    { tipo: "dono" },
    ...membros.map((pessoa) => ({ tipo: "membro" as const, pessoa })),
    ...Array.from({ length: livres }, (_, i) => ({ tipo: "livre" as const, primeiro: i === 0 })),
  ];
}

export function Rosto({ url, nome, className }: { url: string | null; nome: string; className?: string }) {
  if (!url) {
    return (
      <span className={`grid place-items-center bg-white/10 font-bold text-white/70 ${className ?? ""}`} aria-hidden="true">
        {nome.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- protótipo: retrato de herói da CDN da Valve, como na prévia da fila
  return <img src={url} alt="" className={`object-cover ${className ?? ""}`} />;
}

export function RostoDoPPA({ className, grande }: { className?: string; grande?: boolean }) {
  return <Image src={grande ? OWNER.avatarLarge : OWNER.avatar} width={grande ? 512 : 256} height={grande ? 512 : 256} alt="" className={className} />;
}

export const vagasAbertas = (fila: PublicQueue): number => fila.live?.seatsOpen ?? 0;

/** "na vez" para quem entra na próxima chamada; senão, quantas partidas faltam. */
export const quandoJoga = (n: number): string => (n === 0 ? "Entra na próxima" : n === 1 ? "Em 1 partida" : `Em ${n} partidas`);
