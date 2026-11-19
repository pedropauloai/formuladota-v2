// PROTÓTIPO (descartável). Versão C, "Evento": a loja como a página de evento do cliente (título
// grande que brilha, o marcador hexagonal ao lado, a arte do herói no centro e os marcadores
// numerados embaixo). Os serviços viram uma trilha, do mais leve ao mais completo, pelo preço.

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BrandGlyph } from "@/components/loja/brand-glyph";
import { ItemArt } from "@/components/loja/item-art";
import { heroRender } from "@/components/frontier/assets";
import type { StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import { liveWhen, MODE_LABEL, PPA, type VitrineDados } from "./dados";
import { Brasas, Medalha, PartyBar, Preco, m } from "./pecas";

const WRAP = "mx-auto w-full max-w-[1320px] px-4 md:px-8 2xl:max-w-[1500px]";

const CHIPS = [
  ["15", "anos de Dota"],
  ["30k", "horas jogadas"],
  ["5k", "partidas de Tinker"],
  ["65%", "de vitórias"],
] as const;

function Hex({ children, size = 64, className }: { children: React.ReactNode; size?: number; className?: string }) {
  return (
    <span className={cn(m.hex, "shrink-0", className)} style={{ width: size }}>
      <span className={m.hexFace}>{children}</span>
    </span>
  );
}

function Hero({ data }: { data: VitrineDados }) {
  const { proof, party, nextLive } = data;
  return (
    <section className="relative isolate overflow-hidden border-b border-border-subtle">
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_50%_70%,color-mix(in_oklab,var(--color-brand-primary)_32%,transparent),transparent_70%),radial-gradient(40%_40%_at_50%_10%,var(--fd-raw-gold-glow-soft),transparent_70%),linear-gradient(180deg,var(--color-bg-base),var(--color-bg-deep))]"
      />
      <Image
        src={heroRender("tinker")}
        alt=""
        width={1440}
        height={1440}
        priority
        className="pointer-events-none absolute bottom-[-4%] left-1/2 -z-10 h-[70%] w-auto max-w-none -translate-x-1/2 select-none object-contain opacity-30 [mask-image:linear-gradient(to_top,transparent_0%,black_35%)] md:h-[92%] md:opacity-40"
      />
      {/* Sombra no centro: o texto e a party ficam legíveis por cima do Tinker. */}
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(38%_34%_at_50%_62%,color-mix(in_oklab,var(--color-bg-deep)_80%,transparent),transparent_100%)]" />
      <Brasas />
      <div className={cn(WRAP, "relative flex min-h-[640px] flex-col items-center justify-between gap-10 py-10 text-center md:min-h-[760px] md:py-14")}>
        <div className="flex flex-col items-center gap-5 md:flex-row md:gap-8">
          {/* Como o retrato redondo ao lado do título dos eventos do cliente, mas quadrado (avatar do site). */}
          <figure className="flex flex-col items-center gap-2">
            <span className={cn(m.liftGold)}>
              <span className={cn(m.panel, m.panelGold, "block size-28 p-[3px] [--cut:14px] md:size-40")}>
                <Image src={PPA.avatarGrande} alt={`Retrato do ${PPA.nick}`} width={512} height={512} className="size-full object-cover [clip-path:polygon(11px_0,100%_0,100%_calc(100%-11px),calc(100%-11px)_100%,0_100%,0_11px)]" />
              </span>
            </span>
            <figcaption className="font-display-condensed text-2xl leading-none text-gold md:text-3xl">{PPA.nick}</figcaption>
          </figure>
          <h1 className="font-display-condensed text-[4.2rem] uppercase leading-[0.8] text-text-display [text-shadow:0_0_28px_var(--color-brand-primary-glow),0_4px_24px_var(--color-bg-deep)] md:text-[7.5rem]">
            Jogue com
            <br />
            um Imortal
          </h1>
          {proof && (
            <Hex size={128} className="md:[width:150px]">
              <Medalha rankTier={proof.rankTier} rank={proof.leaderboardRank} size={104} />
            </Hex>
          )}
        </div>

        <div className="flex flex-col items-center gap-6">
          <p className="max-w-[36rem] text-base leading-relaxed text-text-body drop-shadow-[0_2px_10px_var(--color-bg-deep)] md:text-lg">
            Na party da live, na mentoria ou numa partida particular: o Pedro, profissional de Tinker, no seu time.
          </p>
          {party && (
            <>
              <PartyBar avatarUrl={PPA.avatar} size={54} />
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
                <Link href={`/loja/${party.slug}`} className={cn(m.plate, m.cta, m.ctaLg, "w-full sm:w-auto")}>
                  Garantir minha vaga
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
                <Preco cents={party.fromPriceCents} unit={party.priceUnit} className="text-[3rem]" />
              </div>
              <p className="text-sm text-gold-bright">
                {nextLive ? `Próxima live com vaga: ${liveWhen(nextLive.startsAt)}` : "Vaga na party da live: você joga no mesmo time do Pedro"}
              </p>
            </>
          )}
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-4" aria-label="A carreira do Pedro">
            {CHIPS.map(([value, label]) => (
              <li key={label} className="flex flex-col items-center gap-1.5">
                <Hex size={52}>
                  <span className="font-display-condensed text-xl leading-none text-gold-cream">{value}</span>
                </Hex>
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-text-muted">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Passo({ product, slots, index }: { product: StoreProduct; slots?: SlotInfo; index: number }) {
  const [, numero] = (product.fromPriceCents / 100).toFixed(0).match(/(\d+)/) ?? [];
  return (
    <li className="relative flex flex-col items-center gap-4">
      <Hex size={72} className={cn("relative z-10", index === 0 && "drop-shadow-[0_0_16px_var(--color-play-primary-glow)]")}>
        <span className="flex flex-col items-center leading-none">
          <span className="text-[0.6rem] font-bold text-gold-muted">R$</span>
          <span className="font-display-condensed text-[1.6rem] text-gold-cream">{numero}</span>
        </span>
      </Hex>
      <Link href={`/loja/${product.slug}`} className={cn(m.lift, "group block w-full flex-1 focus-visible:outline-none")}>
        <article className={cn(m.panel, index === 0 ? m.panelShine : m.panelGold, "flex h-full flex-col items-center gap-3 p-4 text-center transition-transform duration-200 motion-safe:group-hover:-translate-y-1")}>
          <span className="grid place-items-center rounded-sm bg-bg-deep p-1.5 shadow-[inset_0_0_0_1px_var(--color-border-strong)]">
            <ItemArt art={product.art} size="sm" className="border-0" />
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-muted">{MODE_LABEL[product.mode]}</span>
          <h3 className="font-display-condensed text-[1.5rem] uppercase leading-[0.9] text-text-display">{product.title}</h3>
          <p className="line-clamp-3 text-xs leading-relaxed text-text-muted">{product.summary}</p>
          {slots && <p className="text-xs text-gold">{slots.left > 0 ? `${slots.left} de ${slots.capacity} vagas no mês` : "Esgotado este mês"}</p>}
          <span className="mt-auto inline-flex items-center gap-1 pt-1 font-display text-[0.7rem] font-bold uppercase tracking-[0.16em] text-text-body group-hover:text-text-display">
            {index === 0 ? "Garantir vaga" : "Ver"}
            <ArrowRight size={13} aria-hidden="true" />
          </span>
        </article>
      </Link>
    </li>
  );
}

export function VarianteC({ data }: { data: VitrineDados }) {
  const { products, slots } = data;
  const trilha = products.filter((p) => !p.mmrTiers).sort((a, b) => a.fromPriceCents - b.fromPriceCents);
  const boost = products.find((p) => p.mmrTiers);
  return (
    <div className={cn(m.root, "relative pb-24")}>
      <Hero data={data} />

      <section className={cn(WRAP, "relative mt-14 space-y-8")}>
        <header className="text-center">
          <h2 className="font-display-condensed text-[2.8rem] uppercase leading-none text-text-display md:text-[3.6rem]">A trilha</h2>
          <p className="mt-2 text-sm text-text-muted">Do jogo na live ao acompanhamento de 30 dias. O preço sobe junto com o tempo do Pedro com você.</p>
        </header>
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute left-[8%] right-[8%] top-9 hidden h-[2px] bg-[linear-gradient(90deg,var(--color-play-primary),var(--color-gold)_30%,var(--color-gold-muted))] shadow-[0_0_10px_var(--fd-raw-gold-glow)] xl:block"
          />
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4 2xl:gap-5">
            {trilha.map((p, i) => (
              <Passo key={p.id} product={p} slots={slots[p.id]} index={i} />
            ))}
          </ol>
        </div>
      </section>

      {boost && (
        <section className={cn(WRAP, "relative mt-14")}>
          <Link href={`/loja/${boost.slug}`} className={cn(m.lift, "group block focus-visible:outline-none")}>
            <article className={cn(m.panel, "grid items-center gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-8 md:p-8")}>
              <ItemArt art={boost.art} size="lg" />
              <div className="space-y-1.5">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-muted">{MODE_LABEL[boost.mode]}</span>
                <h2 className="font-display-condensed text-[2.4rem] uppercase leading-none text-text-display">{boost.title}</h2>
                <p className="text-sm text-text-muted">{boost.summary}</p>
              </div>
              <div className="flex items-center gap-5">
                <Preco cents={boost.fromPriceCents} unit={boost.priceUnit} className="text-[2.6rem]" />
                <span className={cn(m.plate, m.ctaGhost, "group-hover:text-text-display")}>
                  Calcular
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </article>
          </Link>
        </section>
      )}

      <section className={cn(WRAP, "relative mt-10 flex flex-wrap items-center justify-center gap-4 text-center")}>
        <BrandGlyph brand="youtube" size={22} />
        <p className="text-sm text-text-muted">A Fórmula do MMR, o método do Pedro, está aberta no canal em 14 vídeos.</p>
        <a href="https://www.youtube.com/@formuladota" target="_blank" rel="noopener noreferrer" className={cn(m.plate, m.ctaGhost)}>
          Assistir grátis
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}

export const NOME_C = "Evento (trilha de serviços)";
