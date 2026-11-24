// PROTÓTIPO descartável (home-previa), versão A "Cliente": reta de 2 px em tudo, metal escuro como o
// cliente do Dota, Teko nos títulos e Barlow no texto, nos botões e nos números (algarismos tabulares).
// Herói em duas colunas: a promessa e o botão à esquerda, o lobby da party à direita.

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import type { PublicQueue } from "@/lib/loja/fila/model";
import { ImmortalMedal } from "@/components/v2";
import { cn } from "@/lib/utils";
import { ABAS, Logo, Rosto, RostoDoPPA, lugaresDaParty, quandoJoga, vagasAbertas } from "./comum";
import { MICROTEXTO, PASSOS, SUBTITULO, TITULO, reais, situacao } from "./dados";
import { SegundaTela } from "./segunda-tela";
import s from "./previa.module.css";

const MONTAGEM = "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.jpg";

function Barra() {
  return (
    <header className={cn(s.aBarra, "relative z-10 flex h-16 items-stretch")}>
      <Link href="/" className="flex items-center px-7" aria-label="FORMULADOTA, início">
        <Logo className="h-8 w-auto" />
      </Link>
      <nav className="flex items-stretch" aria-label="Seções">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} className={cn(s.aAba, s.saida)}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-6 pr-7">
        <span className="flex items-center gap-2 text-sm font-medium text-[#a7abb3]">
          <span className="size-2 rounded-full bg-[#00c466]" aria-hidden="true" /> 1 online
        </span>
        <Link href="/codigo-de-conduta" className={cn(s.aAba, s.saida, "h-auto px-0 text-[1.2rem]")}>
          Conduta
        </Link>
        <button type="button" className={cn(s.aSecundario, s.saida)}>
          Entrar
        </button>
      </div>
    </header>
  );
}

function Lobby({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  const lugares = lugaresDaParty(fila);
  const fila5 = fila.queue.slice(0, 5);
  return (
    <section className={cn(s.aPainel, s.entra2, "w-full p-6")} aria-label="Party da live">
      <div className="flex items-center justify-between">
        <h2 className={cn(s.aTitulo, "text-[2rem] leading-none text-[#f5f5f5]")}>Party da live</h2>
        <span
          className={cn(
            s.aEtiqueta,
            sit.tipo === "aovivo" && "bg-[#c42121] text-white",
            sit.tipo === "marcada" && "bg-[#c8aa6e] text-[#0b0c0f]",
            sit.tipo === "fila" && "border border-white/15 text-[#c9ccd1]",
          )}
        >
          {sit.tipo === "aovivo" && <span className={s.aoVivo} aria-hidden="true" />}
          {sit.rotulo}
        </span>
      </div>

      <ol className="mt-5 grid grid-cols-5 gap-2.5">
        {lugares.map((l, i) => (
          <li key={i} className="space-y-2 text-center">
            <div className={cn(s.aSlot, l.tipo === "dono" && s.aSlotDono, l.tipo === "livre" && (l.primeiro ? s.aSlotSeu : s.aSlotLivre))}>
              {l.tipo === "dono" && <RostoDoPPA className="size-full object-cover" />}
              {l.tipo === "membro" && <Rosto url={l.pessoa.avatarUrl} nome={l.pessoa.name} className="size-full" />}
              {l.tipo === "livre" && <span className="text-2xl font-light">+</span>}
            </div>
            <p className={cn("truncate text-[0.8125rem] font-bold uppercase tracking-[0.08em]", l.tipo === "dono" ? "text-[#c8aa6e]" : l.tipo === "livre" && l.primeiro ? "text-[#00c466]" : "text-[#8b9099]")}>
              {l.tipo === "dono" ? "PPA" : l.tipo === "membro" ? l.pessoa.name : l.primeiro ? "Sua vaga" : "Vaga"}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <div className="flex items-baseline justify-between">
          <h3 className={cn(s.aTitulo, "flex items-center gap-2 text-[1.5rem] leading-none text-[#f5f5f5]")}>
            <Users size={18} strokeWidth={1.75} aria-hidden="true" className="-mt-1 text-[#8b9099]" /> Na fila
          </h3>
          <span className="text-sm font-semibold text-[#c9ccd1]">
            <span className={s.aNumero}>{fila.queue.length}</span> esperando
          </span>
        </div>
        {fila5.length === 0 ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#c9ccd1]">Fila vazia. Quem garantir a vaga agora é o próximo.</p>
        ) : (
          <ol className="mt-3 divide-y divide-white/[0.06]">
            {fila5.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className={cn(s.aNumero, "w-6 text-right text-lg text-[#c8aa6e]")}>{p.position}</span>
                <Rosto url={p.avatarUrl} nome={p.name} className="size-8 rounded-[2px]" />
                <span className="min-w-0 flex-1 truncate font-semibold text-[#e8e8e8]">{p.name}</span>
                <span className="text-sm text-[#a7abb3]">{quandoJoga(p.matchesUntilTurn)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
        <span className="flex items-center gap-3">
          <ImmortalMedal rankTier={rankTier} rank={rank} size={46} />
          <span className="text-sm leading-snug text-[#c9ccd1]">
            <strong className="text-[#f5f5f5]">PPA</strong>, Imortal <span className={cn(s.aNumero, "text-[#c8aa6e]")}>#{rank?.toLocaleString("pt-BR")}</span>
            <br />
            no ranking da Valve
          </span>
        </span>
        <span className="text-sm font-semibold text-[#00c466]">
          <span className={s.aNumero}>{vagasAbertas(fila)}</span> vagas abertas
        </span>
      </div>
    </section>
  );
}

export function VersaoA({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  return (
    <div className={cn(s.verA, "relative")}>
      <div className="pointer-events-none absolute inset-0 h-screen overflow-hidden" aria-hidden="true">
        <div className="h-full w-full bg-cover bg-center opacity-90" style={{ backgroundImage: `url(${MONTAGEM})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0f] via-[#0b0c0f]/85 to-[#0b0c0f]/70" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_70%_at_25%_100%,rgba(196,33,33,0.22),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b0c0f] to-transparent" />
      </div>
      <Barra />
      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1240px] grid-cols-12 items-center gap-10 px-8 py-12">
        <div className={cn(s.entra, "col-span-7 space-y-7")}>
          <h1 className={cn(s.aTitulo, "text-[6.6rem] leading-[0.84] text-[#f5f5f5]")}>
            {TITULO(sit).replace(" PPA", " PPA")}
          </h1>
          <p className="max-w-[34rem] text-[1.25rem] font-medium leading-relaxed text-[#d4d6da]">{SUBTITULO}</p>
          <div className="flex items-end gap-4">
            <span className="flex items-start text-[#c8aa6e]">
              <span className={cn(s.aNumero, "mt-2 text-2xl")}>R$</span>
              <span className={cn(s.aNumero, "text-[5rem] leading-[0.8]")}>{reais(fila.offer?.priceCents)}</span>
            </span>
            <span className="pb-1 text-[0.9375rem] font-semibold leading-snug text-[#c9ccd1]">
              vaga do dia
              <br />
              vale a live inteira
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/party" className={cn(s.aPrimario, s.saida)}>
              Garantir minha vaga <ArrowRight size={20} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <a href="#como-funciona" className={cn(s.aFantasma, s.saida)}>
              Como funciona <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm font-medium text-[#a7abb3]">{MICROTEXTO}</p>
        </div>
        <div className="col-span-5">
          <Lobby fila={fila} rank={rank} rankTier={rankTier} />
        </div>
      </section>
      <SegundaTela versao="a" passos={PASSOS} />
    </div>
  );
}
