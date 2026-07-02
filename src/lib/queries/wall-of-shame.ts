// Mural da Vergonha — lista pública de jogadores suspensos/banidos por quebra de
// regra, com o princípio/anti-padrão violado. Coerente com o anti-anonimato
// (nome público, reputação atrelada). Ver docs/foundations/RANKING_SYSTEM.md (Eixo 4).

import { createClient } from "@/lib/supabase/server";
import { PRINCIPLES, ANTIPATTERNS } from "@/lib/doctrine";

export interface WallEntry {
  userId: string;
  username: string | null;
  status: "suspended" | "banned";
  reason: string | null;
  principle: string | null;
  antipattern: string | null;
  since: string | null; // banned_at (ban) ou issued_at (suspensão)
  suspendedUntil: string | null;
}

const principleTitle = (n: number | null) =>
  n == null ? null : PRINCIPLES.find((p) => p.id === n)?.title ?? null;
const antipatternTitle = (n: number | null) =>
  n == null ? null : ANTIPATTERNS.find((a) => a.id === n)?.title ?? null;

export async function getWallOfShame(): Promise<WallEntry[]> {
  const supabase = await createClient();

  // Quem está suspenso ou banido (o gate de acesso do Eixo 4).
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, behavior_status, banned_at, banned_reason, suspended_until")
    .in("behavior_status", ["suspended", "banned"]);

  const rows = profs ?? [];
  if (rows.length === 0) return [];

  // Warning aplicado mais recente de cada um (princípio/anti-padrão/motivo).
  const ids = rows.map((r) => r.id);
  const { data: warnings } = await supabase
    .from("user_warnings")
    .select("user_id, principle_violated, antipattern_violated, notes, issued_at, status")
    .in("user_id", ids)
    .eq("status", "aplicada")
    .order("issued_at", { ascending: false });

  type WarningRow = {
    user_id: string;
    principle_violated: number | null;
    antipattern_violated: number | null;
    notes: string | null;
    issued_at: string | null;
  };
  const latestByUser = new Map<string, WarningRow>();
  for (const w of (warnings ?? []) as WarningRow[]) {
    if (!latestByUser.has(w.user_id)) latestByUser.set(w.user_id, w);
  }

  const entries: WallEntry[] = rows.map((p) => {
    const w = latestByUser.get(p.id);
    const status = p.behavior_status === "banned" ? "banned" : "suspended";
    return {
      userId: p.id,
      username: p.username,
      status,
      reason: p.banned_reason ?? w?.notes ?? null,
      principle: principleTitle(w?.principle_violated ?? null),
      antipattern: antipatternTitle(w?.antipattern_violated ?? null),
      since: status === "banned" ? (p.banned_at ?? null) : (w?.issued_at ?? null),
      suspendedUntil: p.suspended_until ?? null,
    };
  });

  // Banidos primeiro, depois por data mais recente.
  return entries.sort((a, b) => {
    if (a.status !== b.status) return a.status === "banned" ? -1 : 1;
    return (b.since ?? "").localeCompare(a.since ?? "");
  });
}
