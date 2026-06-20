// cockpit-data — read-model do COCKPIT DO PRO (/pro).
//
// Server-only: monta o snapshot completo que o ProCockpit (client) renderiza:
//   - fila waiting ordenada por LRU (mesma regra de getProsWithQueues)
//   - PT em curso (matches status='agendada' + entries in_match)
//   - métricas do dia (PTs realizadas, alunos atendidos, ganho estimado)
//
// Zero lógica de domínio nova — apenas leitura. Mutações ficam nas Server
// Actions já existentes em src/app/admin/pros/actions.ts.

import { createClient } from "@/lib/supabase/server";
import { getPtsTodayMap } from "@/lib/queries/queue";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";
import { getProRecentStats } from "@/lib/queries/pros";
import { xpProgress, getGatedTierForLevel } from "@/lib/levels";
import type { HonorRank } from "@/components/ui/honor-rank-medal";

// Preço fixo da ficha (decisão Pedro 2026-06-02) e split do PRO (migration 031:
// PRO 85%, sponsor 10% one-time na 1ª venda, plataforma 5%). O ganho do dia é
// uma ESTIMATIVA: alunos atendidos hoje × R$10 × 85%.
export const FICHA_PRECO_BRL = 10;
export const PRO_SPLIT = 0.85;

export interface CockpitQueueEntry {
  entryId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  mmr: number | null;
  honorRank: HonorRank;
  joinedAt: string;
  /** PTs já jogadas com este coach nas últimas 24h (base do LRU). */
  ptsToday: number;
}

export interface CockpitStudent {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface CockpitActivePT {
  matchId: string;
  startedAt: string;
  students: CockpitStudent[];
}

export interface CockpitData {
  coachId: string;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
  /** Modo da fila aberta: 'play' (PRO joga, 4 alunos) ou 'coached' (PRO observa, 5 alunos). */
  mode: "play" | "coached";
  /** Fila waiting ordenada por LRU (pts hoje ASC, joined_at ASC). */
  queue: CockpitQueueEntry[];
  /** PT em curso (status='agendada') — null se não há nenhuma. */
  activePT: CockpitActivePT | null;
  hoje: {
    pts: number;
    alunos: number;
    /** Estimativa: alunos × R$10 × 85%. */
    ganhoBrl: number;
  };
}

interface CoachRow {
  id: string;
  fila_aberta: boolean;
  fila_aberta_em: string | null;
  fila_max_vagas: number;
  queue_mode: string;
}

/** Busca a PT em curso (status='agendada' mais recente) + alunos in_match. */
async function fetchActivePT(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string
): Promise<CockpitActivePT | null> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, created_at")
    .eq("coach_id", coachId)
    .eq("status", "agendada")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) return null;

  const { data: entries } = await supabase
    .from("coach_queue_entries")
    .select("user_id")
    .eq("match_id", match.id)
    .eq("status", "in_match");

  const studentIds = (entries ?? []).map((e) => e.user_id);
  // Profiles (Discord) + steam_links em paralelo — identidade Steam > Discord.
  const [{ data: profiles }, steamMap] = await Promise.all([
    studentIds.length
      ? supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", studentIds)
      : Promise.resolve({ data: null }),
    getSteamIdentityMap(supabase, studentIds),
  ]);

  const students: CockpitStudent[] = (profiles ?? []).map((p) => {
    const ident = resolveIdentity(steamMap, p.id, p.username, p.avatar_url);
    return {
      userId: p.id,
      username: ident.name,
      avatarUrl: ident.avatarUrl,
    };
  });

  return { matchId: match.id, startedAt: match.created_at, students };
}

/**
 * Snapshot completo do cockpit para o coach informado.
 * O coach row vem do caller (page.tsx já o busca pro gate).
 */
export async function getProCockpitData(coach: CoachRow): Promise<CockpitData> {
  const supabase = await createClient();

  const [{ data: rawEntries }, ptsTodayMap, stats, activePT] =
    await Promise.all([
      supabase
        .from("coach_queue_entries")
        .select("id, user_id, coach_id, joined_at")
        .eq("coach_id", coach.id)
        .eq("status", "waiting"),
      getPtsTodayMap([coach.id]),
      getProRecentStats(coach.id),
      fetchActivePT(supabase, coach.id),
    ]);

  const entries = rawEntries ?? [];
  const userIds = entries.map((e) => e.user_id);

  // Leitura extra (read-model): MMR + XP total pra renderizar medalha HONOR e
  // MMR em gold por linha da fila — mesmo padrão de fetchLobbyRoom.
  // steam_links em paralelo: nick/avatar exibidos = identidade Steam > Discord.
  const [{ data: profiles }, { data: levels }, steamMap] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, username, avatar_url, mmr_atual")
          .in("id", userIds)
      : Promise.resolve({ data: null }),
    userIds.length > 0
      ? supabase
          .from("user_levels")
          .select("user_id, total_xp_earned")
          .in("user_id", userIds)
      : Promise.resolve({ data: null }),
    getSteamIdentityMap(supabase, userIds),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const xpByUser = new Map(
    (levels ?? []).map((l) => [l.user_id, l.total_xp_earned])
  );

  // Ordena por LRU: quem jogou menos PTs com o coach nas últimas 24h primeiro,
  // empate por joined_at ASC (FIFO) — idêntico a getProsWithQueues.
  const sorted = [...entries].sort((a, b) => {
    const ptsA = ptsTodayMap.get(`${a.user_id}::${a.coach_id}`) ?? 0;
    const ptsB = ptsTodayMap.get(`${b.user_id}::${b.coach_id}`) ?? 0;
    if (ptsA !== ptsB) return ptsA - ptsB;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  const queue: CockpitQueueEntry[] = sorted.map((e) => {
    const prof = profileById.get(e.user_id);
    const { level } = xpProgress(xpByUser.get(e.user_id) ?? 0);
    const ident = resolveIdentity(steamMap, e.user_id, prof?.username, prof?.avatar_url);
    return {
      entryId: e.id,
      userId: e.user_id,
      username: ident.name,
      avatarUrl: ident.avatarUrl,
      mmr: prof?.mmr_atual ?? null,
      honorRank: getGatedTierForLevel(level, prof?.mmr_atual ?? null),
      joinedAt: e.joined_at,
      ptsToday: ptsTodayMap.get(`${e.user_id}::${e.coach_id}`) ?? 0,
    };
  });

  return {
    coachId: coach.id,
    filaAberta: coach.fila_aberta,
    filaAbertaEm: coach.fila_aberta_em,
    filaMaxVagas: coach.fila_max_vagas,
    mode: coach.queue_mode === "coached" ? "coached" : "play",
    queue,
    activePT,
    hoje: {
      pts: stats.ptsHoje,
      alunos: stats.alunosAtendidosHoje,
      ganhoBrl: stats.alunosAtendidosHoje * FICHA_PRECO_BRL * PRO_SPLIT,
    },
  };
}
