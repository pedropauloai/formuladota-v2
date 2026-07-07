// Aba Gráficos — vantagem de ouro/XP do time (área com sinal) + linhas por jogador
// de ouro/XP/last hits no tempo (estilo STRATZ/OpenDota).

import { useTranslations } from "next-intl";
import type { AdvantageSeries } from "@/lib/dota/match-stats";
import type { PlayerSeries } from "@/lib/dota/match-series";
import { SignedAreaChart } from "@/components/match/charts/signed-area-chart";
import { MultiLineChart, type ChartLine } from "@/components/match/charts/multi-line-chart";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-3">
      <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-text-display">
        {title}
      </h3>
      {children}
    </section>
  );
}

function toLines(series: PlayerSeries[], pick: (s: PlayerSeries) => number[]): ChartLine[] {
  return series.map((s) => ({
    name: s.name,
    color: s.color,
    heroIcon: s.heroIcon,
    values: pick(s),
  }));
}

export function GraphsPanel({
  series,
  advantage,
}: {
  series: PlayerSeries[];
  advantage: AdvantageSeries;
}) {
  const t = useTranslations("scoreboard");
  const rad = t("teamRadiant");
  return (
    <div className="space-y-4">
      <Section title={t("graphWinProb")}>
        <SignedAreaChart
          data={advantage.winProbRadiant.map((p) => p - 0.5)}
          unit=""
          format={(n) => `${Math.round((n + 0.5) * 100)}% ${rad}`}
        />
      </Section>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section title={t("graphGoldAdv")}>
          <SignedAreaChart data={advantage.goldAdv} unit={t("graphUnitGold")} />
        </Section>
        <Section title={t("graphXpAdv")}>
          <SignedAreaChart data={advantage.xpAdv} unit="XP" />
        </Section>
      </div>
      <Section title={t("graphGoldPerPlayer")}>
        <MultiLineChart lines={toLines(series, (s) => s.gold)} />
      </Section>
      <Section title={t("graphXpPerPlayer")}>
        <MultiLineChart lines={toLines(series, (s) => s.xp)} />
      </Section>
      <Section title={t("graphLhPerPlayer")}>
        <MultiLineChart lines={toLines(series, (s) => s.lh)} />
      </Section>
    </div>
  );
}
