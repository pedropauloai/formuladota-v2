// Mural da Vergonha — lista pública de jogadores suspensos/banidos por quebra de
// regra, com o princípio/anti-padrão violado. Coerente com o anti-anonimato
// (nome público, reputação atrelada). Ver docs/foundations/RANKING_SYSTEM.md (Eixo 4).
//
// Lê via RPC wall_of_shame() (SECURITY DEFINER, migration 098) — user_warnings tem
// RLS restrita (admin/próprio), então a RPC expõe só os campos públicos das punições
// APLICADAS pra qualquer um (o Mural é público por design).

import { createClient } from "@/lib/supabase/server";
import { PRINCIPLES, ANTIPATTERNS } from "@/lib/doctrine";
import { steam64To32 } from "@/lib/dota/opendota";

export interface WallEntry {
  userId: string;
  username: string | null;
  status: "suspended" | "banned";
  reason: string | null;
  principle: string | null;
  antipattern: string | null;
  since: string | null; // banned_at (ban) ou issued_at (suspensão)
  suspendedUntil: string | null;
  // Links (anti-anonimato: identidade pública, verificável).
  steamId64: string | null;
  steamId32: number | null;
  dotaMatchId: string | null; // partida onde a punição ocorreu (histórico)
}

interface WallRow {
  user_id: string;
  username: string | null;
  status: "suspended" | "banned";
  banned_at: string | null;
  banned_reason: string | null;
  suspended_until: string | null;
  principle_violated: number | null;
  antipattern_violated: number | null;
  notes: string | null;
  issued_at: string | null;
  dota_match_id: string | null;
  steam_id_64: string | null;
}

const principleTitle = (n: number | null) =>
  n == null ? null : PRINCIPLES.find((p) => p.id === n)?.title ?? null;
const antipatternTitle = (n: number | null) =>
  n == null ? null : ANTIPATTERNS.find((a) => a.id === n)?.title ?? null;

export async function getWallOfShame(): Promise<WallEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("wall_of_shame");
  const rows = (data ?? []) as WallRow[];

  const entries: WallEntry[] = rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    status: r.status,
    reason: r.banned_reason ?? r.notes ?? null,
    principle: principleTitle(r.principle_violated),
    antipattern: antipatternTitle(r.antipattern_violated),
    since: r.status === "banned" ? (r.banned_at ?? null) : (r.issued_at ?? null),
    suspendedUntil: r.suspended_until,
    steamId64: r.steam_id_64,
    steamId32: r.steam_id_64 ? steam64To32(r.steam_id_64) : null,
    dotaMatchId: r.dota_match_id,
  }));

  // Banidos primeiro, depois por data mais recente.
  return entries.sort((a, b) => {
    if (a.status !== b.status) return a.status === "banned" ? -1 : 1;
    return (b.since ?? "").localeCompare(a.since ?? "");
  });
}
