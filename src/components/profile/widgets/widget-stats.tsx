// WidgetStats — 4 stats numéricos (Partidas/Vitórias/Derrotas/MMR) em grid 2x2
// + linha de VETERANIA de carreira (Abates/Assistências/Last hits, OpenDota)
// encaixada DENTRO do widget existente (2026-06-11 — feedback Pedro: carreira
// ocupa espaços que já existem, sem seção nova nem rolagem extra; a altura do
// widget é fixa pelo grid, então a página não cresce).
// Server Component — sem interatividade.

import { useTranslations } from "next-intl";
import { WidgetShell } from "./widget-shell";
import type { CareerTotals } from "@/lib/dota/career";

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
  /** Acumulados de carreira — null = sem Steam/sem dados (linha não renderiza). */
  careerTotals: CareerTotals | null;
  /** Média recente (STRATZ/OpenDota) — linha extra (antes era seção separada). */
  externalStats: {
    source: string;
    avgKDA: number;
    avgGPM: number;
    avgXPM: number;
  } | null;
  editing: boolean;
}

export function WidgetStats({
  partidas,
  vitorias,
  derrotas,
  mmr,
  careerTotals,
  externalStats,
  editing,
}: Props) {
  const t = useTranslations("perfil");
  const hasExternal = externalStats && externalStats.avgKDA > 0;
  return (
    <WidgetShell title={t("widgetStatsTitle")} editing={editing}>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label={t("statPartidas")} value={partidas} />
        <StatItem label={t("statVitorias")} value={vitorias} />
        <StatItem label={t("statDerrotas")} value={derrotas} />
        <StatItem label={t("statMmr")} value={mmr} />
      </div>

      {/* Veterania de carreira — números de valor → família GOLD */}
      {careerTotals && (
        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border-subtle pt-2">
          <VeterancyItem label={t("statKills")} value={careerTotals.kills} />
          <VeterancyItem label={t("statAssistsShort")} value={careerTotals.assists} />
          <VeterancyItem label={t("statLastHits")} value={careerTotals.lastHits} />
        </div>
      )}

      {/* Média recente (KDA/GPM/XPM) — integrada aqui pra não criar seção extra. */}
      {hasExternal && (
        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border-subtle pt-2">
          <VeterancyItem label={t("statAvgKda")} value={externalStats.avgKDA} decimals={2} />
          <VeterancyItem label={t("statAvgGpm")} value={Math.round(externalStats.avgGPM)} />
          <VeterancyItem label={t("statAvgXpm")} value={Math.round(externalStats.avgXPM)} />
        </div>
      )}
    </WidgetShell>
  );
}

function StatItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </p>
      <p className="font-display-condensed text-[24px] font-bold text-text-display tabular-nums leading-none mt-0.5">
        {value ?? "—"}
      </p>
    </div>
  );
}

// Célula compacta de veterania — menor que StatItem pra caber na altura fixa.
function VeterancyItem({
  label,
  value,
  decimals,
}: {
  label: string;
  value: number;
  decimals?: number;
}) {
  const text =
    decimals != null ? value.toFixed(decimals) : value.toLocaleString("pt-BR");
  return (
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-wide text-gold-muted">
        {label}
      </p>
      <p className="font-display-condensed text-[18px] font-bold text-gold tabular-nums leading-none mt-0.5">
        {text}
      </p>
    </div>
  );
}
