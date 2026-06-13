// Queries de leitura sobre PROs (coaches estendidos com fila/headline).
// Server-only — usa createClient SSR.

import { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";

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
  /** Total waiting na fila (pode passar de filaMaxVagas). */
  waitingCount: number;
  /** Slots livres pra entrar na PRÓXIMA PT (clamp 0..filaMaxVagas). */
  vagasProximaPT: number;
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
  waiting_count: number;
  vagas_proxima_pt: number;
};

export interface ProWithQueue {
  coach: ProLiveStatus;
  entries: Array<{
    entryId: string;
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    joinedAt: string;
    /** PTs já jogadas com esse coach nas últimas 24h — usado pra LRU + badge UI. */
    ptsToday: number;
  }>;
}

export interface ProRecentStats {
  ptsHoje: number;
  alunosAtendidosHoje: number;
  lastPTAt: string | null;
}

/**
 * Retorna PROs + entries waiting de cada um (pra renderizar QueueBoard).
 * Entries ordenadas por LRU: quem jogou menos PTs com o coach nas últimas
 * 24h vem primeiro. Empate desempata por joined_at ASC (FIFO).
 *
 * Sem hard cap: cliente pode jogar quantas PTs quiser desde que tenha ficha
 * — algoritmo apenas reordena pra distribuir vagas com justiça temporal.
 */
export async function getProsWithQueues(): Promise<ProWithQueue[]> {
  const pros = await getProsLiveStatus();
  if (pros.length === 0) return [];

  const supabase = await createClient();
  const coachIds = pros.map((p) => p.coachId);

  // Entries waiting + entries consumed nas últimas 24h em 2 queries paralelas
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: entries }, { data: consumedRecent }] = await Promise.all([
    supabase
      .from("coach_queue_entries")
      .select("id, coach_id, user_id, joined_at")
      .in("coach_id", coachIds)
      .eq("status", "waiting"),
    supabase
      .from("coach_queue_entries")
      .select("user_id, coach_id")
      .in("coach_id", coachIds)
      .eq("status", "consumed")
      .gte("consumed_at", since24h),
  ]);

  // Mapa (user_id::coach_id) → count de PTs nas últimas 24h
  const ptsTodayMap = new Map<string, number>();
  for (const e of consumedRecent ?? []) {
    const key = `${e.user_id}::${e.coach_id}`;
    ptsTodayMap.set(key, (ptsTodayMap.get(key) ?? 0) + 1);
  }

  // Profiles (Discord) + steam_links em paralelo — nick/avatar das entries
  // seguem a identidade canônica (Steam > Discord) via lib/identity.
  const userIds = (entries ?? []).map((e) => e.user_id);
  const [{ data: profiles }, steamMap] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: null }),
    getSteamIdentityMap(supabase, userIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return pros.map((pro) => {
    const coachEntries = (entries ?? []).filter((e) => e.coach_id === pro.coachId);
    // Ordena por LRU: pts_today ASC, joined_at ASC
    coachEntries.sort((a, b) => {
      const ptsA = ptsTodayMap.get(`${a.user_id}::${a.coach_id}`) ?? 0;
      const ptsB = ptsTodayMap.get(`${b.user_id}::${b.coach_id}`) ?? 0;
      if (ptsA !== ptsB) return ptsA - ptsB;
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });
    return {
      coach: pro,
      entries: coachEntries.map((e) => {
        const p = profileById.get(e.user_id);
        const ident = resolveIdentity(steamMap, e.user_id, p?.username, p?.avatar_url);
        return {
          entryId: e.id,
          userId: e.user_id,
          username: ident.name,
          avatarUrl: ident.avatarUrl,
          joinedAt: e.joined_at,
          ptsToday: ptsTodayMap.get(`${e.user_id}::${e.coach_id}`) ?? 0,
        };
      }),
    };
  });
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
  const rows = (data ?? []) as RawRow[];
  if (rows.length === 0) return [];

  // O RPC devolve username/avatar do Discord (profiles) e NÃO expõe profile_id —
  // mapeia coach_id → profile_id (coaches ativos têm SELECT público) e busca
  // steam_links em batch. PRO também é identidade Steam (Steam > Discord).
  const { data: coachRows } = await supabase
    .from("coaches")
    .select("id, profile_id")
    .in("id", rows.map((r) => r.coach_id));
  const profileIdByCoach = new Map(
    (coachRows ?? []).map((c) => [c.id, c.profile_id])
  );
  const steamMap = await getSteamIdentityMap(
    supabase,
    (coachRows ?? []).map((c) => c.profile_id)
  );

  return rows.map((r) => {
    // Sem profile_id mapeado (RLS/edge case) → resolveIdentity não acha Steam
    // e cai no Discord do RPC — exatamente o fallback antigo.
    const profileId = profileIdByCoach.get(r.coach_id) ?? r.coach_id;
    const ident = resolveIdentity(steamMap, profileId, r.username, r.avatar_url);
    return {
      coachId: r.coach_id,
      slug: r.slug,
      headline: r.headline,
      bio: r.bio,
      filaAberta: r.fila_aberta,
      filaAbertaEm: r.fila_aberta_em,
      filaMaxVagas: r.fila_max_vagas,
      username: ident.name,
      avatarUrl: ident.avatarUrl,
      mmrAtual: r.mmr_atual,
      waitingCount: r.waiting_count ?? r.vagas_ocupadas,
      vagasProximaPT:
        r.vagas_proxima_pt ?? Math.max(0, r.fila_max_vagas - r.vagas_ocupadas),
    };
  });
}
