"use client";

// A compra da vaga na party ao lado do palco, no lugar da coluna direita do cliente do Dota (onde
// fica o BUSCAR PARTIDA): quantas partidas, o total e a placa verde. A quantidade segue para a
// página do produto (?qtd=), que já abre o formulário com ela.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { CtaWarp, Price, plate } from "@/components/v2";
import { useSound } from "@/lib/sound/hooks";

const STEPS = ["buyStep1", "buyStep2", "buyStep3"] as const;

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const t = useTranslations("loja");
  const square = cn(plate({ kind: "ghost" }), "size-11 px-0");
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={t("buyLess")} className={square}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-10 text-center font-display-condensed text-[2.4rem] leading-none text-text-display">
        {value}
      </output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={t("buyMore")} className={square}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function PartyBuyPanel({
  slug,
  title,
  summary,
  priceCents,
  maxQuantity,
  queueHref,
}: {
  slug: string;
  /** Nome do produto no catálogo ("Vaga na party da live"). */
  title: string;
  summary: string;
  priceCents: number;
  maxQuantity: number;
  /** Com a live no ar (aberta pelo Pedro no painel), a vaga se compra na fila: /party. */
  queueHref?: string;
}) {
  const t = useTranslations("loja");
  const play = useSound();
  const [quantity, setQuantity] = useState(1);
  const max = Math.max(1, maxQuantity);
  const change = (n: number) => {
    play("click");
    setQuantity(n);
  };
  const buyHref = queueHref ?? `/loja/${slug}${quantity > 1 ? `?qtd=${quantity}` : ""}#comprar`;
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-balance font-display-condensed text-[2.6rem] uppercase leading-[0.85] text-text-display">{t("buyTitle")}</h1>
        <p className="font-display text-sm font-bold text-gold">{title}</p>
        <p className="text-sm leading-relaxed text-text-muted">{summary}</p>
      </div>

      {max > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t("buyMatches")}</p>
          <div className="flex items-center justify-between gap-3">
            <Stepper value={quantity} max={max} onChange={change} />
            <span className="text-right text-xs text-text-muted">{t("buyEach", { price: formatPrice(priceCents) })}</span>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between border-y border-border-subtle py-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{t("buyTotal")}</span>
        <Price cents={priceCents * quantity} className="text-[3.2rem]" />
      </div>

      <ol className="space-y-3">
        {STEPS.map((key, i) => (
          <li key={key} className="flex items-start gap-3 text-sm leading-snug text-text-body">
            <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-bg-deep font-display-condensed text-base text-gold shadow-[inset_0_0_0_1px_var(--color-border-gold)]">
              {i + 1}
            </span>
            {t(key)}
          </li>
        ))}
      </ol>

      <div className="mt-auto space-y-3">
        <Link
          href={buyHref}
          onClick={() => play("click")}
          className={plate({ kind: "cta", block: true })}
        >
          <CtaWarp />
          {t("buyCta")}
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p className="text-center text-xs text-text-muted">{t("buyNote", { max })}</p>
      </div>
    </div>
  );
}
