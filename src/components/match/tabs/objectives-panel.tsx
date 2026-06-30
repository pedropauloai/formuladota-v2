// Aba Objetivos — timeline de torres, barracas, roshan e first blood.

import { Castle, Swords, Crown, Droplet, Shield } from "lucide-react";
import type { ObjectiveEvent } from "@/lib/dota/match-objectives";

const ICON = {
  tower: Castle,
  barracks: Shield,
  roshan: Crown,
  firstblood: Droplet,
  aegis: Swords,
} as const;

function teamColor(team: "radiant" | "dire" | null): string {
  if (team === "radiant") return "text-[#00C466]";
  if (team === "dire") return "text-brand-primary";
  return "text-text-muted";
}

function teamLabel(team: "radiant" | "dire" | null): string {
  if (team === "radiant") return "Iluminados";
  if (team === "dire") return "Temidos";
  return "";
}

export function ObjectivesPanel({ objectives }: { objectives: ObjectiveEvent[] }) {
  if (!objectives.length) {
    return <p className="font-body text-sm text-text-faded">Sem objetivos registrados.</p>;
  }
  return (
    <ol className="relative space-y-1 border-l border-border-subtle pl-4">
      {objectives.map((o, i) => {
        const Icon = ICON[o.kind];
        return (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-bg-base ring-1 ring-border-subtle">
              <Icon className={`size-2.5 ${teamColor(o.team)}`} />
            </span>
            <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-text-muted">
              {o.min}min
            </span>
            <span className="font-body text-sm text-text-display">{o.text}</span>
            {o.team && (
              <span className={`font-display text-xs uppercase tracking-wide ${teamColor(o.team)}`}>
                {teamLabel(o.team)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
