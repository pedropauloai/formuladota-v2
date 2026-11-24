// PROTÓTIPO descartável (home-previa), versão B "Arena": tudo o que é botão, aba, etiqueta e rosto vira
// placa inclinada no mesmo ângulo (-12 graus); caixas retas de canto vivo. Uma família só, a Saira
// (estreita nos títulos e números, larga no texto). O quadro real da live é o fundo do cartaz, e a
// fila aparece como o placar de uma transmissão.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronsRight } from "lucide-react";
import type { PublicQueue } from "@/lib/loja/fila/model";
import { LIVE_FRAME } from "@/lib/loja/owner";
import { ImmortalMedal } from "@/components/v2";
import { cn } from "@/lib/utils";
import { ABAS, Logo, Rosto, RostoDoPPA, lugaresDaParty, vagasAbertas } from "./comum";
import { MICROTEXTO, PASSOS, SUBTITULO, TITULO, reais, situacao } from "./dados";
import { SegundaTela } from "./segunda-tela";
import s from "./previa.module.css";

function Barra() {
  return (
    <header className={cn(s.bBarra, "relative z-10 flex h-16 items-center gap-2 px-7")}>
      <Link href="/" className="mr-6 flex items-center" aria-label="FORMULADOTA, início">
        <Logo className="h-8 w-auto" />
      </Link>
      <nav className="flex items-center gap-1.5" aria-label="Seções">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} className={cn(s.bPlaca, s.bAba, s.saida)}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-5">
        <span className="flex items-center gap-2 text-sm font-medium text-[#a7abb3]">
          <span className="size-2 rounded-full bg-[#00c466]" aria-hidden="true" /> 1 online
        </span>
        <Link href="/codigo-de-conduta" className={cn(s.bPlaca, s.bAba, s.saida)}>
          Conduta
        </Link>
        <button type="button" className={cn(s.bPlaca, s.bSecundario, s.saida)}>
          Entrar
        </button>
      </div>
    </header>
  );
}

function Placar({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  const celulas = [
    { rotulo: "Na fila", valor: String(fila.queue.length) },
    { rotulo: "Vagas abertas", valor: String(vagasAbertas(fila)) },
  ];
  return (
    <div className={cn(s.entra2, "flex items-stretch justify-center gap-2")}>
      <div className={cn(s.bPlaca, s.bCelula, sit.tipo === "aovivo" && s.bCelulaViva)}>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Live</span>
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          {sit.tipo === "aovivo" && <span className={s.aoVivo} aria-hidden="true" />}
          {sit.rotulo}
        </span>
      </div>
      {celulas.map((c) => (
        <div key={c.rotulo} className={cn(s.bPlaca, s.bCelula)}>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a7abb3]">{c.rotulo}</span>
          <span className={cn(s.bNumero, "text-[1.75rem] leading-none text-[#f5f5f5]")}>{c.valor}</span>
        </div>
      ))}
      <div className={cn(s.bPlaca, s.bCelula, s.bCelulaLinha)}>
        <ImmortalMedal rankTier={rankTier} rank={rank} size={44} />
        <span className="text-sm font-semibold leading-tight text-[#e8e8e8]">
          PPA
          <br />
          <span className={cn(s.bNumero, "text-base text-[#c8aa6e]")}>Imortal #{rank?.toLocaleString("pt-BR") ?? ""}</span>
        </span>
      </div>
    </div>
  );
}

function Party({ fila }: { fila: PublicQueue }) {
  const lugares = lugaresDaParty(fila);
  return (
    <ol className="flex items-end justify-center gap-4" aria-label="Party da live">
      {lugares.map((l, i) => (
        <li key={i} className="flex flex-col items-center gap-2">
          <span className={cn(s.bPlaca, s.bAvatar, l.tipo === "dono" && s.bAvatarDono, l.tipo === "livre" && l.primeiro && s.bAvatarSeu)}>
            <span className={cn(s.bRecorte, "absolute inset-[3px] grid place-items-center overflow-hidden")}>
              {l.tipo === "dono" && <RostoDoPPA className="size-full object-cover" />}
              {l.tipo === "membro" && <Rosto url={l.pessoa.avatarUrl} nome={l.pessoa.name} className="size-full" />}
              {l.tipo === "livre" && <span className={cn("text-3xl font-light", l.primeiro ? "text-[#ff6b6b]" : "text-white/30")}>+</span>}
            </span>
          </span>
          <span className={cn("max-w-[5.5rem] truncate text-xs font-bold uppercase tracking-[0.14em]", l.tipo === "dono" ? "text-[#c8aa6e]" : l.tipo === "livre" && l.primeiro ? "text-[#ff6b6b]" : "text-[#8b9099]")}>
            {l.tipo === "dono" ? "PPA" : l.tipo === "membro" ? l.pessoa.name : l.primeiro ? "Sua vaga" : "Vaga"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function VersaoB({ fila, rank, rankTier }: { fila: PublicQueue; rank: number | null; rankTier: number | null }) {
  const sit = situacao(fila);
  return (
    <div className={cn(s.verB, "relative")}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen overflow-hidden" aria-hidden="true">
        <Image src={LIVE_FRAME.src} alt="" fill priority sizes="100vw" className="object-cover object-center opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_42%,rgba(11,12,15,0.5),rgba(11,12,15,0.9))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0c0f] via-[#0b0c0f]/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#c42121]/60" />
      </div>
      <Barra />
      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] flex-col items-center justify-center gap-9 px-8 py-12 text-center">
        <div className={cn(s.entra, "space-y-6")}>
          <h1 className={cn(s.bTitulo, "text-[8.5rem] leading-[0.82] text-[#f5f5f5] [text-shadow:0_6px_40px_rgba(0,0,0,0.6)]")}>
            {TITULO(sit).split(" na ")[0]}
          </h1>
          <p className="mx-auto max-w-[46rem] text-[1.3rem] font-medium leading-relaxed text-[#d4d6da]">{SUBTITULO}</p>
        </div>
        <Party fila={fila} />
        <div className={cn(s.entra2, "flex flex-col items-center gap-4")}>
          <div className="flex items-center gap-3">
            <span className={cn(s.bPlaca, s.bPreco)}>
              <span className={cn(s.bNumero, "text-lg")}>R$</span>
              <span className={cn(s.bNumero, "text-[2.4rem] leading-none")}>{reais(fila.offer?.priceCents)}</span>
            </span>
            <Link href="/party" className={cn(s.bPlaca, s.bPrimario, s.saida)}>
              Garantir minha vaga <ArrowRight size={20} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
          <p className="text-sm font-medium text-[#a7abb3]">{MICROTEXTO}</p>
          <a href="#como-funciona" className={cn(s.bFantasma, s.saida)}>
            Como funciona <ChevronsRight size={18} aria-hidden="true" />
          </a>
        </div>
        <Placar fila={fila} rank={rank} rankTier={rankTier} />
      </section>
      <SegundaTela versao="b" passos={PASSOS} />
    </div>
  );
}
