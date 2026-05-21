// Queries de leitura sobre PROs (coaches estendidos com fila/headline).
// Server-only — usa createClient SSR.

import { createClient } from "@/lib/supabase/server";

export type ProLiveStatus = {
  coachId: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
  username: string | null;
  avatarUrl: string | null;
  mmrAtual: number | null;
  vagasOcupadas: number;
  vagasRestantes: number;
};

type RawRow = {
  coach_id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  fila_aberta: boolean;
  fila_aberta_em: string | null;
  fila_max_vagas: number;
  username: string | null;
  avatar_url: string | null;
  mmr_atual: number | null;
  vagas_ocupadas: number;
  vagas_restantes: number;
};

export interface ProWithQueue {
  coach: ProLiveStatus;
  entries: Array<{
    entryId: string;
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    joinedAt: string;
  }>;
}

export interface ProRecentStats {
  ptsHoje: number;
  alunosAtendidosHoje: number;
  lastPTAt: string | null;
}

/**
 * Retorna PROs + entries waiting de cada um (pra renderizar QueueBoard).
 */
export async function getProsWithQueues(): Promise<ProWithQueue[]> {
  const pros = await getProsLiveStatus();
  if (pros.length === 0) return [];

  const supabase = await createClient();
  const coachIds = pros.map((p) => p.coachId);

  const { data: entries } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, user_id, joined_at")
    .in("coach_id", coachIds)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  const userIds = (entries ?? []).map((e) => e.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)
    : { data: [] };
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return pros.map((pro) => ({
    coach: pro,
    entries: (entries ?? [])
      .filter((e) => e.coach_id === pro.coachId)
      .map((e) => {
        const p = profileById.get(e.user_id);
        return {
          entryId: e.id,
          userId: e.user_id,
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
          joinedAt: e.joined_at,
        };
      }),
  }));
}

/**
 * Estatísticas recentes de um PRO (hoje) pra exibir no card.
 */
export async function getProRecentStats(coachId: string): Promise<ProRecentStats> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startISO = startOfDay.toISOString();

  const [{ count: ptsHoje }, { data: lastPT }, { count: alunosHoje }] = await Promise.all([
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("status", "realizada")
      .gte("created_at", startISO),
    supabase
      .from("matches")
      .select("created_at")
      .eq("coach_id", coachId)
      .eq("status", "realizada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("coach_queue_entries")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("status", "consumed")
      .gte("consumed_at", startISO),
  ]);

  return {
    ptsHoje: ptsHoje ?? 0,
    alunosAtendidosHoje: alunosHoje ?? 0,
    lastPTAt: lastPT?.created_at ?? null,
  };
}

// Lê o status público dos PROs via function SECURITY DEFINER (anon + authenticated).
export async function getProsLiveStatus(): Promise<ProLiveStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pros_live_status");
  if (error) {
    console.error("[getProsLiveStatus]", error.message);
    return [];
  }
  return ((data ?? []) as RawRow[]).map((r) => ({
    coachId: r.coach_id,
    slug: r.slug,
    headline: r.headline,
    bio: r.bio,
    filaAberta: r.fila_aberta,
    filaAbertaEm: r.fila_aberta_em,
    filaMaxVagas: r.fila_max_vagas,
    username: r.username,
    avatarUrl: r.avatar_url,
    mmrAtual: r.mmr_atual,
    vagasOcupadas: r.vagas_ocupadas,
    vagasRestantes: r.vagas_restantes,
  }));
}
