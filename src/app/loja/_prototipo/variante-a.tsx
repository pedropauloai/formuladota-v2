// PROTÓTIPO (descartável). Versão A, "Arsenal": a vitrine como a loja do cliente do Dota.
// Banner em destaque com a vaga na party, dois destaques de hora marcada ao lado, faixa da
// credencial e a grade de itens com abas. Material pesado de cliente: placas, chanfros e brilho.

import Image from "next/image";
import { ArrowRight, CalendarClock, Check, Clapperboard, Headphones, Swords } from "lucide-react";
import { mdBullets } from "@/lib/loja/text";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BrandGlyph } from "@/components/loja/brand-glyph";
import { ItemArt } from "@/components/loja/item-art";
import type { StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import { LIVE_FRAME, MODE_LABEL, PPA, liveWhen, type VitrineDados } from "./dados";
import { Brasas, Medalha, PartyBar, Preco, m } from "./pecas";
import { AbasArsenal, type ItemAba } from "./abas-arsenal";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 md:px-8 2xl:max-w-[1440px]";

function ModeTag({ mode }: { mode: StoreProduct["mode"] }) {
  const live = mode === "live";
  const gold = mode === "agendado";
  return (
    <span className={cn(m.plate, m.tag, live && m.tagLive, gold && m.tagGold)}>
      {live && <span className={m.liveDot} aria-hidden="true" />}
      {MODE_LABEL[mode]}
    </span>
  );
}

function Destaque({ party, nextLive }: { party: StoreProduct; nextLive: VitrineDados["nextLive"] }) {
  return (
    <div className={m.liftGold}>
      <article className={cn(m.panel, m.panelShine, "[--cut:18px] grid grid-cols-[minmax(0,1fr)] md:min-h-[600px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]")}>
        {/* A live inteira ao fundo, como um banner da loja do cliente; a câmera do PPA fica à esquerda, livre do texto. */}
        <div className="relative aspect-video md:absolute md:inset-[2px] md:aspect-auto">
          <img
            src={LIVE_FRAME.src}
            srcSet={LIVE_FRAME.srcSet}
            sizes="(min-width: 1024px) 66vw, 100vw"
            alt={LIVE_FRAME.alt}
            width={LIVE_FRAME.width}
            height={LIVE_FRAME.height}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-left-bottom"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-bg-deep)_0%,transparent_30%)] md:bg-[linear-gradient(270deg,var(--color-bg-deep)_0%,color-mix(in_oklab,var(--color-bg-deep)_86%,transparent)_42%,transparent_72%)]"
          />
          <span className={cn(m.plate, m.tag, m.tagLive, "absolute left-5 top-5")}>
            <span className={m.liveDot} aria-hidden="true" />
            Na live
          </span>
        </div>
        <div className="relative flex flex-col justify-end gap-6 p-6 md:col-start-2 md:p-10">
          <Brasas />
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(m.plate, m.tag, m.tagGold)}>Em destaque</span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Vaga na party da live</span>
          </div>
          <div className="space-y-4">
            <h1 className="font-display-condensed text-[3.4rem] uppercase leading-[0.82] text-text-display md:text-[4.6rem] xl:text-[5.4rem]">
              Jogue com o Pedro na live
            </h1>
            <p className="max-w-[30rem] text-base leading-relaxed text-text-body md:text-lg">
              {party.summary}
            </p>
          </div>
          <PartyBar avatarUrl={PPA.avatar} size={52} />
          <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
            <Preco cents={party.fromPriceCents} unit={party.priceUnit} className="text-[3.6rem]" />
            <Link href={`/loja/${party.slug}`} className={cn(m.plate, m.cta, m.ctaLg, "w-full sm:w-auto")}>
              Garantir minha vaga
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <p className="text-sm text-text-muted">
            {nextLive ? `Próxima live com vaga: ${liveWhen(nextLive.startsAt)}. ` : ""}
            Pix ou cartão. Até 5 partidas por compra.
          </p>
        </div>
      </article>
    </div>
  );
}

