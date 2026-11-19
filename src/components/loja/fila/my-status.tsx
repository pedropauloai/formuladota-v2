"use client";

// A vez de quem comprou: posição e partidas até entrar, a chamada para a party, o fim das
// partidas, e o Pix (ou o cartão) que ainda espera pagamento.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Gamepad2, Hourglass, Loader2, XCircle } from "lucide-react";
import { PixPanel } from "@/components/loja/pix-panel";
import { formatPrice } from "@/lib/loja/money";
import type { MyPendingOrder, MyQueueEntry } from "@/lib/loja/fila/model";
import { sairDaFila } from "@/app/party/actions";

/** Abre o Dota pela Steam no computador; no celular o link não faz nada, por isso some lá. */
const OPEN_DOTA_URL = "steam://rungameid/570";

function CalledCard({ entry, dotaId }: { entry: MyQueueEntry; dotaId: string | null }) {
  const t = useTranslations("fila");
  return (
    <section data-fila-vez="na_party" className="space-y-3 rounded-md border-2 border-play-primary bg-play-primary/10 p-5">
      <p className="flex items-center gap-2 font-display text-3xl uppercase leading-none tracking-wide text-play-primary">
        <Gamepad2 size={26} aria-hidden="true" /> {t("calledTitle")}
      </p>
      <p className="text-sm text-text-body">{t("calledText")}</p>
      <p className="text-sm font-medium text-text-display">{t("calledProgress", { current: Math.min(entry.played + 1, entry.matches), total: entry.matches })}</p>
      {dotaId && <p className="text-xs text-text-muted">{t("dotaId", { id: dotaId })}</p>}
      <a
        href={OPEN_DOTA_URL}
        className="hidden items-center justify-center gap-2 rounded-sm bg-play-primary px-4 py-2.5 font-display uppercase tracking-widest text-bg-deep hover:bg-play-primary-hover md:inline-flex"
      >
        {t("openDota")}
      </a>
    </section>
  );
}

function LeaveButton({ bookingId, onChanged }: { bookingId: string; onChanged: () => Promise<void> }) {
  const t = useTranslations("fila");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const leave = () => {
    if (!window.confirm(t("leaveConfirm"))) return;
    startTransition(async () => {
      const result = await sairDaFila(bookingId);
      if (!result.ok) {
        setError(t(`errors.${result.error}`));
        return;
      }
      await onChanged();
    });
  };
  return (
    <div className="pt-1">
      <button type="button" data-fila-sair disabled={pending} onClick={leave} className="text-xs text-text-muted underline underline-offset-2 hover:text-text-display disabled:opacity-60">
        {t("leave")}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function WaitingCard({ entry, onChanged }: { entry: MyQueueEntry; onChanged: () => Promise<void> }) {
  const t = useTranslations("fila");
  const next = entry.matchesUntilTurn === 0 || entry.position === 1;
  return (
    <section data-fila-vez="aguardando" className="space-y-2 rounded-md border border-gold/50 bg-bg-base p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-text-display">
        <Hourglass size={16} className="text-gold" aria-hidden="true" /> {t("waitingTitle")}
      </p>
      {entry.position !== null && (
        <p data-fila-posicao={entry.position} className="font-display text-6xl leading-none tabular-nums text-gold">
          {t("waitingPosition", { position: entry.position })}
        </p>
      )}
      <p className="text-sm text-text-body">{next ? t("waitingNext") : t("waitingIn", { count: entry.matchesUntilTurn ?? 0 })}</p>
      <p className="text-xs leading-relaxed text-text-muted">{t("waitingHint")}</p>
      {entry.noShows > 0 && <p className="rounded-sm border border-warning/40 bg-warning/10 p-2 text-xs text-text-body">{t("noShowNote")}</p>}
      <LeaveButton bookingId={entry.id} onChanged={onChanged} />
    </section>
  );
}

function FinishedCard({ entry }: { entry: MyQueueEntry }) {
  const t = useTranslations("fila");
  const done = entry.state === "concluido";
  return (
    <section data-fila-vez={entry.state} className="flex items-start gap-3 rounded-md border border-border-strong bg-bg-base p-5">
      {done ? <CheckCircle2 size={22} className="shrink-0 text-play-primary" aria-hidden="true" /> : <XCircle size={22} className="shrink-0 text-text-muted" aria-hidden="true" />}
      <div className="space-y-1">
        <p className="font-display text-xl uppercase leading-none tracking-wide text-text-display">{done ? t("doneTitle") : entry.exit === "saiu" ? t("leftTitle") : t("removedText")}</p>
        {entry.exit === "saiu" && <p className="text-sm text-text-muted">{t("leftText")}</p>}
        {done && <p className="text-sm text-text-muted">{t("doneText", { count: entry.played })}</p>}
      </div>
    </section>
  );
}

export function MyEntryCard({ entry, dotaId, onChanged }: { entry: MyQueueEntry; dotaId: string | null; onChanged: () => Promise<void> }) {
  if (entry.state === "na_party") return <CalledCard entry={entry} dotaId={dotaId} />;
  if (entry.state === "aguardando") return <WaitingCard entry={entry} onChanged={onChanged} />;
  return <FinishedCard entry={entry} />;
}

export function PendingPayment({ pending }: { pending: MyPendingOrder }) {
  const t = useTranslations("fila");
  if (pending.method === "cartao" || !pending.pix) {
    return (
      <section className="flex items-start gap-3 rounded-md border border-border-strong bg-bg-base p-5">
        <Loader2 size={20} className="shrink-0 animate-spin text-gold" aria-hidden="true" />
        <p className="text-sm text-text-body">{t("cardPending")}</p>
      </section>
    );
  }
  return (
    <section data-fila-pix className="space-y-3">
      <div className="space-y-1">
        <p className="font-display text-2xl uppercase leading-none tracking-wide text-text-display">{t("pixTitle", { price: formatPrice(pending.amountCents) })}</p>
        <p className="text-xs text-text-muted">{t("pixHold")}</p>
      </div>
      <PixPanel copiaECola={pending.pix.copiaECola} qrDataUrl={pending.pix.qrDataUrl} expiresAt={pending.pix.expiresAt} qrDesktopOnly />
    </section>
  );
}
