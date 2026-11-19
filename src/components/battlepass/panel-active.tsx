"use client";

// O Battlepass ativo: até quando vale, se renova, a entrada na fila da party (o benefício) e o que a
// pessoa pode fazer: cancelar a renovação no cartão, somar 30 dias no Pix e, nos 7 dias da garantia,
// pedir o dinheiro de volta com uma confirmação que diz o valor e que o acesso termina na hora.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Link2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/loja/money";
import type { BattlepassView, RefundWindow } from "@/lib/battlepass/state";
import { CtaWarp, plate } from "@/components/v2";
import type { BattlepassActions } from "./use-battlepass-actions";
import { useBattlepassDates } from "./dates";
import { ActionError, PixButton } from "./panel-offer";

type ActiveView = Extract<BattlepassView, { state: "ativo" }>;

function StatusLine({ view, confirmed }: { view: ActiveView; confirmed: boolean }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  const note =
    view.via === "pix"
      ? t("pixNoRenew", { date: dates.dayMonth(view.until) })
      : view.renews
        ? t("renewsCard", { date: dates.dayMonth(view.until) })
        : t("cancelledCard", { date: dates.dayMonth(view.until) });
  return (
    <div aria-live="polite" className="space-y-3">
      <p className="flex items-center gap-2.5 font-display-condensed text-[2.1rem] uppercase leading-[0.9] text-gold">
        <BadgeCheck size={26} className="shrink-0" aria-hidden="true" />
        {t("activeTitle")}
      </p>
      {confirmed && <p className="text-sm font-medium text-play-primary">{t("activeConfirmed")}</p>}
      <p className="font-display-condensed text-[1.9rem] leading-none text-text-display">{t("activeUntil", { date: dates.day(view.until) })}</p>
      <p className="text-sm leading-relaxed text-text-body">{note}</p>
    </div>
  );
}

function SteamNudge() {
  const t = useTranslations("battlepass");
  return (
    <div className="space-y-2 rounded-sm border border-warning/40 bg-warning/10 p-3">
      <p className="text-sm leading-relaxed text-text-body">{t("steamText")}</p>
      <Link href="/vincular/steam?next=%2Fplanos" className={plate({ kind: "ghost", small: true })}>
        <Link2 size={14} aria-hidden="true" />
        {t("steamCta")}
      </Link>
    </div>
  );
}

function RefundBox({ refund, actions }: { refund: RefundWindow; actions: BattlepassActions }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  const [asking, setAsking] = useState(false);
  const total = formatPrice(refund.totalCents);
  if (!asking) {
    return (
      <div className="space-y-1">
        <button type="button" data-bp-reembolso onClick={() => setAsking(true)} className="text-sm text-text-muted underline underline-offset-4 hover:text-text-display">
          {t("refundCta")}
        </button>
        <p className="text-xs text-text-faded">{t("refundUntil", { date: dates.dayMonth(refund.deadline), time: dates.time(refund.deadline) })}</p>
      </div>
    );
  }
  return (
    <div role="group" aria-labelledby="bp-reembolso-titulo" className="space-y-3 rounded-sm border border-error/40 bg-error/10 p-4">
      <p id="bp-reembolso-titulo" className="font-display text-base font-bold text-text-display">
        {t("refundConfirmTitle", { total })}
      </p>
      <p className="text-sm leading-relaxed text-text-body">{t("refundConfirmText")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-bp-reembolso-confirmar disabled={actions.busy !== null} onClick={actions.requestRefund} className={plate({ kind: "brand", small: true })}>
          <CtaWarp />
          {t("refundConfirm")}
        </button>
        <button type="button" onClick={() => setAsking(false)} className={plate({ kind: "ghost", small: true })}>
          {t("refundBack")}
        </button>
      </div>
    </div>
  );
}

interface ActiveStatusProps {
  view: ActiveView;
  refund: RefundWindow | null;
  hasSteam: boolean;
  /** Pix de mais 30 dias já gerado: o painel mostra o código, e o botão de somar some. */
  pixPending: boolean;
  confirmed: boolean;
  actions: BattlepassActions;
}

function CancelRenewal({ until, actions }: { until: string; actions: BattlepassActions }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  return (
    <div className="space-y-1.5">
      <button type="button" data-bp-cancelar disabled={actions.busy !== null} onClick={actions.cancelRenewal} className={plate({ kind: "ghost", small: true })}>
        {t("cancelCta")}
      </button>
      <p className="text-xs text-text-faded">{t("cancelNote", { date: dates.dayMonth(until) })}</p>
    </div>
  );
}

export function ActiveStatus({ view, refund, hasSteam, pixPending, confirmed, actions }: ActiveStatusProps) {
  const t = useTranslations("battlepass");
  const canExtend = view.via === "pix" && !pixPending;
  const canCancel = view.via === "cartao" && view.renews;
  return (
    <>
      <StatusLine view={view} confirmed={confirmed} />
      <Link href="/party" className={plate({ kind: "cta", block: true })}>
        <CtaWarp />
        {t("partyCta")}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      {!hasSteam && <SteamNudge />}
      {(canExtend || canCancel || refund) && (
        <div className="space-y-4 border-t border-border-subtle pt-4">
          {canExtend && <PixButton actions={actions} label={t("extendCta")} />}
          {canCancel && <CancelRenewal until={view.until} actions={actions} />}
          {refund && <RefundBox refund={refund} actions={actions} />}
        </div>
      )}
      <ActionError error={actions.error} />
    </>
  );
}
