// PROTÓTIPO descartável (home-previa), versão C "Cartaz": canto vivo (0 px) e linha fina de 1 px,
// superfícies chapadas, sem brilho. Uma família só, a Archivo (estreita e preta no cartaz, normal no
// texto). O preço vira o título; o retrato do PPA ocupa a direita, com a fila como uma escalação.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicQueue } from "@/lib/loja/fila/model";
import { OWNER } from "@/lib/loja/owner";
import { ImmortalMedal } from "@/components/v2";
import { cn } from "@/lib/utils";
import { ABAS, Logo, Rosto, quandoJoga, vagasAbertas } from "./comum";
import { MICROTEXTO, PASSOS, SUBTITULO, reais, situacao } from "./dados";
import { SegundaTela } from "./segunda-tela";
import s from "./previa.module.css";

function Barra() {
  return (
    <header className={cn(s.cBarra, "relative z-10 flex h-16 items-center gap-10 px-8")}>
      <Link href="/" className="flex items-center" aria-label="FORMULADOTA, início">
        <Logo className="h-8 w-auto" />
      </Link>
      <nav className="flex items-center gap-8" aria-label="Seções">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} className={cn(s.cLink, s.saida)}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-7">
        <span className="flex items-center gap-2 text-sm text-[#a7abb3]">
          <span className="size-2 rounded-full bg-[#00c466]" aria-hidden="true" /> 1 online
        </span>
        <Link href="/codigo-de-conduta" className={cn(s.cLink, s.saida)}>
          Conduta
        </Link>
        <button type="button" className={cn(s.cSecundario, s.saida)}>
          Entrar
        </button>
      </div>
    </header>
  );
}

function Escalacao({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  const linhas = [...fila.party.map((p) => ({ ...p, naParty: true as const })), ...fila.queue.slice(0, 5).map((p) => ({ ...p, naParty: false as const }))];
  return (
    <div className={cn(s.entra2, "relative h-full")}>
      <div className="relative h-full min-h-[40rem] overflow-hidden border border-white/10">
        <Image src={OWNER.portrait} alt="" fill priority sizes="40vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-[#0b0c0f]/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-1 bg-[#c42121]" aria-hidden="true" />
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#0b0c0f]/92 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[0.9375rem] font-semibold text-[#f5f5f5]">
            {sit.tipo === "aovivo" && <span className={s.aoVivo} aria-hidden="true" />}
            {sit.rotulo}
          </span>
          <span className="text-sm text-[#a7abb3]">
            <span className={cn(s.cNumero, "text-[#f5f5f5]")}>{fila.queue.length}</span> na fila ·{" "}
            <span className={cn(s.cNumero, "text-[#00c466]")}>{vagasAbertas(fila)}</span> vagas
          </span>
        </div>
        {linhas.length === 0 ? (
          <p className="mt-4 border-t border-white/10 pt-4 text-[0.9375rem] text-[#c9ccd1]">Fila vazia. Quem garantir a vaga agora é o próximo.</p>
        ) : (
          <ol className="mt-4 divide-y divide-white/10 border-t border-white/10">
            {linhas.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className={cn(s.cNumero, "flex w-7 items-center text-[#c8aa6e]")}>
                  {p.naParty ? <span className="size-2 bg-[#00c466]" aria-label="Na party" /> : String(p.position).padStart(2, "0")}
                </span>
                <Rosto url={p.avatarUrl} nome={p.name} className="size-7" />
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-[#e8e8e8]">{p.name}</span>
                <span className="text-sm text-[#a7abb3]">{p.naParty ? "Na party" : quandoJoga(p.matchesUntilTurn)}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <ImmortalMedal rankTier={rankTier} rank={rank} size={40} />
          <span className="text-sm text-[#c9ccd1]">
            <strong className="text-[#f5f5f5]">PeterPPA</strong>, profissional de Tinker. Imortal{" "}
            <span className={cn(s.cNumero, "text-[#c8aa6e]")}>#{rank?.toLocaleString("pt-BR")}</span> no ranking da Valve.
          </span>
        </div>
      </div>
    </div>
  );
}

export function VersaoC({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  return (
    <div className={cn(s.verC, "relative")}>
      <Barra />
      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1320px] grid-cols-12 items-stretch gap-12 px-8 py-12">
        <div className={cn(s.entra, "col-span-7 flex flex-col justify-center")}>
          <h1 className={cn(s.cTitulo, "text-[9.5rem] leading-[0.8] text-[#f5f5f5]")}>
            Jogue no
            <br />
            time do <span className="text-[#c42121]">PPA.</span>
          </h1>
          <div className="mt-10 flex items-stretch border-y border-white/10">
            <div className="flex items-start gap-1 border-r border-white/10 py-5 pr-8 text-[#c8aa6e]">
              <span className={cn(s.cNumero, "mt-2 text-2xl")}>R$</span>
              <span className={cn(s.cNumero, "text-[5.5rem] leading-[0.8]")}>{reais(fila.offer?.priceCents)}</span>
            </div>
            <p className="flex items-center py-5 pl-8 text-[1.1875rem] leading-relaxed text-[#d4d6da]">
              {sit.tipo === "aovivo" ? "A live está no ar. " : ""}
              {SUBTITULO.replace("A vaga do dia custa R$ 25 e vale a live inteira. ", "A vaga do dia vale a live inteira. ")}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-9 gap-y-4">
            <Link href="/party" className={cn(s.cPrimario, s.saida)}>
              <span>Garantir minha vaga</span>
              <span>
                <ArrowRight size={22} strokeWidth={2.25} aria-hidden="true" />
              </span>
            </Link>
            <a href="#como-funciona" className={cn(s.cFantasma, s.saida)}>
              Como funciona
            </a>
          </div>
          <p className="mt-5 text-sm text-[#a7abb3]">{MICROTEXTO}</p>
        </div>
        <div className="col-span-5">
          <Escalacao fila={fila} rank={rank} rankTier={rankTier} />
        </div>
      </section>
      <SegundaTela versao="c" passos={PASSOS} />
    </div>
  );
}
