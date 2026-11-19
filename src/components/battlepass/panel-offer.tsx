"use client";

// A compra do Battlepass no painel: o preço em ouro, "Assinar no cartão" (a mensalidade que renova)
// e "Pagar 30 dias no Pix" (não renova), e a garantia. Visitante vai entrar com o Discord e volta
// para cá; quem está logado compra direto.

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { BATTLEPASS } from "@/lib/battlepass/config";
import { localizePath } from "@/i18n/pathnames";
import { cn } from "@/lib/utils";
import { CtaWarp, Price, plate } from "@/components/v2";
import type { BattlepassActions } from "./use-battlepass-actions";

export function PriceBlock() {
  const t = useTranslations("battlepass");
  return (
    <div className="space-y-2">
      <Price cents={BATTLEPASS.priceCents} unit={t("perMonth")} className="text-[4.2rem] md:text-[4.6rem]" />
      <p className="text-xs text-text-muted">{t("payWith")}</p>
    </div>
  );
}

/** Visitante: o mesmo botão leva ao login com o Discord e volta para a /planos. */
function useLoginHref(): string {
  const locale = useLocale();
  return `/login?next=${encodeURIComponent(localizePath("/planos", locale))}`;
}

export function CardButton({ actions, large = true }: { actions: BattlepassActions | null; large?: boolean }) {
  const t = useTranslations("battlepass");
  const login = useLoginHref();
  const busy = actions?.busy ?? null;
  const className = plate({ kind: "cta", large, block: true });
  const content = (
    <>
      <CtaWarp />
      {busy === "cartao" ? t("opening") : t("cardCta")}
      <ArrowRight size={18} aria-hidden="true" />
    </>
  );
  if (!actions) {
    return (
      <a href={login} data-bp-assinar-cartao className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" data-bp-assinar-cartao disabled={busy !== null} onClick={actions.startCard} className={className}>
      {content}
    </button>
  );
}

export function PixButton({ actions, label }: { actions: BattlepassActions | null; label?: string }) {
  const t = useTranslations("battlepass");
  const login = useLoginHref();
  const busy = actions?.busy ?? null;
  const className = cn(plate({ kind: "ghost", block: true }), "min-h-[3.25rem]");
  const text = busy === "pix" ? t("generating") : (label ?? t("pixCta"));
  if (!actions) {
    return (
      <a href={login} data-bp-pagar-pix className={className}>
        {text}
      </a>
    );
  }
  return (
    <button type="button" data-bp-pagar-pix disabled={busy !== null} onClick={actions.startPix} className={className}>
      {text}
    </button>
  );
}

export function ActionError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-sm border border-error/40 bg-error/10 p-2.5 text-sm text-text-body">
      {error}
    </p>
  );
}

export function GuaranteeLine() {
  const t = useTranslations("battlepass");
  return (
    <p className="flex items-start gap-3 border-t border-border-subtle pt-4 text-sm leading-snug text-text-body">
      <ShieldCheck size={20} className="mt-px shrink-0 text-gold" aria-hidden="true" />
      <span>{t.rich("guaranteeLine", { b: (chunks) => <strong className="font-bold text-text-display">{chunks}</strong> })}</span>
    </p>
  );
}

/** As duas formas de pagar, com o que cada uma faz, e o aviso do login para o visitante. */
export function BuyButtons({ actions }: { actions: BattlepassActions | null }) {
  const t = useTranslations("battlepass");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <CardButton actions={actions} />
        <p className="text-center text-xs text-text-muted">{t("cardNote")}</p>
      </div>
      <div className="space-y-2">
        <PixButton actions={actions} />
        <p className="text-center text-xs text-text-muted">{t("pixNote")}</p>
      </div>
      {!actions && <p className="text-center text-xs text-text-faded">{t("loginNote")}</p>}
      <ActionError error={actions?.error ?? null} />
    </div>
  );
}

/** O que vem no Battlepass, em três linhas, logo abaixo das formas de pagar. */
function IncludedList() {
  const t = useTranslations("battlepass");
  const items = [t("partyTitle"), t("roomsTitle"), t("badgeTitle")];
  return (
    <ul className="space-y-2 border-t border-border-subtle pt-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-text-body">
          <Check size={16} className="mt-0.5 shrink-0 text-play-primary" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Quem ainda não tem o Battlepass: preço, as duas formas de pagar e a garantia (só para quem nunca pagou). */
export function Offer({ actions, guarantee }: { actions: BattlepassActions | null; guarantee: boolean }) {
  return (
    <>
      <PriceBlock />
      <BuyButtons actions={actions} />
      <IncludedList />
      {guarantee && (
        <div className="mt-auto">
          <GuaranteeLine />
        </div>
      )}
    </>
  );
}
