// Read-model do painel ADMIN de PROs (/admin/pros).
//
// Server-only: monta o snapshot de TODOS os coaches (online e offline) que o
// AdminProsMasterDetail (client) renderiza:
//   - resumo por coach: fila aberta? há quanto tempo, waiting, PTs/alunos/R$ hoje
//   - fila waiting de cada coach (ordem joined_at — admin vê cronologia crua)
//   - PTs agendadas de TODOS (mais antiga primeiro = atenção primeiro)
//   - histórico recente de PTs realizadas por coach (placar, duração, enrich)
//
// Zero lógica de domínio nova — apenas leitura. O gate is_admin é
// responsabilidade do caller (page/server action).

import { createClient } from "@/lib/supabase/server";
import { FICHA_PRECO_BRL, PRO_SPLIT } from "@/app/pro/cockpit-data";
import type {
  AdminCoachSummary,
  AdminHistoryMatch,
  AdminPendingPT,
  AdminProsData,
  AdminQueueEntry,
} from "./admin-pros-types";

const HISTORY_PER_COACH = 8;

// ─── Tipos de row do DB (client Supabase não é tipado por generics) ─────────

interface CoachRowDB {
  id: string;
  slug: string;
  headline: string | null;
  ativo: boolean;
  profile_id: string;
  fila_aberta: boolean;
  fila_aberta_em: string | null;
  fila_max_vagas: number;
}

interface EntryRowDB {
  id: string;
  coach_id: string;
  user_id: string;
  joined_at: string;
}

interface MatchPendingRowDB {
  id: string;
  coach_id: string;
  created_at: string;
}

interface MatchHistoryRowDB {
  id: string;
  coach_id: string;
  created_at: string;
  dota_match_id: string | null;
  radiant_win: boolean | null;
  radiant_score: number | null;
  dire_score: number | null;
  duracao_min: number | null;
  enriched_at: string | null;
}

interface ProfileRowDB {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

type Supa = Awaited<ReturnType<typeof createClient>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countBy<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

async function fetchProfilesMap(
  supabase: Supa,
  ids: string[]
): Promise<Map<string, ProfileRowDB>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", [...new Set(ids)]);
  return new Map(((data ?? []) as ProfileRowDB[]).map((p) => [p.id, p]));
}

function buildPending(
  matches: MatchPendingRowDB[],
  inMatchEntries: Array<{ match_id: string; user_id: string }>,
  profiles: Map<string, ProfileRowDB>
): AdminPendingPT[] {
  return matches.map((m) => ({
    matchId: m.id,
    coachId: m.coach_id,
    createdAt: m.created_at,
    students: inMatchEntries
      .filter((e) => e.match_id === m.id)
      .map((e) => {
        const p = profiles.get(e.user_id);
        return {
          userId: e.user_id,
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
        };
      }),
  }));
}

function buildHistory(
  rows: MatchHistoryRowDB[],
  alunosByMatch: Map<string, number>
): Record<string, AdminHistoryMatch[]> {
  const byCoach: Record<string, AdminHistoryMatch[]> = {};
  for (const m of rows) {
    const list = (byCoach[m.coach_id] ??= []);
    if (list.length >= HISTORY_PER_COACH) continue;
    list.push({
      matchId: m.id,
      createdAt: m.created_at,
      dotaMatchId: m.dota_match_id,
      radiantWin: m.radiant_win,
      radiantScore: m.radiant_score,
      direScore: m.dire_score,
      duracaoMin: m.duracao_min,
      enrichedAt: m.enriched_at,
      alunoCount: alunosByMatch.get(m.id) ?? 0,
    });
  }
  return byCoach;
}

// ─── Snapshot principal ──────────────────────────────────────────────────────

