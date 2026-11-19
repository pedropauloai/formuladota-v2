"use client";

// Os estados do painel que não são a compra nem o Battlepass ativo: o Pix esperando pagamento, o
// cartão esperando a primeira cobrança, o Battlepass que terminou e o histórico de pagamentos.

import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { PixPanel } from "@/components/loja/pix-panel";
import { BATTLEPASS } from "@/lib/battlepass/config";
import { formatPrice } from "@/lib/loja/money";
import type { PaymentSummary, PendingPix } from "@/lib/battlepass/server";
import type { BattlepassActions } from "./use-battlepass-actions";
import { useBattlepassDates } from "./dates";
import { ActionError, CardButton, PixButton } from "./panel-offer";

const TITLE = "font-display-condensed text-[2rem] uppercase leading-[0.9] text-text-display";

/** O Pix gerado, com o QR e o copia e cola; a página confere sozinha até o pagamento cair. */
export function PixPending({ pix, extendsFrom }: { pix: PendingPix; extendsFrom: string | null }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  return (
    <section data-bp-pix className="space-y-3">
      <div className="space-y-1">
        <p className={TITLE}>{t("pixTitle", { price: formatPrice(BATTLEPASS.priceCents) })}</p>
        <p className="text-sm text-text-muted">{extendsFrom ? t("pixExtendText", { date: dates.dayMonth(extendsFrom) }) : t("pixText")}</p>
      </div>
      <PixPanel copiaECola={pix.copiaECola} qrDataUrl={pix.qrDataUrl} expiresAt={pix.expiresAt} qrDesktopOnly codeData={{ "data-bp-pix-copia": "" }} />
    </section>
  );
}

/** Cartão começado no Mercado Pago, sem a primeira cobrança aprovada ainda. O Pix fica à mão. */
export function CardWaiting({ actions, slow }: { actions: BattlepassActions; slow: boolean }) {
  const t = useTranslations("battlepass");
  return (
    <>
      <div aria-live="polite" className="space-y-2">
        <p className={`${TITLE} flex items-center gap-2.5`}>
          <Loader2 size={24} className="shrink-0 animate-spin text-gold motion-reduce:animate-none" aria-hidden="true" />
          {t("waitingTitle")}
        </p>
        <p className="text-sm leading-relaxed text-text-body">{t("waitingText")}</p>
      </div>
      {slow && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-text-muted">{t("waitingSlow")}</p>
          <CardButton actions={actions} large={false} />
        </div>
      )}
      <div className="space-y-2 border-t border-border-subtle pt-4">
        <p className="text-sm text-text-muted">{t("waitingPix")}</p>
        <PixButton actions={actions} />
        <p className="text-center text-xs text-text-muted">{t("pixNote")}</p>
      </div>
      <ActionError error={actions.error} />
    </>
  );
}

/** Pedido de reembolso feito agora: quanto volta e por onde. */
export function RefundDone({ cents }: { cents: number }) {
  const t = useTranslations("battlepass");
  return (
    <p role="status" className="flex items-start gap-2.5 rounded-sm border border-play-primary/40 bg-play-primary/10 p-3 text-sm leading-relaxed text-text-body">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-play-primary" aria-hidden="true" />
      {t("refundDone", { total: formatPrice(cents) })}
    </p>
  );
}

/** O Battlepass que já terminou: a data e o caminho para assinar de novo. */
export function EndedHeader({ until }: { until: string }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  return (
    <div className="space-y-2">
      <p className={TITLE}>{t("endedTitle", { date: dates.day(until) })}</p>
      <p className="text-sm leading-relaxed text-text-muted">{t("endedText")}</p>
    </div>
  );
}

const KNOWN_STATUSES = new Set(["pago", "em_revisao", "reembolso_pedido", "reembolsado"]);

/** Os pagamentos já feitos, fechados por padrão: quem quer conferir abre. */
export function PaymentHistory({ history }: { history: PaymentSummary[] }) {
  const t = useTranslations("battlepass");
  const dates = useBattlepassDates();
  if (history.length === 0) return null;
  return (
    <details className="group border-t border-border-subtle pt-3 text-xs text-text-muted">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm py-1 hover:text-text-body [&::-webkit-details-marker]:hidden">
        {t("historyTitle", { count: history.length })}
        <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <ul className="mt-1 divide-y divide-border-subtle">
        {history.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
            <span>
              {p.paidAt ? `${dates.short(p.paidAt)} · ` : ""}
              {t(`methods.${p.method}`)}
            </span>
            <span className="text-text-body">
              {formatPrice(p.amountCents)} · {t(`statuses.${KNOWN_STATUSES.has(p.status) ? p.status : "outro"}`)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
