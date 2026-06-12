// Leitura dos stats de carreira (OpenDota) pra UI de perfil.
//
// Contrato pro agente de UI:
//   getCareerStats(userId) → CareerStats | null
//   - null = sem Steam vinculado OU OpenDota indisponível e sem cache.
//   - Cache fresh (< 24h) é servido sem bater na API; vazio/vencido dispara
//     o sync automaticamente (delegado a syncCareerStats, que é cache-first).
//   - Nunca lança: feito pra Server Component renderizar "sem dados" com null.
//
// Pra forçar refresh manual (botão "atualizar"), chamar direto
// syncCareerStats({ userId, force: true }) de @/app/perfil/actions.

import { syncCareerStats } from "@/app/perfil/actions";
import type { CareerStats } from "@/lib/dota/career";

export type { CareerStats, CareerHeroStat, CareerTotals } from "@/lib/dota/career";

/**
 * Stats de carreira do user — cache-first com TTL 24h.
 * O sync já encapsula: ler cache → fresh? retorna → senão fetch + upsert.
 */
export async function getCareerStats(userId: string): Promise<CareerStats | null> {
  const result = await syncCareerStats({ userId });
  return result.success ? result.data : null;
}
