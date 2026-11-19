// "Como funciona o revezamento": os três passos e, ao lado, uma fila de exemplo ordenada pela última
// vez na party, com uma luz que sai do primeiro (que joga) e volta para o fim: o movimento explica a
// regra. O texto fica parado; com "menos movimento" ligado, a luz some e a seta continua.

import { useTranslations } from "next-intl";
import { RotateCcw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/v2";
import { CARD_TITLE, SECTION_TITLE, WRAP } from "./layout";

type Row = { kind: "never" } | { kind: "days"; days: number } | { kind: "you"; days: number } | { kind: "now" };

// Linhas de 3,25rem com 0,5rem entre elas: 18,25rem de fila, a mesma medida do desenho da seta.
const ROWS: Row[] = [{ kind: "never" }, { kind: "days", days: 9 }, { kind: "you", days: 6 }, { kind: "days", days: 2 }, { kind: "now" }];
const CYCLE = "M2 26 C 40 26, 40 266, 2 266";

function QueueRow({ row, position }: { row: Row; position: number }) {
  const t = useTranslations("battlepass");
  const you = row.kind === "you";
  const label =
    row.kind === "never" ? t("exampleNever") : row.kind === "now" ? t("exampleNow") : t("exampleDaysAgo", { count: row.days });
  return (
    <li
      className={cn(
        "flex h-[3.25rem] items-center gap-3 rounded-sm border px-3",
        you ? "border-gold/60 bg-gold/10" : "border-border-subtle bg-bg-deep/50",
        row.kind === "now" && "opacity-60"
      )}
    >
      <span className="w-5 shrink-0 text-center font-display-condensed text-[1.5rem] leading-none text-gold">{position}</span>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm", you ? "bg-gold/20 text-gold" : "bg-bg-elevated text-text-faded")}>
        <User size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm leading-tight text-text-body">
        {you && <strong className="block font-bold text-gold">{t("exampleYou")}</strong>}
        <span className={cn("block", you ? "truncate" : "line-clamp-2")}>{label}</span>
      </span>
      {position === 1 && <span className="shrink-0 text-xs font-bold text-play-primary">{t("exampleNext")}</span>}
    </li>
  );
}

/** A seta do primeiro da fila até o fim, com a luz que percorre o caminho. */
function CycleArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 292" className="pointer-events-none absolute right-0 top-0 h-[18.25rem] w-[2.75rem] overflow-visible text-gold">
      <path d={CYCLE} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M10 260 L2 266 L10 272" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle r="4" fill="currentColor" className="[filter:drop-shadow(0_0_6px_var(--color-gold))] motion-reduce:hidden">
        <animateMotion dur="3.2s" repeatCount="indefinite" path={CYCLE} />
      </circle>
    </svg>
  );
}

function ExampleQueue() {
  const t = useTranslations("battlepass");
  return (
    <Panel className="p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={CARD_TITLE}>{t("exampleTitle")}</h3>
        <p className="text-xs text-text-muted">{t("exampleCaption")}</p>
      </div>
      <div className="relative mt-4 pr-12">
        <ol aria-label={t("exampleTitle")} className="space-y-2">
          {ROWS.map((row, i) => (
            <QueueRow key={`${row.kind}-${i}`} row={row} position={i + 1} />
          ))}
        </ol>
        <CycleArrow />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <RotateCcw size={14} className="shrink-0 text-gold" aria-hidden="true" />
        {t("exampleBack")}
      </p>
    </Panel>
  );
}

export function BattlepassRotation() {
  const t = useTranslations("battlepass");
  const steps = [t("rotationStep1"), t("rotationStep2"), t("rotationStep3")];
  return (
    <section aria-labelledby="bp-revezamento" className={cn(WRAP, "mt-16 md:mt-24")}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center 2xl:gap-12">
        <div className="space-y-5">
          <h2 id="bp-revezamento" className={SECTION_TITLE}>
            {t("rotationTitle")}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-text-muted md:text-base">{t("rotationIntro")}</p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step} className="flex items-start gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-bg-deep font-display-condensed text-[1.4rem] leading-none text-gold shadow-[inset_0_0_0_1px_var(--color-border-gold)]">
                  {i + 1}
                </span>
                <span className="pt-1.5 text-sm leading-relaxed text-text-body md:text-base">{step}</span>
              </li>
            ))}
          </ol>
          <p className="border-l-2 border-gold/60 pl-4 text-sm leading-relaxed text-text-muted">{t("rotationNoShow")}</p>
        </div>
        <ExampleQueue />
      </div>
    </section>
  );
}
