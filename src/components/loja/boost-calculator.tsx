"use client";

// Calculadora do boost: a medalha de agora e a do alvo mudam enquanto a pessoa digita, e o preço
// sai das faixas do produto com a mesma conta que o servidor cobra (src/lib/loja/pricing.ts).

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { medalForMmr } from "@/lib/loja/medal";
import { MMR_STEP, boostQuote, formatMmr, mmrCeiling, type BoostQuote, type MmrTier } from "@/lib/loja/pricing";

export function parseMmrInput(value: string): number | null {
  return /^\d{1,5}$/.test(value) ? Number(value) : null;
}

export function quoteFor(from: string, to: string, tiers: readonly MmrTier[]): BoostQuote | null {
  const a = parseMmrInput(from);
  const b = parseMmrInput(to);
  return a === null || b === null ? null : boostQuote(a, b, tiers);
}

const inputCls =
  "mt-1 w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 font-display text-xl tabular-nums text-text-display placeholder:text-text-faded focus:border-brand-primary focus:outline-none";

function MedalInput(props: {
  name: "mmr_atual" | "mmr_alvo";
  label: string;
  caption: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const tr = useTranslations("ranks");
  const mmr = parseMmrInput(props.value);
  const medal = mmr === null ? null : medalForMmr(mmr);
  return (
    <label className="block min-w-0 text-sm text-text-body">
      <span className="flex items-center gap-2">
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-sm border border-border-subtle bg-bg-deep">
          {medal ? (
            <Image
              key={medal.image}
              src={`/icons/dota-ranks/${medal.image}.png`}
              alt=""
              width={44}
              height={44}
              className="size-11 object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-300"
            />
          ) : (
            <span className="size-6 rounded-full border border-dashed border-border-strong" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-xs text-text-faded">{props.caption}</span>
          {medal && (
            <span className="block truncate font-display text-base uppercase tracking-wide text-gold">{tr(`dota.${medal.rank}`)}</span>
          )}
        </span>
      </span>
      <span className="mt-2 block">{props.label}</span>
      <input
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-invalid={props.error ? true : undefined}
        className={cn(inputCls, props.error && "border-error")}
      />
      {props.error && <span className="mt-1 block text-xs text-error">{props.error}</span>}
    </label>
  );
}

function QuoteLine({ quote, ceiling }: { quote: BoostQuote | null; ceiling: number }) {
  const t = useTranslations("loja");
  if (!quote) return <p className="text-sm text-text-muted">{t("boostEnter")}</p>;
  if (!quote.ok) {
    const message =
      quote.reason === "ordem"
        ? t("boostErrorOrder")
        : quote.reason === "minimo"
          ? t("boostErrorMin", { min: MMR_STEP })
          : t("boostErrorMax", { max: formatMmr(ceiling) });
    return <p role="status" className="text-sm text-error">{message}</p>;
  }
  return (
    <div role="status" className="rounded-sm border border-gold/40 bg-gold/5 px-3 py-2.5">
      <p className="font-display text-2xl leading-none tabular-nums text-gold">
        {t("boostTotal", { mmr: formatMmr(quote.mmr), price: formatPrice(quote.cents) })}
      </p>
      {quote.parts.length > 1 && (
        <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
          {quote.parts.map((part) => (
            <li key={part.from}>{t("boostPart", { from: formatMmr(part.from), to: formatMmr(part.to), price: formatPrice(part.cents) })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BoostCalculator(props: {
  tiers: readonly MmrTier[];
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  errors: Record<string, string>;
}) {
  const t = useTranslations("loja");
  const quote = quoteFor(props.from, props.to, props.tiers);
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-text-body">{t("boostLegend")}</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
        <MedalInput name="mmr_atual" label={t("mmrAtual")} caption={t("boostMedalFrom")} value={props.from} onChange={props.onFrom} error={props.errors.mmr_atual} />
        <ArrowRight size={18} aria-hidden="true" className="mt-4 text-text-muted" />
        <MedalInput name="mmr_alvo" label={t("mmrAlvo")} caption={t("boostMedalTo")} value={props.to} onChange={props.onTo} error={props.errors.mmr_alvo} />
      </div>
      <QuoteLine quote={quote} ceiling={mmrCeiling(props.tiers)} />
    </fieldset>
  );
}
