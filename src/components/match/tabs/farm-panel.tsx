// Aba Farm/Economia — gráficos de vantagem de ouro e XP no tempo (derivados das
// séries por jogador) + tabela de GPM/XPM/last hits/patrimônio por jogador.

import type { PlayerFull, AdvantageSeries } from "@/lib/dota/match-stats";
import { SignedAreaChart } from "@/components/match/charts/signed-area-chart";
import { StatTable, fmtK, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { label: "GPM", render: (p) => p.gpm, accent: "text-gold" },
  { label: "XPM", render: (p) => p.xpm },
  { label: "Last hits", render: (p) => p.lastHits },
  { label: "Denies", render: (p) => p.denies },
  { label: "Patrimônio", render: (p) => fmtK(p.netWorth), accent: "text-gold" },
];

function ChartCard({
  title,
  data,
  unit,
}: {
  title: string;
  data: number[];
  unit: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-text-display">
          {title}
        </h3>
        <span className="font-body text-xs text-text-faded">
          <span className="text-[#00C466]">Iluminados</span> ▲ /{" "}
          <span className="text-brand-primary">Temidos</span> ▼
        </span>
      </div>
      <SignedAreaChart data={data} unit={unit} />
    </div>
  );
}

export function FarmPanel({
  players,
  advantage,
}: {
  players: PlayerFull[];
  advantage: AdvantageSeries;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Vantagem de ouro" data={advantage.goldAdv} unit="ouro" />
        <ChartCard title="Vantagem de XP" data={advantage.xpAdv} unit="XP" />
      </div>
      <StatTable players={players} columns={COLUMNS} />
    </div>
  );
}
