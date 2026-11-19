// Busca de jogador para a cortesia do painel da fila: pelo nome do Discord, pelo apelido, pelo nome
// da Steam ou pelo ID do Dota. Só volta quem tem Steam vinculada, porque o convite sai pelo ID do Dota.
// Service role; quem chama (a ação do painel) confere antes se é admin.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { steam64To32 } from "@/lib/dota/opendota";

export interface PlayerHit {
  userId: string;
  name: string;
  avatarUrl: string | null;
  steamPersona: string | null;
  dotaId: string;
}

const STEAM64_BASE = BigInt("76561197960265728");
const LIMIT = 8;

/** Texto livre vira um padrão seguro para o filtro do PostgREST (sem vírgula, parêntese nem curinga). */
function cleanQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 40);
}

async function candidateIds(q: string): Promise<string[]> {
  const supabase = createServiceClient();
  const like = `%${q}%`;
  const byDotaId = /^\d{3,12}$/.test(q) ? (STEAM64_BASE + BigInt(q)).toString() : null;
  const [names, steam] = await Promise.all([
    supabase.from("public_player_identities").select("id").or(`username.ilike.${like},handle.ilike.${like}`).limit(LIMIT),
    supabase
      .from("steam_links")
      .select("user_id")
      .or(byDotaId ? `persona.ilike.${like},steam_id_64.eq.${byDotaId}` : `persona.ilike.${like}`)
      .limit(LIMIT),
  ]);
  const failed = names.error ?? steam.error;
  if (failed) throw new Error(`buscar jogador falhou: ${failed.message}`);
  const ids = [...(steam.data ?? []).map((s) => s.user_id), ...(names.data ?? []).map((n) => n.id)];
  return [...new Set(ids.filter((id): id is string => !!id))];
}

export async function searchPlayers(raw: string): Promise<PlayerHit[]> {
  const q = cleanQuery(raw);
  if (q.length < 2) return [];
  const ids = await candidateIds(q);
  if (ids.length === 0) return [];
  const { data: links, error } = await createServiceClient().from("steam_links").select("user_id, steam_id_64, persona").in("user_id", ids);
  if (error) throw new Error(`ler a Steam dos jogadores falhou: ${error.message}`);
  const withSteam = (links ?? []).filter((l) => /^\d{17}$/.test(l.steam_id_64));
  const identities = await getIdentityMap(await createClient(), withSteam.map((l) => l.user_id));
  return withSteam.slice(0, LIMIT).map((l) => ({
    userId: l.user_id,
    name: identities.get(l.user_id)?.name ?? l.persona ?? "Jogador",
    avatarUrl: identities.get(l.user_id)?.avatarUrl ?? null,
    steamPersona: l.persona,
    dotaId: String(steam64To32(l.steam_id_64)),
  }));
}
