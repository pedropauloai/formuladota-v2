"use client";

// Compra da vaga na fila: preço e vagas abertas no topo, a vez de quem já comprou, o Pix pendente
// e o botão. Quem está logado com a Steam vinculada compra em dois toques: "Garantir minha vaga"
// e "Copiar código Pix". Sem login ou sem Steam, o botão leva a resolver isso e voltar.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogIn, Minus, Plus } from "lucide-react";
import { useSound } from "@/lib/sound/hooks";
import { formatPrice } from "@/lib/loja/money";
import { garantirVaga } from "@/app/party/actions";
import type { MyQueueEntry, PublicLive, QueueView } from "@/lib/loja/fila/model";
import { MyEntryCard, PendingPayment } from "./my-status";

export interface FilaViewer {
  loggedIn: boolean;
  hasSteam: boolean;
  /** ID de amigo do Dota de quem está logado (pela Steam vinculada). */
  dotaId: string | null;
}

export interface FilaOffer {
  priceCents: number;
  maxQuantity: number;
  onSale: boolean;
}

const CTA = "inline-flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3.5 font-display text-lg uppercase tracking-widest transition-colors disabled:opacity-60";

function SeatsLine({ live, priceCents }: { live: PublicLive | null; priceCents: number }) {
  const t = useTranslations("fila");
  const open = live?.seatsOpen ?? 0;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-4xl leading-none tabular-nums text-gold">{formatPrice(priceCents)}</span>
        <span className="text-sm text-text-muted">{t("perMatch")}</span>
      </p>
      {live && (
        <p data-fila-vagas={open} className={`text-sm font-medium ${open > 0 ? "text-play-primary" : "text-error"}`}>
          {t("seatsOpen", { count: open })}
        </p>
      )}
    </div>
  );
}

function Gate({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <div className="space-y-3">
      <a href={href} className={`${CTA} bg-brand-primary text-text-display hover:bg-brand-primary-hover`}>
        <LogIn size={18} aria-hidden="true" /> {label}
      </a>
      <p className="text-xs leading-relaxed text-text-muted">{text}</p>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const t = useTranslations("fila");
  const button = "flex size-11 items-center justify-center rounded-sm border border-border-strong text-text-display disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-body">{t("matchesLabel")}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={button} aria-label={t("fewer")} disabled={value <= 1} onClick={() => onChange(value - 1)}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <output aria-live="polite" className="w-8 text-center font-display text-2xl tabular-nums text-text-display">{value}</output>
        <button type="button" className={button} aria-label={t("more")} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BuyForm({ max, priceCents, onBought }: { max: number; priceCents: number; onBought: () => Promise<void> }) {
  const t = useTranslations("fila");
  const play = useSound();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const count = Math.min(quantity, max);

  const buy = (method: "pix" | "cartao") =>
    startTransition(async () => {
      setError(null);
      const result = await garantirVaga(count, method);
      if (!result.ok) {
        play("error");
        setError(t(`errors.${result.error}`));
        return;
      }
      if (result.method === "cartao") {
        window.location.href = result.redirectUrl;
        return;
      }
      play("confirm");
      await onBought();
    });

  return (
    <div id="fila-comprar" className="space-y-3">
      {max > 1 && <Stepper value={count} max={max} onChange={setQuantity} />}
      <button type="button" data-fila-comprar="pix" disabled={pending} onClick={() => buy("pix")} className={`${CTA} bg-play-primary text-bg-deep hover:bg-play-primary-hover`}>
        {pending ? t("buying") : t("buy", { price: formatPrice(priceCents * count) })}
      </button>
      <button type="button" data-fila-comprar="cartao" disabled={pending} onClick={() => buy("cartao")} className="w-full text-center text-sm text-text-muted underline-offset-2 hover:text-text-display hover:underline">
        {t("buyCard")}
      </button>
      {error && (
        <p role="alert" className="rounded-sm border border-error/40 bg-error/10 p-2 text-sm text-text-body">
          {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-text-muted">{t("buyNote")}</p>
    </div>
  );
}

function Purchase({ live, viewer, offer, onBought }: { live: PublicLive | null; viewer: FilaViewer; offer: FilaOffer; onBought: () => Promise<void> }) {
  const t = useTranslations("fila");
  if (!offer.onSale) return <p className="text-sm text-text-muted">{t("errors.fechada")}</p>;
  if (!live) return null;
  if (!viewer.loggedIn) return <Gate href="/login?next=%2Fparty" label={t("loginCta")} text={t("loginText")} />;
  if (!viewer.hasSteam) return <Gate href="/vincular/steam?next=%2Fparty" label={t("steamCta")} text={t("steamText")} />;
  if (live.seatsOpen === 0) {
    return (
      <div className="space-y-2">
        <button type="button" disabled className={`${CTA} bg-bg-elevated text-text-muted`}>
          {t("soldOut")}
        </button>
        <p className="text-xs leading-relaxed text-text-muted">{t("soldOutText")}</p>
      </div>
    );
  }
  return <BuyForm max={Math.min(offer.maxQuantity, live.seatsOpen)} priceCents={offer.priceCents} onBought={onBought} />;
}

/** As entradas que a pessoa vê: as ativas; sem nenhuma, só a última que terminou. */
function visibleEntries(entries: MyQueueEntry[]): MyQueueEntry[] {
  const active = entries.filter((e) => e.state === "aguardando" || e.state === "na_party");
  if (active.length > 0) return active;
  return entries.slice(-1);
}

export function BuyBox({ view, viewer, offer, onBought }: { view: QueueView; viewer: FilaViewer; offer: FilaOffer; onBought: () => Promise<void> }) {
  const live = view.queue.live;
  const mine = view.mine;
  return (
    <div className="space-y-4 rounded-md border border-border-strong bg-bg-base p-4 md:p-5">
      <SeatsLine live={live} priceCents={offer.priceCents} />
      {mine && visibleEntries(mine.entries).map((entry) => <MyEntryCard key={entry.id} entry={entry} dotaId={viewer.dotaId} />)}
      {mine?.pending ? <PendingPayment pending={mine.pending} /> : <Purchase live={live} viewer={viewer} offer={offer} onBought={onBought} />}
    </div>
  );
}
