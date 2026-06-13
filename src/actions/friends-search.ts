"use server";
// Busca server-side de jogadores pra adicionar como amigo (pacote social
// 2026-06-12 — missão 1, ref campo "BUSCAR AMIGOS" do client Dota 2).
//
// Fontes (em batch, sem N+1):
//   - steam_links.persona  → SELECT público (migration 054) — identidade
//     canônica anti-anonimato, encontra QUALQUER jogador com Steam vinculada.
//   - profiles.username    → best-effort: a RLS de profiles é restritiva
//     (próprio/admin/coaches), então esse braço só acha coaches pra viewers
//     comuns — e tudo pra admin. Sem service-role aqui (convenção do projeto:
//     service client é só pra webhooks).
//
// Exclui: o próprio user e qualquer relação existente (amigo/pendente/blocked).

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { displayName, displayAvatar } from "@/lib/identity";

export interface PlayerSearchResult {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

const QuerySchema = z
  .string()
  .trim()
  .min(3, "Digite pelo menos 3 caracteres")
  .max(40, "Busca longa demais");

const RESULT_LIMIT = 8;

/** Escapa curingas do ILIKE — busca literal, não pattern injection. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function searchPlayers(
  rawQuery: string
): Promise<PlayerSearchResult[]> {
  const parsed = QuerySchema.safeParse(rawQuery);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const pattern = `%${escapeLike(parsed.data)}%`;

  // 3 queries paralelas: personas Steam + usernames Discord + minhas relações.
  const [steamRes, profileRes, relationsRes] = await Promise.all([
    supabase
      .from("steam_links")
      .select("user_id, persona, avatar_url")
      .ilike("persona", pattern)
      .limit(RESULT_LIMIT * 2),
    supabase
      .from("profiles")
      .select("id, username, avatar_url, avatar_custom_url")
      .ilike("username", pattern)
      .limit(RESULT_LIMIT * 2),
    // RLS já filtra pras MINHAS friendships — qualquer status conta como "já existe".
    supabase.from("friendships").select("requester_id, addressee_id"),
  ]);

  // Quem já tem relação comigo (qualquer direção/status) sai dos resultados.
  const excluded = new Set<string>([user.id]);
  for (const r of relationsRes.data ?? []) {
    excluded.add(r.requester_id);
    excluded.add(r.addressee_id);
  }

  // Merge: Steam primeiro (identidade canônica), Discord complementa.
  const byId = new Map<
    string,
    { steamPersona?: string | null; steamAvatar?: string | null; discordUsername?: string | null; discordAvatar?: string | null }
  >();

  for (const s of steamRes.data ?? []) {
    if (excluded.has(s.user_id)) continue;
    byId.set(s.user_id, { steamPersona: s.persona, steamAvatar: s.avatar_url });
  }
  for (const p of profileRes.data ?? []) {
    if (excluded.has(p.id)) continue;
    const existing = byId.get(p.id) ?? {};
    byId.set(p.id, {
      ...existing,
      discordUsername: p.username,
      discordAvatar: p.avatar_custom_url ?? p.avatar_url,
    });
  }

  return [...byId.entries()].slice(0, RESULT_LIMIT).map(([userId, src]) => ({
    userId,
    name: displayName(src),
    avatarUrl: displayAvatar(src),
  }));
}
