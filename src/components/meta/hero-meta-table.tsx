// Visualização do meta de heróis (aba /meta) — Server Component, padrão denso do
// cliente Dota 2. Filtro só por FUNÇÃO (como o dota2protracker). Imagens oficiais
// Valve: face quadrada (minimapa) do herói + ícone de atributo. Win rate com
// mini-barra (magnitude salta aos olhos) e cor por desempenho. Pele FormulaDota.

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ATTR_ICON_URL, POSITION_ICON } from "@/lib/dota/hero-assets";
import type { MetaRow, MetaPosition } from "@/lib/dota/hero-meta";

export interface MetaFilterState {
  position: MetaPosition;
}

const POSITIONS: MetaPosition[] = ["all", "1", "2", "3", "4", "5"];

function href(position: MetaPosition): string {
  return `/meta?position=${position}`;
}

// Largura da barra de win rate: mapeia 42%–56% → 0–100% (clamp).
function barPct(winRate: number): number {
  return Math.max(0, Math.min(100, ((winRate - 42) / (56 - 42)) * 100));
}

export function MetaFilters({ state }: { state: MetaFilterState }) {
  const t = useTranslations("meta");
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 font-display text-sm font-semibold uppercase tracking-widest text-text-faded">
        {t("filterPosition")}
      </span>
      {POSITIONS.map((p) => (
        <Chip
          key={p}
          to={href(p)}
          label={t(`pos${p === "all" ? "All" : p}`)}
          active={state.position === p}
          icon={p === "all" ? undefined : POSITION_ICON[p]}
        />
      ))}
    </div>
  );
}

function Chip({
  to,
  label,
  active,
  icon,
}: {
  to: string;
  label: string;
  active: boolean;
  icon?: string;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 font-display-condensed text-base uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-brand-primary bg-brand-primary/15 text-text-display"
          : "border-border-strong bg-bg-base text-text-body hover:border-border-brand hover:text-text-display"
      )}
    >
      {icon && (
        <Image src={icon} alt="" width={16} height={16} className="h-4 w-4 object-contain" aria-hidden />
      )}
      {label}
    </Link>
  );
}

// ── Cards de destaque (Top picks) ─────────────────────────────────────────────
export function TopHeroes({ rows }: { rows: MetaRow[] }) {
  const t = useTranslations("meta");
  const top = rows.slice(0, 6);
  if (top.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-text-faded">
        {t("topHeroes")}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {top.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-2"
          >
            <Image src={row.face} alt={row.name} width={40} height={40} className="rounded-sm object-cover" />
            <div className="min-w-0">
              <p className="truncate font-body text-sm font-medium text-text-display">{row.name}</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-gold">
                {row.winRate.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tabela ────────────────────────────────────────────────────────────────────
export function MetaTable({ rows }: { rows: MetaRow[] }) {
  const t = useTranslations("meta");
  return (
    <div>
      <div className="flex items-center gap-4 px-4 pb-2 font-display text-sm font-semibold uppercase tracking-widest text-text-faded">
        <span className="w-8 text-right">#</span>
        <span className="w-9" aria-hidden="true" />
        <span className="flex-1">{t("colHero")}</span>
        <span className="w-10 text-center">{t("colAttr")}</span>
        <span className="hidden w-20 text-right sm:inline">{t("colMatches")}</span>
        <span className="w-16 text-right">{t("colPickRate")}</span>
        <span className="w-28 text-right">{t("colWinRate")}</span>
      </div>
      <ol className="space-y-1.5">
        {rows.map((row, idx) => (
          <MetaRowItem key={row.id} row={row} position={idx + 1} />
        ))}
      </ol>
    </div>
  );
}

function MetaRowItem({ row, position }: { row: MetaRow; position: number }) {
  const positive = row.winRate >= 50;
  return (
    <li className="flex items-center gap-4 rounded-md border border-border-subtle bg-bg-base p-2.5 transition-colors hover:border-border-brand">
      <span className="w-8 text-right font-display text-base tabular-nums text-gold">{position}</span>
      {/* Face quadrada (minimapa) — avatar SEMPRE rounded-sm (padrão Steam/Dota) */}
      <Image src={row.face} alt={row.name} width={36} height={36} className="rounded-sm object-cover" />
      <span className="flex-1 min-w-0 truncate font-body text-sm font-medium text-text-display">
        {row.name}
      </span>
      {/* Ícone oficial de atributo */}
      <span className="flex w-10 justify-center">
        <Image
          src={ATTR_ICON_URL[row.attr]}
          alt={row.attr.toUpperCase()}
          width={18}
          height={18}
          className="object-contain"
        />
      </span>
      <span className="hidden w-20 text-right font-mono text-sm tabular-nums text-text-muted sm:inline">
        {row.matches.toLocaleString("pt-BR")}
      </span>
      <span className="w-16 text-right font-mono text-sm tabular-nums text-text-muted">
        {row.pickRate.toFixed(1)}%
      </span>
      {/* Win rate com mini-barra: magnitude visível + cor por desempenho */}
      <div className="relative h-6 w-28 overflow-hidden rounded-sm bg-bg-elevated">
        <div
          className={cn("absolute inset-y-0 left-0", positive ? "bg-success/25" : "bg-brand-primary/20")}
          style={{ width: `${barPct(row.winRate)}%` }}
          aria-hidden="true"
        />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-end pr-2 font-mono text-sm font-semibold tabular-nums",
            positive ? "text-gold" : "text-text-muted"
          )}
        >
          {row.winRate.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}
