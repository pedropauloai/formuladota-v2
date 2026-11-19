// Catálogo vivo do design 2.0: cada peça como o site usa, para o Pedro conferir de olho e para
// quem for construir uma tela nova copiar daqui. Aparece em /admin/design (no ar, só admin).

import type { ReactNode } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Embers, HexBadge, LiveDot, Panel, Price } from "./pieces";
import { ImmortalMedal } from "./immortal-medal";
import { PartyLineup } from "./party-lineup";
import { lift, panel, plate, v2Page } from "./plate";

const PPA = { avatarUrl: "/loja/ppa-avatar-256.webp", label: "PPA" };

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border-subtle pt-8">
      <header>
        <h2 className="font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-text-muted">{text}</p>
      </header>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return <code className="rounded-sm bg-bg-deep px-1.5 py-0.5 font-mono text-xs text-gold-bright">{children}</code>;
}

function Plates() {
  return (
    <Section title="Botões e etiquetas" text="Botão levemente arredondado. O verde compra ou entra, com um feixe de luz na borda e linhas de velocidade no mouse; o vermelho é a marca; o metal leva a detalhes. A etiqueta mantém a placa inclinada da barra superior.">
      <div className="flex flex-wrap items-center gap-6">
        <a href="#placas" className={plate({ kind: "cta", large: true })}>
          Garantir minha vaga
          <ArrowRight size={20} aria-hidden="true" />
        </a>
        <a href="#placas" className={plate({ kind: "cta" })}>Comprar</a>
        <a href="#placas" className={plate({ kind: "brand" })}>Entrar</a>
        <a href="#placas" className={plate({ kind: "ghost" })}>
          Ver detalhes
          <ArrowRight size={14} aria-hidden="true" />
        </a>
        <a href="#placas" className={plate({ kind: "ghost", small: true })}>Comprar</a>
        <button type="button" disabled className={plate({ kind: "cta" })}>Esgotado</button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className={plate({ kind: "tag" })}>Fora da live</span>
        <span className={plate({ kind: "tag", tone: "live" })}>
          <LiveDot />
          Na live
        </span>
        <span className={plate({ kind: "tag", tone: "gold" })}>Em destaque</span>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Exemplo de abas">
        <button type="button" aria-pressed="true" className={plate({ kind: "tab" })}>Todos</button>
        <button type="button" aria-pressed="false" className={plate({ kind: "tab" })}>Na live</button>
        <button type="button" aria-pressed="false" className={plate({ kind: "tab" })}>Hora marcada</button>
      </div>
      <p className="text-xs text-text-muted">
        <Code>{'plate({ kind: "cta", large: true })'}</Code> em Link, a ou button. Tipos: cta, brand, ghost, tag (tone neutral, live, gold) e tab (aria-pressed ou aria-current).
      </p>
    </Section>
  );
}

function Panels() {
  const tones = [
    ["neutral", "Neutro", "Conteúdo comum: cartão de produto, lista, formulário."],
    ["gold", "Dourado", "Tempo contado do PPA, assinatura, o que vale mais."],
    ["live", "Ao vivo", "Moldura da live e do que acontece na transmissão."],
    ["shine", "Destaque", "Um por tela: o produto principal, com o brilho que corre a aresta."],
  ] as const;
  return (
    <Section title="Painéis" text="Painel reto de metal, aresta clara no alto e sombra no invólucro (lift). Nada é recortado: brilho, sombra e conteúdo aparecem inteiros.">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tones.map(([tone, title, text]) => (
          <Panel key={tone} tone={tone} shadow={tone === "gold" || tone === "shine" ? "gold" : "dark"} className="h-full p-5">
            <p className="font-display-condensed text-2xl uppercase leading-none text-text-display">{title}</p>
            <p className="mt-2 text-sm text-text-muted">{text}</p>
            <p className="mt-3 text-xs text-text-faded">tone=&quot;{tone}&quot;</p>
          </Panel>
        ))}
      </div>
      <div className={cn(lift("dark"), "max-w-md")}>
        <div className={cn(panel("neutral"), "relative h-32 overflow-hidden p-5")}>
          <Embers />
          <p className="relative font-display-condensed text-2xl uppercase text-text-display">Brasas</p>
          <p className="relative text-sm text-text-muted">As fagulhas do logo, para a primeira dobra. Somem com menos movimento.</p>
        </div>
      </div>
    </Section>
  );
}

function Values() {
  return (
    <Section title="Preço, party e medalha" text="O preço em ouro do jogo, a party como a barra de grupo do cliente (o lugar verde é a vaga que a compra preenche) e a medalha com a posição impressa.">
      <div className="flex flex-wrap items-end gap-10">
        <Price cents={2500} unit="por partida" className="text-[3.6rem]" />
        <Price cents={24700} className="text-[2.6rem]" />
        <Price cents={89700} className="text-[2rem]" />
      </div>
      <div className="flex flex-wrap items-end gap-10">
        <PartyLineup owner={PPA} youLabel="Você" openLabel="Vaga" ariaLabel="Party do PeterPPA: ele e quatro vagas" size={64} />
        <PartyLineup owner={PPA} youLabel="Você" openLabel="Vaga" ariaLabel="Party do PeterPPA: ele e quatro vagas" size={44} labels={false} />
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <ImmortalMedal rankTier={80} rank={3496} size={120} />
        <ImmortalMedal rankTier={80} rank={42} size={84} />
        <HexBadge size={110}>
          <ImmortalMedal rankTier={80} rank={3496} size={88} />
        </HexBadge>
        <HexBadge size={64}>
          <span className="font-display-condensed text-2xl leading-none text-gold-cream">25</span>
        </HexBadge>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Menos" className={cn(plate({ kind: "ghost" }), "size-11 px-0")}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <output className="min-w-10 text-center font-display-condensed text-[2.4rem] leading-none text-text-display">1</output>
        <button type="button" aria-label="Mais" className={cn(plate({ kind: "ghost" }), "size-11 px-0")}>
          <Plus size={16} aria-hidden="true" />
        </button>
        <span className="text-xs text-text-muted">Seletor de quantidade com as placas de metal.</span>
      </div>
    </Section>
  );
}

export function V2Catalog() {
  return (
    <div className={cn(v2Page, "space-y-10 p-6 md:p-10")}>
      <header className="space-y-2">
        <h1 className="font-display-condensed text-[3.4rem] uppercase leading-none text-text-display">Design 2.0</h1>
        <p className="max-w-3xl text-sm text-text-muted">
          A pele do cliente do Dota, a mesma da barra superior, para todo o site. Código em <Code>src/components/v2</Code>; cor só pelos tokens. Em tela de 1440 de altura a página cresce 1,33x (envolva com <Code>v2Page</Code>).
        </p>
      </header>
      <Plates />
      <Panels />
      <Values />
    </div>
  );
}
