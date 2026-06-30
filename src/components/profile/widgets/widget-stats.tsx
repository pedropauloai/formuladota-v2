// WidgetStats — HEXÁGONO de performance (radar 6 eixos) + linha-resumo (Pedro
// 2026-06-30: "monte um exágono de performance"). Eixos: Vitórias (winrate), KDA,
// GPM, XPM, MMR e Partidas — normalizados. Preenche o card sem scroll interno.

import { useTranslations } from "next-intl";
import { WidgetShell } from "./widget-shell";
import { PerformanceHexagon, type HexAxis } from "../performance-hexagon";

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
  /** Média recente (STRATZ/OpenDota) — KDA/GPM/XPM por partida. */
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
  externalStats,
  editing,
}: Props) {
  const t = useTranslations("perfil");

  const jogos = partidas ?? 0;
  const winrate = jogos > 0 ? (vitorias ?? 0) / jogos : 0;
  const kda = externalStats?.avgKDA ?? 0;
  const gpm = externalStats?.avgGPM ?? 0;
  const xpm = externalStats?.avgXPM ?? 0;
  const mmrVal = mmr ?? 0;

  const axes: HexAxis[] = [
    { label: t("statVitorias"), value: winrate, display: jogos ? `${Math.round(winrate * 100)}%` : "—" },
    { label: "KDA", value: Math.min(1, kda / 6), display: kda ? kda.toFixed(1) : "—" },
    { label: "GPM", value: Math.min(1, gpm / 800), display: gpm ? String(Math.round(gpm)) : "—" },
    { label: "XPM", value: Math.min(1, xpm / 900), display: xpm ? String(Math.round(xpm)) : "—" },
    { label: t("statMmr"), value: Math.min(1, mmrVal / 7000), display: mmr != null ? String(mmrVal) : "—" },
    { label: t("statPartidas"), value: Math.min(1, jogos / 200), display: String(jogos) },
  ];

  return (
    <WidgetShell title={t("widgetStatsTitle")} editing={editing}>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <PerformanceHexagon axes={axes} />
        </div>
        {/* Resumo de partidas (vitórias/derrotas). */}
        <div className="mt-1 flex shrink-0 items-center justify-center gap-4 border-t border-border-subtle pt-2 font-display text-sm">
          <span className="text-text-muted">
            {jogos} <span className="text-xs uppercase tracking-wide text-text-faded">{t("statPartidas")}</span>
          </span>
          <span className="text-play-primary">
            {vitorias ?? 0}<span className="ml-0.5 text-xs uppercase">V</span>
          </span>
          <span className="text-error">
            {derrotas ?? 0}<span className="ml-0.5 text-xs uppercase">D</span>
          </span>
        </div>
      </div>
    </WidgetShell>
  );
}
