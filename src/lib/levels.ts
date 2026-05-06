// Helpers do sistema de level — Phase 8.
// Mapeia tier → ícone Lucide + cor + label PT-BR.

import {
  Award,
  Medal,
  Trophy,
  Crown,
  Star,
  Gem,
  type LucideIcon,
} from "lucide-react";

export type Tier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "master"
  | "grandmaster";

export interface TierConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  /** Gradient sólido pra progress bar (não translúcido) */
  progressBar: string;
  /** Cor do ring quando este tier está "current" */
  ringColor: string;
  borderColor: string;
  levels: [number, number];
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  bronze: {
    label: "Bronze",
    icon: Award,
    color: "text-amber-700",
    bgGradient: "from-amber-800/20 to-amber-900/10",
    progressBar: "from-amber-700 to-amber-500",
    ringColor: "ring-amber-700/60",
    borderColor: "border-amber-700/40",
    levels: [1, 5],
  },
  silver: {
    label: "Prata",
    icon: Medal,
    color: "text-slate-300",
    bgGradient: "from-slate-400/20 to-slate-600/10",
    progressBar: "from-slate-400 to-slate-200",
    ringColor: "ring-slate-300/60",
    borderColor: "border-slate-400/40",
    levels: [6, 11],
  },
  gold: {
    label: "Ouro",
    icon: Trophy,
    color: "text-amber-400",
    bgGradient: "from-amber-400/20 to-amber-600/10",
    progressBar: "from-amber-400 to-yellow-300",
    ringColor: "ring-amber-400/60",
    borderColor: "border-amber-400/40",
    levels: [12, 17],
  },
  platinum: {
    label: "Platina",
    icon: Crown,
    color: "text-cyan-300",
    bgGradient: "from-cyan-400/20 to-cyan-600/10",
    progressBar: "from-cyan-400 to-cyan-200",
    ringColor: "ring-cyan-300/60",
    borderColor: "border-cyan-400/40",
    levels: [18, 24],
  },
  master: {
    label: "Mestre",
    icon: Star,
    color: "text-violet-400",
    bgGradient: "from-violet-500/20 to-violet-700/10",
    progressBar: "from-violet-500 to-fuchsia-400",
    ringColor: "ring-violet-400/60",
    borderColor: "border-violet-400/40",
    levels: [25, 29],
  },
  grandmaster: {
    label: "Grão-Mestre",
    icon: Gem,
    color: "text-rose-400",
    bgGradient: "from-rose-500/30 via-fuchsia-500/20 to-rose-700/10",
    progressBar: "from-rose-500 via-fuchsia-400 to-rose-300",
    ringColor: "ring-rose-400/70",
    borderColor: "border-rose-400/50",
    levels: [30, 30],
  },
};

export function getTierForLevel(level: number): Tier {
  if (level <= 5) return "bronze";
  if (level <= 11) return "silver";
  if (level <= 17) return "gold";
  if (level <= 24) return "platinum";
  if (level <= 29) return "master";
  return "grandmaster";
}

export const XP_SOURCE_LABELS: Record<string, string> = {
  match_completed: "Partida concluída",
  doctrine_accepted: "Doutrina aceita",
  doctrine_accepted_backfill: "Doutrina aceita",
  badge_earned: "Badge conquistada",
  badge_earned_backfill: "Badge conquistada",
  tournament_register: "Inscrição em torneio",
  tournament_won: "Vitória em torneio",
  daily_login: "Login diário",
};
