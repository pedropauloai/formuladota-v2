// Aba Benchmarks — percentis de cada jogador (GPM/XPM/LH/dano…) vs a base de
// partidas do OpenDota. Barra preenchida pelo percentil; cor por faixa.

import type { PlayerFull, BenchRow } from "@/lib/dota/match-stats";
import { splitTeams, fmtK, PlayerLabel, TeamHeader } from "@/components/match/shared";

// Cor da barra por percentil (vermelho fraco → dourado → verde forte).
function barColor(pct: number): string {
  if (pct >= 0.7) return "bg-[#00C466]";
  if (pct >= 0.4) return "bg-gold";
  return "bg-brand-primary";
}

function BenchBar({ row }: { row: BenchRow }) {
  const widthPct = Math.max(2, Math.min(100, Math.round(row.pct * 100)));
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 font-display text-[0.65rem] uppercase tracking-wide text-text-faded">
        {row.label}
      </span>
      <div className="relative h-3.5 flex-1 overflow-hidden rounded-sm bg-bg-surface">
        <div
          className={`absolute inset-y-0 left-0 ${barColor(row.pct)}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted">
        {fmtK(row.raw)}
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-text-display">
        {Math.round(row.pct * 100)}
      </span>
    </div>
  );
}

function PlayerBench({ p }: { p: PlayerFull }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="mb-2.5 border-b border-border-subtle/60 pb-2">
        <PlayerLabel p={p} />
      </div>
      <div className="space-y-1.5">
        {p.benchmarks.map((row) => (
          <BenchBar key={row.label} row={row} />
        ))}
      </div>
    </div>
  );
}

export function BenchmarksPanel({ players }: { players: PlayerFull[] }) {
  const { radiant, dire } = splitTeams(players);
  return (
    <div className="space-y-5">
      {/* Espelha a aba MMR: Iluminados (Radiant) à esquerda, Temidos (Dire) à direita. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["radiant", "dire"] as const).map((team) => {
          const list = team === "radiant" ? radiant : dire;
          return (
            <div key={team}>
              <TeamHeader team={team} />
              <div className="space-y-3">
                {list.map((p, i) => (
                  <PlayerBench key={p.userId ?? `${team}-${i}`} p={p} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-body text-xs text-text-faded">
        Percentil = posição da métrica vs a base de partidas do OpenDota (100 = melhor).
      </p>
    </div>
  );
}
