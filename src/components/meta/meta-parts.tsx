// Peças sem estado do /meta (servidor e navegador): número no formato do idioma, letra da nota,
// variação, linha dos últimos dias e rosto do herói.

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MetaLetter } from "@/lib/dota/meta/scoring";

export function fmtPct(value: number, locale: string, digits = 1): string {
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`;
}

export function fmtNum(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function fmtDelta(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(value);
}

/** Verde acima da média, vermelho abaixo; a meio ponto da média fica neutro. */
export function toneClass(value: number, mean: number, band = 0.5): string {
  if (value >= mean + band) return "text-success";
  if (value <= mean - band) return "text-brand-text";
  return "text-text-body";
}

// S em ouro (raridade), A e B em verde, C neutro, D e F em vermelho.
const LETTER_STYLE: Record<MetaLetter, string> = {
  S: "border-gold-bright/70 bg-gold/20 text-gold-bright",
  A: "border-success/60 bg-success/20 text-success",
  B: "border-success/30 bg-success/10 text-success/85",
  C: "border-border-strong bg-bg-elevated text-text-muted",
  D: "border-brand-text/30 bg-brand-primary/10 text-brand-text/85",
  F: "border-brand-text/60 bg-brand-primary/20 text-brand-text",
};

export function LetterBadge({ letter, size = "md", className }: { letter: MetaLetter; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "h-5 w-5 text-base", md: "h-7 w-7 text-xl", lg: "h-9 w-9 text-[1.7rem]" }[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border pt-[0.12em] font-display-condensed leading-none",
        box,
        LETTER_STYLE[letter],
        className
      )}
    >
      {letter}
    </span>
  );
}

export function Delta({ value, locale, title }: { value: number | null; locale: string; title?: string }) {
  if (value === null) return <span className="text-text-faded" title={title} aria-label={title} />;
  const tone = value >= 0.5 ? "text-success" : value <= -0.5 ? "text-brand-text" : "text-text-muted";
  return (
    <span className={cn("tabular-nums", tone)} title={title}>
      {fmtDelta(value, locale)}
    </span>
  );
}

export function HeroFace({ src, name, size = 28, className }: { src: string; name: string; size?: number; className?: string }) {
  return (
    <Image src={src} alt={name} width={size} height={size} className={cn("shrink-0 rounded-sm object-cover", className)} style={{ width: size, height: size }} />
  );
}

// Escala fixa da linha (44% a 58%): a mesma para todo herói, então a altura compara heróis entre si.
const TREND_MIN = 44;
const TREND_MAX = 58;

function trendPaths(values: Array<number | null>, width: number, height: number): string[] {
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const y = (v: number) => height - ((Math.min(TREND_MAX, Math.max(TREND_MIN, v)) - TREND_MIN) / (TREND_MAX - TREND_MIN)) * height;
  const segments: string[] = [];
  let current = "";
  values.forEach((v, i) => {
    if (v === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`;
  });
  if (current) segments.push(current);
  return segments;
}

/**
 * Vitória ajustada de cada dia; tracejado na média de 50% e uma marca no dia da troca de patch.
 * `fluid` estica a linha na largura da célula (o traço não engrossa).
 */
export function Sparkline({
  values,
  changeIndex,
  width = 120,
  height = 26,
  fluid = false,
  className,
}: {
  values: Array<number | null>;
  changeIndex: number | null;
  width?: number;
  height?: number;
  fluid?: boolean;
  className?: string;
}) {
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const mid = height - ((50 - TREND_MIN) / (TREND_MAX - TREND_MIN)) * height;
  const last = [...values].reverse().find((v) => v !== null) ?? null;
  const lastTone = last === null ? "" : last >= 50.5 ? "text-success" : last <= 49.5 ? "text-brand-text" : "text-text-muted";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={fluid ? "100%" : width}
      height={height}
      preserveAspectRatio={fluid ? "none" : undefined}
      className={cn("block overflow-visible", lastTone, className)}
      aria-hidden="true"
    >
      <line x1={0} x2={width} y1={mid} y2={mid} className="stroke-text-faded/40" strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {changeIndex !== null && (
        <line x1={changeIndex * step} x2={changeIndex * step} y1={0} y2={height} className="stroke-gold/60" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      {trendPaths(values, width, height).map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
