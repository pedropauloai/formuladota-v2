// Helpers do sistema de nível (HONOR) — ladder 0–30.
// O NÍVEL da conta É o HONOR (decisão Pedro 2026-06-02, ver
// docs/foundations/PROGRESSION_SYSTEM via .planning/PROGRESSION_REDESIGN_SPEC.md).
// 5 medalhas nos marcos 6/12/18/25/30 (+ Novato pré-medalha).
// Mapeia tier → ícone Lucide + cor + label PT-BR.

import {
  Sprout,
  GraduationCap,
  Gauge,
  Zap,
  Flame,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type Tier =
  | "novato"
  | "aprendiz"
  | "piloto"
  | "as"
  | "lendario"
  | "mistico";

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
  novato: {
    // 0–5: ainda não provou conhecimento da doutrina. Sem medalha.
    label: "Novato",
    icon: Sprout,
    color: "text-zinc-400",
    bgGradient: "from-zinc-600/20 to-zinc-800/10",
    progressBar: "from-zinc-500 to-zinc-400",
    ringColor: "ring-zinc-400/50",
    borderColor: "border-zinc-500/40",
    levels: [1, 5],
  },
  aprendiz: {
    // 6–11: completou a verificação de doutrina+metodologia = doutrinado.
    label: "Aprendiz",
    icon: GraduationCap,
    color: "text-sky-400",
    bgGradient: "from-sky-400/20 to-sky-600/10",
    progressBar: "from-sky-400 to-sky-200",
    ringColor: "ring-sky-300/60",
    borderColor: "border-sky-400/40",
    levels: [6, 11],
  },
  piloto: {
    // 12–17: aplicando o método nas partidas (Fórmula do Dota de Corrida).
    label: "Piloto",
    icon: Gauge,
    color: "text-emerald-400",
    bgGradient: "from-emerald-400/20 to-emerald-600/10",
    progressBar: "from-emerald-400 to-emerald-200",
    ringColor: "ring-emerald-300/60",
    borderColor: "border-emerald-400/40",
    levels: [12, 17],
  },
  as: {
    // 18–24: domínio da pista — piloto virou ás.
    label: "Ás",
    icon: Zap,
    color: "text-violet-400",
    bgGradient: "from-violet-500/20 to-violet-700/10",
    progressBar: "from-violet-500 to-fuchsia-400",
    ringColor: "ring-violet-400/60",
    borderColor: "border-violet-400/40",
    levels: [18, 24],
  },
  lendario: {
    // 25–29: referência cultural consolidada (guardião da cultura).
    label: "Lendário",
    icon: Flame,
    color: "text-orange-400",
    bgGradient: "from-orange-500/25 to-orange-700/10",
    progressBar: "from-orange-500 to-amber-300",
    ringColor: "ring-orange-400/60",
    borderColor: "border-orange-400/40",
    levels: [25, 29],
  },
  mistico: {
    // 30: topo do ladder. Percepção expandida — compreende o jogo além do jogo.
    label: "Místico",
    icon: Sparkles,
    color: "text-rose-400",
    bgGradient: "from-rose-500/30 via-fuchsia-500/20 to-rose-700/10",
    progressBar: "from-rose-500 via-fuchsia-400 to-rose-300",
    ringColor: "ring-rose-400/70",
    borderColor: "border-rose-400/50",
    levels: [30, 30],
  },
};

export function getTierForLevel(level: number): Tier {
  if (level <= 5) return "novato";
  if (level <= 11) return "aprendiz";
  if (level <= 17) return "piloto";
  if (level <= 24) return "as";
  if (level <= 29) return "lendario";
  return "mistico";
}

// MMR Valve minimo por medalha (escala oficial, mesma de mmrToDotaRank).
const DIVINE_MMR = 5000;
const IMMORTAL_MMR = 6000;

/**
 * Banda HONOR com CO-REQUISITO DE SKILL no topo (decisão Pedro 2026-06-02):
 * Lendário (25) exige medalha Valve Divine+; Místico (30) exige Imortal. Bandas 0–24 = só nível.
 * Se o nível habilita Lendário/Místico mas a medalha (derivada do MMR Valve atual) não alcança,
 * rebaixa pro maior tier permitido. A medalha é dinâmica — passar o MMR atual valida na hora.
 * mmr null/baixo => sem acesso ao topo.
 */
export function getGatedTierForLevel(
  level: number,
  mmr: number | null | undefined,
): Tier {
  const band = getTierForLevel(level);
  const m = mmr ?? 0;
  if (band === "mistico" && m < IMMORTAL_MMR) {
    return m >= DIVINE_MMR ? "lendario" : "as";
  }
  if (band === "lendario" && m < DIVINE_MMR) {
    return "as";
  }
  return band;
}

// Espelho da curva de level_thresholds (migration 021): XP cumulativo pra ATINGIR cada
// nível (índice 0 = nível 1, piso 0). Permite calcular a barra de XP no client sem query.
// Nível N ocupa [CUMULATIVE[N-1], CUMULATIVE[N]). Mantém alinhado com o banco.
const LEVEL_CUMULATIVE_XP: number[] = [
  0, 350, 750, 1250, 1850, 2750, 3750, 4850, 6050, 7350, 8750, // 1–11
  10450, 12250, 14150, 16150, 18250, 20450, // 12–17
  22950, 25550, 28250, 31050, 33950, 36950, 40050, // 18–24
  46850, 50850, 55050, 59450, 64050, 72050, // 25–30
];

/**
 * Dado o XP total acumulado, retorna o nível (1-30) e a fração de progresso (0-1)
 * dentro do nível atual rumo ao próximo. Nível 30 = barra cheia.
 */
export function xpProgress(totalXp: number): { level: number; pct: number } {
  let level = 1;
  for (let i = 0; i < LEVEL_CUMULATIVE_XP.length; i++) {
    if (totalXp >= LEVEL_CUMULATIVE_XP[i]!) level = i + 1;
    else break;
  }
  if (level >= 30) return { level: 30, pct: 1 };
  const floor = LEVEL_CUMULATIVE_XP[level - 1]!;
  const ceil = LEVEL_CUMULATIVE_XP[level]!;
  const pct = ceil > floor ? (totalXp - floor) / (ceil - floor) : 0;
  return { level, pct: Math.max(0, Math.min(1, pct)) };
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