export async function getAdminProsData(): Promise<AdminProsData> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startISO = startOfDay.toISOString();

  const { data: coachesRaw } = await supabase
    .from("coaches")
    .select(
      "id, slug, headline, ativo, profile_id, fila_aberta, fila_aberta_em, fila_max_vagas"
    );
  const coachRows = (coachesRaw ?? []) as CoachRowDB[];
  if (coachRows.length === 0) {
    return { coaches: [], queues: {}, pending: [], history: {} };
  }
  const coachIds = coachRows.map((c) => c.id);

  const [waitingRes, pendingRes, ptsHojeRes, consumedHojeRes, historyRes] =
    await Promise.all([
      supabase
        .from("coach_queue_entries")
        .select("id, coach_id, user_id, joined_at")
        .in("coach_id", coachIds)
        .eq("status", "waiting")
        .order("joined_at", { ascending: true }),
      supabase
        .from("matches")
        .select("id, coach_id, created_at")
        .in("coach_id", coachIds)
        .eq("status", "agendada")
        .order("created_at", { ascending: true }),
      supabase
        .from("matches")
        .select("id, coach_id")
        .in("coach_id", coachIds)
        .eq("status", "realizada")
        .gte("created_at", startISO),
      supabase
        .from("coach_queue_entries")
        .select("coach_id")
        .in("coach_id", coachIds)
        .eq("status", "consumed")
        .gte("consumed_at", startISO),
      supabase
        .from("matches")
        .select(
          "id, coach_id, created_at, dota_match_id, radiant_win, radiant_score, dire_score, duracao_min, enriched_at"
        )
        .in("coach_id", coachIds)
        .eq("status", "realizada")
        .order("created_at", { ascending: false })
        .limit(HISTORY_PER_COACH * 10),
    ]);

  const waiting = (waitingRes.data ?? []) as EntryRowDB[];
  const pendingMatches = (pendingRes.data ?? []) as MatchPendingRowDB[];
  const historyRows = (historyRes.data ?? []) as MatchHistoryRowDB[];

  // Alunos das PTs pendentes + alunos cobrados nas PTs do histórico
  const pendingIds = pendingMatches.map((m) => m.id);
  const { data: inMatchRaw } = pendingIds.length
    ? await supabase
        .from("coach_queue_entries")
        .select("match_id, user_id")
        .in("match_id", pendingIds)
        .eq("status", "in_match")
    : { data: [] };
  const inMatchEntries = (inMatchRaw ?? []) as Array<{
    match_id: string;
    user_id: string;
  }>;

  const historyIds = historyRows.map((m) => m.id);
  const { data: consumedHistRaw } = historyIds.length
    ? await supabase
        .from("coach_queue_entries")
        .select("match_id")
        .in("match_id", historyIds)
        .eq("status", "consumed")
    : { data: [] };
  const alunosByMatch = countBy(
    (consumedHistRaw ?? []) as Array<{ match_id: string }>,
    (e) => e.match_id
  );

  const profiles = await fetchProfilesMap(supabase, [
    ...coachRows.map((c) => c.profile_id),
    ...waiting.map((e) => e.user_id),
    ...inMatchEntries.map((e) => e.user_id),
  ]);

  return assemble(coachRows, waiting, pendingMatches, inMatchEntries, {
    profiles,
    ptsHojeByCoach: countBy(
      (ptsHojeRes.data ?? []) as Array<{ coach_id: string }>,
      (m) => m.coach_id
    ),
    alunosHojeByCoach: countBy(
      (consumedHojeRes.data ?? []) as Array<{ coach_id: string }>,
      (e) => e.coach_id
    ),
    history: buildHistory(historyRows, alunosByMatch),
  });
}

// ─── Montagem final do snapshot ──────────────────────────────────────────────

function assemble(
  coachRows: CoachRowDB[],
  waiting: EntryRowDB[],
  pendingMatches: MatchPendingRowDB[],
  inMatchEntries: Array<{ match_id: string; user_id: string }>,
  ctx: {
    profiles: Map<string, ProfileRowDB>;
    ptsHojeByCoach: Map<string, number>;
    alunosHojeByCoach: Map<string, number>;
    history: Record<string, AdminHistoryMatch[]>;
  }
): AdminProsData {
  const queues: Record<string, AdminQueueEntry[]> = {};
  for (const e of waiting) {
    const p = ctx.profiles.get(e.user_id);
    (queues[e.coach_id] ??= []).push({
      entryId: e.id,
      userId: e.user_id,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      joinedAt: e.joined_at,
    });
  }

  const coaches: AdminCoachSummary[] = coachRows
    .map((c) => {
      const p = ctx.profiles.get(c.profile_id);
      const alunos = ctx.alunosHojeByCoach.get(c.id) ?? 0;
      return {
        coachId: c.id,
        slug: c.slug,
        headline: c.headline,
        ativo: c.ativo,
        profileId: c.profile_id,
        username: p?.username ?? null,
        avatarUrl: p?.avatar_url ?? null,
        filaAberta: c.fila_aberta,
        filaAbertaEm: c.fila_aberta_em,
        filaMaxVagas: c.fila_max_vagas,
        waitingCount: queues[c.id]?.length ?? 0,
        hoje: {
          pts: ctx.ptsHojeByCoach.get(c.id) ?? 0,
          alunos,
          ganhoBrl: alunos * FICHA_PRECO_BRL * PRO_SPLIT,
        },
      };
    })
    .sort((a, b) => {
      if (a.filaAberta !== b.filaAberta) return a.filaAberta ? -1 : 1;
      if (a.waitingCount !== b.waitingCount) return b.waitingCount - a.waitingCount;
      return (a.username ?? a.slug).localeCompare(b.username ?? b.slug);
    });

  return {
    coaches,
    queues,
    pending: buildPending(pendingMatches, inMatchEntries, ctx.profiles),
    history: ctx.history,
  };
}