function DestaqueLateral({ product, slots }: { product: StoreProduct; slots?: SlotInfo }) {
  return (
    <Link href={`/loja/${product.slug}`} className={cn(m.lift, "group block h-full focus-visible:outline-none")}>
      <article className={cn(m.panel, m.panelGold, "flex h-full flex-col gap-4 p-5 md:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <span className="grid place-items-center rounded-sm bg-bg-deep p-2 shadow-[inset_0_0_0_1px_var(--color-border-gold),0_0_16px_var(--fd-raw-gold-glow-soft)]">
            <ItemArt art={product.art} size="sm" className="border-0" />
          </span>
          <ModeTag mode={product.mode} />
        </div>
        <div className="space-y-2.5">
          <h2 className="font-display-condensed text-[2rem] uppercase leading-[0.9] text-text-display">{product.title}</h2>
          <ul className="space-y-1.5">
            {mdBullets(product.descriptionMd)
              .slice(0, 3)
              .map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-snug text-text-body">
                  <Check size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
          </ul>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="space-y-2">
            <Preco cents={product.fromPriceCents} className="text-[2.6rem]" />
            {slots && <Pips slots={slots} />}
          </div>
          <span className={cn(m.plate, m.ctaGhost, "group-hover:text-text-display")}>
            Reservar
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        </div>
      </article>
    </Link>
  );
}

function Pips({ slots }: { slots: SlotInfo }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.min(slots.capacity, 12) }, (_, i) => (
          <span key={i} className={cn("size-2 rotate-45", i < slots.left ? "bg-gold shadow-[0_0_6px_var(--color-gold)]" : "bg-border-strong")} />
        ))}
      </span>
      <span className="text-xs text-text-muted">
        {slots.left > 0 ? `${slots.left} de ${slots.capacity} vagas no mês` : "Esgotado este mês"}
      </span>
    </span>
  );
}

