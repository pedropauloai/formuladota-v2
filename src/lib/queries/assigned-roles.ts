// Posições ATRIBUÍDAS no matchmaking (lobby_players.role) — fonte ÚNICA e CORRETA da
// função de cada jogador (Pedro 2026-07-05). Substitui a inferência por net worth: o
// patrimônio NÃO define a role (offlane pode ter mais NW que o mid, etc.). O net worth
// vira só FALLBACK pra partida sem atribuição (jogador externo/legado).
//
// Link: lobby_players (por sala) → lobbies.dota_match_id → o mesmo dota_match_id do
// match. `lobby_players.role` é coluna nova (migration 059) fora dos tipos gerados → cast.

import { ASSIGNED_ROLE_TO_POSITION } from "@/lib/mmr";

type SelectEqMaybe = {
  select: (c: string) => {
    eq: (c: string, v: string) => {
      maybeSingle: () => Promise<{ data: { id: string } | null }>;
    };
  };
};
type SelectEqList = {
  select: (c: string) => {
    eq: (
      c: string,
      v: string
    ) => PromiseLike<{ data: Array<{ user_id: string; role: string | null }> | null }>;
  };
};

/** Map user_id → posição 1-5 atribuída no matchmaking. Vazio se não houver sala/roles
 *  (o caller então cai no fallback por net worth). */
export async function getAssignedPositionsByDotaMatchId(
  supabase: { from: (table: string) => unknown },
  dotaMatchId: string | null | undefined
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!dotaMatchId) return out;

  const { data: lobby } = await (supabase.from("lobbies") as SelectEqMaybe)
    .select("id")
    .eq("dota_match_id", dotaMatchId)
    .maybeSingle();
  if (!lobby?.id) return out;

  const { data } = await (supabase.from("lobby_players") as SelectEqList)
    .select("user_id, role")
    .eq("lobby_id", lobby.id);

  for (const r of data ?? []) {
    const pos = r.role ? ASSIGNED_ROLE_TO_POSITION[r.role] : undefined;
    if (pos && r.user_id) out.set(r.user_id, pos);
  }
  return out;
}
