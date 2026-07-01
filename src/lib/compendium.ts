// Compendium — trilha do passe da temporada + missões (lib PURA de domínio).
// Fase 2 (motor de XP dedicado) ainda não existe: por ora a trilha reflete o progresso
// por NÍVEL de conta (0-30) e cada tier é um marco. Ver docs/foundations/COMPENDIUM.md.

import type { Tier } from "@/lib/levels";

export interface CompendiumMilestone {
  tier: Tier;
  /** Nível de conta que desbloqueia este marco. */
  level: number;
  /** Recompensa da trilha GRÁTIS (chave i18n compendium.rewards.*). */
  freeRewardKey: string;
  /** Recompensa da trilha PAGA (Aegis/Godlike). */
  paidRewardKey: string;
}

// 6 marcos = os 6 tiers (Novato → Místico). Espelha a escada de mérito/cosméticos.
export const COMPENDIUM_TRACK: CompendiumMilestone[] = [
  { tier: "novato", level: 1, freeRewardKey: "ringNovato", paidRewardKey: "frameBrand" },
  { tier: "aprendiz", level: 6, freeRewardKey: "badgeDoutrinado", paidRewardKey: "smokeEmber" },
  { tier: "piloto", level: 12, freeRewardKey: "ringPiloto", paidRewardKey: "frameGold" },
  { tier: "as", level: 18, freeRewardKey: "ringAs", paidRewardKey: "nameEffect" },
  { tier: "lendario", level: 25, freeRewardKey: "ringLendario", paidRewardKey: "profileTheme" },
  { tier: "mistico", level: 30, freeRewardKey: "ringMistico", paidRewardKey: "smokeMystic" },
];

export interface WeeklyMission {
  /** Chave i18n compendium.missions.*. */
  key: string;
  /** XP do passe concedido (referência — motor é Fase 2). */
  xp: number;
}

// Missões semanais — o motor de XP do passe (doutrina + partidas), Pedro 2026-07-01.
export const WEEKLY_MISSIONS: WeeklyMission[] = [
  { key: "doutrina", xp: 60 },
  { key: "jogar", xp: 40 },
  { key: "vencer", xp: 90 },
  { key: "convidar", xp: 30 },
];