function Credencial({ proof }: { proof: NonNullable<VitrineDados["proof"]> }) {
  const stats = [
    ["+15 anos", "de Dota"],
    ["+30 mil", "horas jogadas"],
    ["+5.000", "partidas de Tinker"],
    ["65%", "de vitórias"],
    ["14 mil", "inscritos"],
  ];
  return (
    <div className={m.lift}>
      <section aria-label="Credencial do Pedro" className={cn(m.panel, "grid items-center gap-5 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 md:px-6")}>
        <div className="flex items-center gap-4">
          <Image src={PPA.avatarGrande} alt={`Retrato do ${PPA.nick}`} width={512} height={512} className="size-20 rounded-sm object-cover shadow-[0_0_0_1px_var(--color-gold),0_0_16px_var(--fd-raw-gold-glow)]" />
          <div>
            <p className="font-display-condensed text-[1.9rem] leading-none text-text-display">{PPA.nick}</p>
            {proof.leaderboardRank !== null && (
              <p className="mt-1 font-display-condensed text-2xl leading-none text-gold">#{proof.leaderboardRank.toLocaleString("pt-BR")} Imortal</p>
            )}
            <p className="mt-1 text-xs text-text-muted">Profissional de Tinker e criador do FORMULADOTA</p>
          </div>
          <Medalha rankTier={proof.rankTier} rank={proof.leaderboardRank} size={84} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(([value, label]) => (
            <div key={label} className="border-l-2 border-border-strong pl-3">
              <dt className="sr-only">{label}</dt>
              <dd className="flex items-center gap-1.5 font-display-condensed text-[1.75rem] leading-none text-text-display">
                {label === "inscritos" && <BrandGlyph brand="youtube" size={16} />}
                {value}
              </dd>
              <dd className="mt-1 text-xs text-text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

const MODE_ICON: Record<StoreProduct["mode"], React.ReactNode> = {
  live: <Swords size={14} aria-hidden="true" />,
  agendado: <CalendarClock size={14} aria-hidden="true" />,
  fora_da_live: <Headphones size={14} aria-hidden="true" />,
  gravado: <Clapperboard size={14} aria-hidden="true" />,
  digital: <Clapperboard size={14} aria-hidden="true" />,
};

function ItemTile({ product, slots }: { product: StoreProduct; slots?: SlotInfo }) {
  const glow =
    product.mode === "live"
      ? "var(--color-brand-primary-glow)"
      : product.mode === "agendado"
        ? "var(--fd-raw-gold-glow)"
        : "color-mix(in oklab, var(--color-text-display) 10%, transparent)";
  return (
    <Link href={`/loja/${product.slug}`} className={cn(m.lift, "group block h-full focus-visible:outline-none")}>
      <article className={cn(m.panel, "flex h-full flex-col transition-transform duration-200 motion-safe:group-hover:-translate-y-1")}>
        <div
          className="relative grid h-36 place-items-center border-b border-border-subtle"
          style={{ background: `radial-gradient(60% 75% at 50% 55%, ${glow}, transparent 75%)` }}
        >
          <span className="grid place-items-center rounded-sm bg-bg-deep/80 p-2 shadow-[inset_0_0_0_1px_var(--color-border-strong)] transition-shadow duration-200 group-hover:shadow-[inset_0_0_0_1px_var(--color-gold),0_0_18px_var(--fd-raw-gold-glow)]">
            <ItemArt art={product.art} size="sm" className="border-0" />
          </span>
          <span className="absolute left-3 top-3 text-text-muted">{MODE_ICON[product.mode]}</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <ModeTag mode={product.mode} />
          <h3 className="font-display-condensed text-[1.6rem] uppercase leading-[0.9] text-text-display">{product.title}</h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{product.summary}</p>
          {slots && <Pips slots={slots} />}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <Preco cents={product.fromPriceCents} unit={product.priceUnit} className="text-[2rem]" />
            <span className={cn(m.plate, m.ctaGhost, "min-h-8 px-3 text-[0.7rem] group-hover:text-text-display")}>
              Comprar
              <ArrowRight size={13} aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function grupo(mode: StoreProduct["mode"]): ItemAba["group"] {
  if (mode === "live") return "live";
  if (mode === "agendado") return "agendado";
  return "fora";
}

export function VarianteA({ data }: { data: VitrineDados }) {
  const { products, slots, proof, party, nextLive } = data;
  const lateral = products.filter((p) => p.mode === "agendado").slice(0, 2);
  const itens: ItemAba[] = products.map((p) => ({
    key: p.id,
    group: grupo(p.mode),
    node: <ItemTile product={p} slots={slots[p.id]} />,
  }));
  return (
    <div className={cn(m.root, "relative pb-24")}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_60%_at_30%_0%,var(--color-brand-primary-glow),transparent_70%)] opacity-70" />
      <div className={cn(WRAP, "relative space-y-6 pt-6 md:pt-10")}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] 2xl:gap-5">
          {party && <Destaque party={party} nextLive={nextLive} />}
          <div className="grid gap-4 2xl:gap-5">
            {lateral.map((p) => (
              <DestaqueLateral key={p.id} product={p} slots={slots[p.id]} />
            ))}
          </div>
        </div>
        {proof && <Credencial proof={proof} />}
      </div>

      <div className={cn(WRAP, "relative mt-14 space-y-6")}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display-condensed text-[2.6rem] uppercase leading-none text-text-display md:text-[3.2rem]">Arsenal do Pedro</h2>
            <p className="mt-1 text-sm text-text-muted">Tudo que dá para comprar, do jogo na live à mentoria.</p>
          </div>
        </header>
        <AbasArsenal itens={itens} />
      </div>

      <div className={cn(WRAP, "relative mt-14")}>
        <div className={m.lift}>
          <section className={cn(m.panel, "flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6")}>
            <div className="flex items-center gap-4">
              <BrandGlyph brand="youtube" size={34} />
              <div>
                <h2 className="font-display-condensed text-[1.9rem] uppercase leading-none text-text-display">Comece grátis</h2>
                <p className="mt-1 text-sm text-text-muted">A Fórmula do MMR, o método do Pedro para subir de MMR, está aberta no canal em 14 vídeos.</p>
              </div>
            </div>
            <a href="https://www.youtube.com/@formuladota" target="_blank" rel="noopener noreferrer" className={cn(m.plate, m.ctaGhost)}>
              Assistir no YouTube
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

export const NOME_A = "Arsenal (loja do cliente)";
