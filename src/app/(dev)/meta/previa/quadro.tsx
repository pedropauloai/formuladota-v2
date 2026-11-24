"use client";

// PROTÓTIPO (meta-previa), versão C: o quadro de notas. As letras de S a F são faixas e as funções são
// colunas; numa função só, cada faixa é uma fileira de retratos. O mouse (ou o foco) num herói mostra os
// números num balão só, que nunca passa da borda do quadro; a busca apaga quem não bate com o nome.

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LETTERS, letterFloor, type MetaLetter } from "@/lib/dota/meta/scoring";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import { matchesQuery, useMetaUi } from "./contexto";
import { Delta, LetterBadge, fmtNum, fmtPct, toneClass } from "./pecas";

export interface BoardColumn {
  key: string;
  label: string;
  icon: string | null;
  rows: MetaHeroRow[];
}

interface Props {
  columns: BoardColumn[];
  locale: string;
  mean: number;
  deltaTitle: string | null;
}

interface Tip {
  row: MetaHeroRow;
  left: number;
  top: number;
}

// Faixa tingida com a cor da letra, bem de leve, para o olho achar a altura da nota.
const BAND: Record<MetaLetter, string> = {
  S: "bg-gold/[0.07]",
  A: "bg-success/[0.06]",
  B: "bg-success/[0.03]",
  C: "bg-transparent",
  D: "bg-brand-primary/[0.04]",
  F: "bg-brand-primary/[0.08]",
};
const TIP_WIDTH = 224;

function HeroNumbers({ tip, locale, mean, deltaTitle }: { tip: Tip; locale: string; mean: number; deltaTitle: string | null }) {
  const t = useTranslations("metaV3");
  const { row } = tip;
  const line = "flex justify-between gap-4";
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute z-[var(--z-overlay)] flex flex-col gap-1 rounded-sm border border-border-gold/60 bg-bg-base/95 p-2.5 font-body text-[0.75rem] text-text-muted shadow-[var(--shadow-elevated)] backdrop-blur-sm"
      style={{ left: tip.left, top: tip.top, width: TIP_WIDTH }}
    >
      <span className="flex items-center gap-2 pb-1">
        <LetterBadge letter={row.letter} size="sm" />
        <span className="truncate text-sm font-semibold text-text-display">{row.name}</span>
        <span className="ml-auto tabular-nums text-gold">{fmtNum(row.score, locale, 1)}</span>
      </span>
      <span className={line}>
        {t("colAdjusted")}
        <span className={cn("font-semibold tabular-nums", toneClass(row.adjustedWinRate, mean))}>{fmtPct(row.adjustedWinRate, locale)}</span>
      </span>
      <span className={line}>
        {t("colWinRate")}
        <span className="tabular-nums text-text-body">{fmtPct(row.winRate, locale)}</span>
      </span>
      <span className={line}>
        {t("colPick")}
        <span className="tabular-nums text-gold">{fmtPct(row.pick, locale)}</span>
      </span>
      <span className={line}>
        {t("colMatches")}
        <span className="tabular-nums text-gold">{fmtNum(row.matches, locale)}</span>
      </span>
      {deltaTitle !== null && (
        <span className={line}>
          {t("colDelta")}
          <Delta value={row.delta} locale={locale} title={deltaTitle} />
        </span>
      )}
    </span>
  );
}

function LetterLabel({ letter, locale }: { letter: MetaLetter; locale: string }) {
  const floor = letterFloor(letter);
  const cut = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(floor ?? letterFloor("D") ?? 0);
  return (
    <span className="flex flex-col items-center justify-center gap-1 py-2">
      <LetterBadge letter={letter} size="lg" />
      <span className="font-body text-[0.65rem] tabular-nums text-text-faded">{floor !== null ? `${cut}+` : `< ${cut}`}</span>
    </span>
  );
}

export function GradeBoard({ columns, locale, mean, deltaTitle }: Props) {
  const t = useTranslations("metaV3");
  const { query } = useMetaUi();
  const board = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const wide = columns.length === 1;
  const template = wide ? "4.5rem minmax(0,1fr)" : `4.5rem repeat(${columns.length}, minmax(0,1fr))`;

  // Posição em px de layout (offsetLeft), que não muda com o zoom da página em telas de 1440.
  const show = (row: MetaHeroRow, el: HTMLElement) => {
    const width = board.current?.clientWidth ?? TIP_WIDTH;
    const left = Math.max(0, Math.min(el.offsetLeft, width - TIP_WIDTH));
    setTip({ row, left, top: el.offsetTop + el.offsetHeight + 6 });
  };

  return (
    <div ref={board} className="relative rounded-sm border border-border-strong" onMouseLeave={() => setTip(null)}>
      <div className="grid border-b border-border-strong bg-bg-base/90" style={{ gridTemplateColumns: template }}>
        <span />
        {columns.map((c) => (
          <span key={c.key} className="flex items-center gap-2 border-l border-border-subtle px-3 py-2 font-display-condensed text-xl uppercase leading-none tracking-[0.06em] text-text-display">
            {c.icon && <Image src={c.icon} alt="" width={18} height={18} className="size-[18px] object-contain" aria-hidden />}
            {c.label}
          </span>
        ))}
      </div>
      {LETTERS.map((letter) => (
        <div key={letter} className={cn("grid border-b border-border-subtle last:border-b-0", BAND[letter])} style={{ gridTemplateColumns: template }}>
          <LetterLabel letter={letter} locale={locale} />
          {columns.map((c) => (
            <div key={c.key} className="flex min-h-12 flex-wrap content-start gap-1 border-l border-border-subtle p-1.5">
              {c.rows
                .filter((r) => r.letter === letter)
                .map((r) => (
                  <span
                    key={r.id}
                    tabIndex={0}
                    aria-label={r.name}
                    onMouseEnter={(e) => show(r, e.currentTarget)}
                    onFocus={(e) => show(r, e.currentTarget)}
                    onBlur={() => setTip(null)}
                    className={cn(
                      "rounded-sm outline-none transition-[opacity,transform] hover:scale-110 focus-visible:ring-2 focus-visible:ring-gold",
                      !!query && !matchesQuery(r.name, query) && "opacity-20"
                    )}
                  >
                    {wide ? (
                      <Image src={r.portrait} alt="" width={96} height={54} className="h-[54px] w-24 rounded-sm object-cover" />
                    ) : (
                      <Image src={r.face} alt="" width={40} height={40} className="size-8 rounded-sm object-cover min-[2600px]:size-10" />
                    )}
                  </span>
                ))}
            </div>
          ))}
        </div>
      ))}
      {tip && <HeroNumbers tip={tip} locale={locale} mean={mean} deltaTitle={deltaTitle} />}
      <p className="sr-only">{t("boardHint")}</p>
    </div>
  );
}
