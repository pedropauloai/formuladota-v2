// Resolução BATCH de identidade Steam pra read-models (filas, lobbies, ranking,
// times, amigos). Server-only.
//
// Contexto (migration 054, 2026-06-12): steam_links agora tem SELECT público —
// listas de TERCEIROS podem (e devem) exibir a identidade Steam canônica em vez
// do nick/foto do Discord. A prioridade Steam > Discord vive em src/lib/identity.ts;
// este módulo só resolve o problema de BUSCAR personas em lote (1 query .in(),
// nunca N+1) e aplicar a lib por linha.

import { createClient } from "@/lib/supabase/server";
import { displayName, displayAvatar, type IdentitySources } from "@/lib/identity";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface SteamIdentity {
  persona: string | null;
  avatarUrl: string | null;
}

/** Mapa user_id → identidade Steam (vazio quando o user não vinculou Steam). */
export type SteamIdentityMap = Map<string, SteamIdentity>;

/**
 * Busca steam_links dos userIds em UMA query batch.
 * Tolerante a lista vazia e a users sem vínculo (simplesmente não entram no mapa).
 */
export async function getSteamIdentityMap(
  supabase: ServerClient,
  userIds: string[]
): Promise<SteamIdentityMap> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("steam_links")
    .select("user_id, persona, avatar_url")
    .in("user_id", ids);

  return new Map(
    (data ?? []).map((s) => [
      s.user_id,
      { persona: s.persona, avatarUrl: s.avatar_url },
    ])
  );
}

export interface ResolvedIdentity {
  name: string;
  avatarUrl: string | null;
}

/**
 * FONTE ÚNICA de identidade pra read-models de TERCEIROS (ranking, sidebar, feed…):
 * resolve {name, avatarUrl} por user em 1 par de queries batch, SEM depender do
 * viewer. Lê o Discord (username/avatar) da VIEW pública `public_player_identities`
 * (migration 107 — fura a RLS de profiles só nas 3 colunas de identidade), então
 * funciona pra visitante e usuário comum também (antes caía no nick Steam porque a
 * RLS de profiles escondia o username). Nome = Discord-first; avatar = Steam-first.
 */
export async function getIdentityMap(
  supabase: ServerClient,
  userIds: string[]
): Promise<Map<string, ResolvedIdentity>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const [discordRes, steamMap] = await Promise.all([
    supabase.from("public_player_identities").select("id, username, avatar_url").in("id", ids),
    getSteamIdentityMap(supabase, ids),
  ]);
  const discord = new Map(
    (discordRes.data ?? []).map((d) => [d.id, { username: d.username, avatar: d.avatar_url }])
  );

  const out = new Map<string, ResolvedIdentity>();
  for (const id of ids) {
    const d = discord.get(id);
    out.set(id, resolveIdentity(steamMap, id, d?.username, d?.avatar));
  }
  return out;
}

/**
 * Resolve nome/avatar canônicos de UM user a partir do mapa Steam + dados Discord
 * (profiles). Nome = Discord-first; avatar = Steam-first — regra da lib/identity.
 */
export function resolveIdentity(
  steamMap: SteamIdentityMap,
  userId: string,
  discordUsername?: string | null,
  discordAvatar?: string | null
): { name: string; avatarUrl: string | null } {
  const steam = steamMap.get(userId);
  const src: IdentitySources = {
    steamPersona: steam?.persona,
    steamAvatar: steam?.avatarUrl,
    discordUsername,
    discordAvatar,
  };
  return { name: displayName(src), avatarUrl: displayAvatar(src) };
}
