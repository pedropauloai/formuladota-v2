// WidgetStats — 4 stats numéricos (Partidas/Vitórias/Derrotas/MMR) em grid 2x2.
// Server Component — sem interatividade.

import { WidgetShell } from "./widget-shell";

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
  editing: boolean;
}

export function WidgetStats({ partidas, vitorias, derrotas, mmr, editing }: Props) {
  return (
    <WidgetShell title="Estatísticas" editing={editing}>
      <div className="grid grid-cols-2 gap-3 h-full">
        <StatItem label="Partidas" value={partidas} />
        <StatItem label="Vitórias" value={vitorias} />
        <StatItem label="Derrotas" value={derrotas} />
        <StatItem label="MMR" value={mmr} />
      </div>
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
