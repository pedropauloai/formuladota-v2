// PROTÓTIPO (descartável). Versão B, "Ao vivo": a live na primeira dobra. O palco 16:9 com o quadro
// real da live e a party por cima, o painel de compra no lugar da coluna direita do cliente, e o
// resto da loja como uma programação em linhas (densa como a lista de amigos), sem grade de cartões.

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BrandGlyph } from "@/components/loja/brand-glyph";
import { ItemArt } from "@/components/loja/item-art";
import type { StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import { LIVE_FRAME, PPA, liveWhen, type VitrineDados } from "./dados";
import { Brasas, Medalha, PartyBar, Preco, m } from "./pecas";
import { CompraB } from "./compra-b";
import { TwitchLive } from "@/components/v2/twitch-live";
import { LiveDot } from "@/components/v2/pieces";

const WRAP = "mx-auto w-full max-w-[1320px] px-4 md:px-8 2xl:max-w-[1500px]";

function SeloDoPalco({ nextLive }: { nextLive: VitrineDados["nextLive"] }) {
  // Fora do ar: quando é a próxima live. No ar, o próprio player da Twitch mostra o AO VIVO.
  return (
    <div className="absolute inset-x-0 top-0 flex items-start p-3 sm:p-5 [[data-twitch-live=true]_&]:hidden">
      <span className={cn(m.plate, m.tag, m.tagLive, "min-h-7 px-3 text-[0.75rem]")}>
        <BrandGlyph brand="twitch" size={14} className="[&_path]:fill-current" />
        {nextLive ? `Próxima live: ${liveWhen(nextLive.startsAt)}` : "A live passa aqui quando o PPA está no ar"}
      </span>
    </div>
  );
}

function Palco({ data }: { data: VitrineDados }) {
  const { proof, nextLive, twitchChannel } = data;
  return (
    <div className={m.lift}>
      {/* Sem chanfrado no palco (pedido do Pedro): tela reta, com a borda vermelha de ao vivo. */}
      <div className={cn(m.panel, m.panelLive, "[--cut:0px] aspect-[16/10] w-full sm:aspect-video")}>
        <TwitchLive channel={twitchChannel} title="Live do FORMULADOTA na Twitch" className="absolute inset-[2px]" overlay={<SeloDoPalco nextLive={nextLive} />}>
          <img
            src={LIVE_FRAME.src}
            srcSet={LIVE_FRAME.srcSet}
            sizes="(min-width: 1024px) 70vw, 100vw"
            alt={LIVE_FRAME.alt}
            width={LIVE_FRAME.width}
            height={LIVE_FRAME.height}
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-bg-deep)_65%,transparent)_0%,transparent_22%)]" />
        </TwitchLive>
      </div>
      {/* Faixa de baixo do palco, como a barra de grupo do cliente: o PPA e as vagas da party. */}
      <div className={cn(m.panel, "[--cut:0px] -mt-px flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-4 sm:px-6")}>
        <Brasas count={5} />
        <div className="flex items-center gap-4">
          <div>
            <p className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary [[data-twitch-live=true]_&]:flex">
              <LiveDot />
              Ao vivo agora
            </p>
            <p className="font-display-condensed text-[2rem] uppercase leading-none text-text-display md:text-[2.4rem]">Party da live</p>
            <p className="mt-1 text-xs text-text-muted">{PPA.nick} e quatro vagas. Uma é sua.</p>
          </div>
        </div>
        <PartyBar avatarUrl={PPA.avatar} size={52} />
        {proof && (
          <div className="hidden items-center gap-3 xl:flex">
            <Medalha rankTier={proof.rankTier} rank={proof.leaderboardRank} size={64} />
            <div>
              <p className="font-display-condensed text-2xl leading-none text-gold">#{proof.leaderboardRank?.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-text-muted">Imortal no ranking da Valve</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Linha({ product, slots }: { product: StoreProduct; slots?: SlotInfo }) {
  return (
    <li>
      <Link
        href={`/loja/${product.slug}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border-subtle px-2 py-4 transition-colors duration-150 hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-gold)_8%,transparent),transparent_70%)] focus-visible:outline-2 focus-visible:outline-text-display md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:px-4"
      >
        <span className="grid place-items-center self-start rounded-sm bg-bg-deep p-1.5 shadow-[inset_0_0_0_1px_var(--color-border-strong)] group-hover:shadow-[inset_0_0_0_1px_var(--color-gold)] md:self-center">
          <ItemArt art={product.art} size="sm" className="border-0" />
        </span>
        <span className="min-w-0">
          <span className="block font-display-condensed text-[1.6rem] uppercase leading-none text-text-display">
            {product.title}
          </span>
          <span className="mt-1 block text-sm leading-snug text-text-muted">{product.summary}</span>
          {slots && (
            <span className="mt-1.5 block text-xs text-gold">
              {slots.left > 0 ? `Restam ${slots.left} de ${slots.capacity} vagas este mês` : "Esgotado este mês"}
            </span>
          )}
        </span>
        <Preco cents={product.fromPriceCents} unit={product.priceUnit} className="col-start-2 text-[1.9rem] md:col-start-auto" />
        <span className={cn(m.plate, m.ctaGhost, "col-start-3 row-start-1 row-span-2 self-center min-h-9 px-3 text-[0.7rem] group-hover:text-text-display md:col-start-auto md:row-auto md:row-span-1")}>
          <span className="hidden sm:inline">Comprar</span>
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

const GRUPOS: Array<{ title: string; text: string; modes: StoreProduct["mode"][] }> = [
  { title: "Também na live", text: "Com a partida transmitida no canal.", modes: ["live"] },
  { title: "Hora marcada", text: "As vagas abrem todo dia 1º.", modes: ["agendado"] },
  { title: "Fora da live", text: "Sem transmissão.", modes: ["fora_da_live", "gravado", "digital"] },
];

export function VarianteB({ data }: { data: VitrineDados }) {
  const { products, slots, party } = data;
  const resto = products.filter((p) => p.id !== party?.id);
  return (
    <div className={cn(m.root, "relative pb-24")}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_65%_at_35%_0%,var(--color-brand-primary-glow),transparent_72%)]" />
      <section className={cn(WRAP, "relative grid grid-cols-[minmax(0,1fr)] gap-4 pt-6 md:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:gap-5")}>
        <div className="space-y-4">
          <h1 className="sr-only">Loja do FORMULADOTA: jogue com o Pedro na live</h1>
          <Palco data={data} />
        </div>
        {party && (
          <div className={m.liftGold}>
            <aside className={cn(m.panel, m.panelGold, "h-full p-5 md:p-6")}>
              <CompraB slug={party.slug} priceCents={party.fromPriceCents} max={party.maxQuantity} />
            </aside>
          </div>
        )}
      </section>

      <div className={cn(WRAP, "relative mt-14 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
        {GRUPOS.map((g) => {
          const items = resto.filter((p) => g.modes.includes(p.mode));
          if (items.length === 0) return null;
          return (
            <section key={g.title} className={cn("space-y-2", g.modes.includes("fora_da_live") && "xl:col-span-2")}>
              <header className="flex items-end justify-between gap-3 border-b-2 border-brand-primary/70 pb-2">
                <h2 className="font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{g.title}</h2>
                <p className="text-xs text-text-muted">{g.text}</p>
              </header>
              <ul>
                {items.map((p) => (
                  <Linha key={p.id} product={p} slots={slots[p.id]} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className={cn(WRAP, "relative mt-12")}>
        <a
          href="https://www.youtube.com/@formuladota"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-wrap items-center justify-between gap-3 border-y border-border-subtle px-2 py-4 md:px-4"
        >
          <span className="flex items-center gap-3">
            <BrandGlyph brand="youtube" size={26} />
            <span>
              <span className="block font-display-condensed text-[1.6rem] uppercase leading-none text-text-display">Comece grátis</span>
              <span className="text-sm text-text-muted">A Fórmula do MMR está aberta no canal em 14 vídeos.</span>
            </span>
          </span>
          <span className={cn(m.plate, m.ctaGhost, "group-hover:text-text-display")}>
            Assistir
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        </a>
      </div>
    </div>
  );
}

export const NOME_B = "Ao vivo (palco da live)";
