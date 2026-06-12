// WidgetStats — 4 stats numéricos (Partidas/Vitórias/Derrotas/MMR) em grid 2x2
// + linha de VETERANIA de carreira (Abates/Assistências/Last hits, OpenDota)
// encaixada DENTRO do widget existente (2026-06-11 — feedback Pedro: carreira
// ocupa espaços que já existem, sem seção nova nem rolagem extra; a altura do
// widget é fixa pelo grid, então a página não cresce).
// Server Component — sem interatividade.

import { WidgetShell } from "./widget-shell";
import type { CareerTotals } from "@/lib/dota/career";

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
  /** Acumulados de carreira — null = sem Steam/sem dados (linha não renderiza). */
  careerTotals: CareerTotals | null;
  editing: boolean;
}

export function WidgetStats({
  partidas,
  vitorias,
  derrotas,
  mmr,
  careerTotals,
  editing,
}: Props) {
  return (
    <WidgetShell title="Estatísticas" editing={editing}>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="Partidas" value={partidas} />
        <StatItem label="Vitórias" value={vitorias} />
        <StatItem label="Derrotas" value={derrotas} />
        <StatItem label="MMR" value={mmr} />
      </div>

      {/* Veterania de carreira — números de valor → família GOLD */}
      {careerTotals && (
        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border-subtle pt-2">
          <VeterancyItem label="Abates" value={careerTotals.kills} />
          <VeterancyItem label="Assists" value={careerTotals.assists} />
          <VeterancyItem label="Last hits" value={careerTotals.lastHits} />
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
function VeterancyItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-wide text-gold-muted">
        {label}
      </p>
      <p className="font-display-condensed text-[18px] font-bold text-gold tabular-nums leading-none mt-0.5">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
