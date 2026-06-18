"use server";

// Server Actions admin de torneios — criar, abrir inscrições, gerar chave,
// reportar placar e cancelar. RLS já exige is_admin pra escrever em tournaments/
// tournament_matches; requireAdmin é a 1ª linha + audit log.
//
// V1: SÓ single-elimination (gerador em @/lib/tournament-bracket). Os outros
// formatos do enum (double_elim/round_robin/swiss) ficam pra depois.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdmin,
  logAdmin,
  UuidSchema,
  type ActionResult,
} from "@/app/admin/pros/admin-gate";
import { generateSingleElimBracket } from "@/lib/tournament-bracket";

const CreateSchema = z.object({
  name: z.string().trim().min(5, "Nome mín. 5 caracteres.").max(80, "Nome máx. 80."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,40}$/, "Slug: 3-40 minúsculas, números e hífen."),
  description: z.string().trim().max(500).optional(),
  maxTeams: z
    .number()
    .int()
    .refine((n) => [4, 8, 16, 32, 64].includes(n), "Máx. de times: 4, 8, 16, 32 ou 64."),
  prizePool: z.number().min(0).max(1_000_000).optional(),
  startsAt: z.string().trim().optional(),
  rules: z.string().trim().max(2000).optional(),
});

function revalidateTournamentRoutes(slug?: string): void {
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  if (slug) revalidatePath(`/torneios/${slug}`);
}

export async function createTournament(input: {
  name: string;
  slug: string;
  description?: string;
  maxTeams: number;
  prizePool?: number;
  startsAt?: string;
  rules?: string;
}): Promise<ActionResult<{ slug: string }>> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const d = parsed.data;
  let startsISO: string | null = null;
  if (d.startsAt) {
    const dt = new Date(d.startsAt);
    if (Number.isNaN(dt.getTime())) return { success: false, error: "Data de início inválida." };
    startsISO = dt.toISOString();
  }

  const service = createServiceClient();
  const { error } = await service.from("tournaments").insert({
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
    format: "single_elim",
    status: "draft",
    max_teams: d.maxTeams,
    prize_pool: d.prizePool ?? 0,
    starts_at: startsISO,
    rules: d.rules ?? null,
    created_by: gate.adminId,
  });
  if (error) {
    if (error.code === "23505") return { success: false, error: "Slug já em uso." };
    return { success: false, error: "Erro ao criar torneio: " + error.message };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "create_tournament",
    reason: `Torneio criado: ${d.name}`,
    payload: { slug: d.slug, max_teams: d.maxTeams },
  });
  revalidateTournamentRoutes(d.slug);
  return { success: true, data: { slug: d.slug } };
}

/** draft → open (abre inscrições). */
export async function openRegistration(input: { tournamentId: string }): Promise<ActionResult> {
  const id = UuidSchema.safeParse(input.tournamentId);
  if (!id.success) return { success: false, error: "ID inválido." };
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: updated, error } = await service
    .from("tournaments")
    .update({ status: "open" })
    .eq("id", id.data)
    .eq("status", "draft")
    .select("slug");
  if (error) return { success: false, error: "Erro ao abrir inscrições: " + error.message };
  if (!updated || updated.length === 0) {
    return { success: false, error: "Só dá pra abrir inscrições de um torneio em rascunho." };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "open_tournament_registration",
    reason: "Inscrições abertas",
    payload: { tournament_id: id.data },
  });
  revalidateTournamentRoutes(updated[0]?.slug);
  return { success: true };
}

/** open → in_progress: semeia os times inscritos na chave single-elim. */
export async function generateBracket(input: { tournamentId: string }): Promise<ActionResult> {
  const id = UuidSchema.safeParse(input.tournamentId);
  if (!id.success) return { success: false, error: "ID inválido." };
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: t } = await service
    .from("tournaments")
    .select("id, slug, status, max_teams")
    .eq("id", id.data)
    .maybeSingle();
  if (!t) return { success: false, error: "Torneio não encontrado." };
  if (t.status !== "open") {
    return { success: false, error: "Gere a chave só com o torneio em 'inscrições abertas'." };
  }

  const { data: regs } = await service
    .from("tournament_teams")
    .select("team_id, seed, registered_at")
    .eq("tournament_id", id.data)
    .order("registered_at", { ascending: true });
  const teams = regs ?? [];
  if (teams.length < 2) return { success: false, error: "Mínimo 2 times inscritos pra gerar a chave." };
  if (teams.length > t.max_teams) return { success: false, error: "Mais times inscritos que o máximo permitido." };

  // Ordem de seed = ordem de inscrição (seed explícito poderá vir depois).
  const slots = generateSingleElimBracket(teams.map((r) => r.team_id));

  // Re-geração segura: limpa matches anteriores (só acontece antes de in_progress).
  await service.from("tournament_matches").delete().eq("tournament_id", id.data);

  const nowISO = new Date().toISOString();
  const rows = slots.map((s) => ({
    tournament_id: id.data,
    round: s.round,
    bracket_position: s.bracketPosition,
    team_a_id: s.teamAId,
    team_b_id: s.teamBId,
    winner_team_id: s.winnerTeamId,
    status: s.isWalkover ? ("walkover" as const) : ("scheduled" as const),
    completed_at: s.isWalkover ? nowISO : null,
  }));
  const { error: insErr } = await service.from("tournament_matches").insert(rows);
  if (insErr) return { success: false, error: "Erro ao gerar chave: " + insErr.message };

  await service
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", id.data);

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "generate_bracket",
    reason: `Chave gerada com ${teams.length} times`,
    payload: { tournament_id: id.data, teams: teams.length },
  });
  revalidateTournamentRoutes(t.slug);
  return { success: true };
}

const ReportSchema = z.object({
  matchId: z.string().uuid(),
  winnerTeamId: z.string().uuid(),
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
});

/** Reporta o placar: define vencedor, avança pro próximo round, encerra na final. */
export async function reportTournamentMatch(input: {
  matchId: string;
  winnerTeamId: string;
  scoreA: number;
  scoreB: number;
}): Promise<ActionResult> {
  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const { matchId, winnerTeamId, scoreA, scoreB } = parsed.data;

  const service = createServiceClient();
  const { data: m } = await service
    .from("tournament_matches")
    .select("id, tournament_id, round, bracket_position, team_a_id, team_b_id, status")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return { success: false, error: "Partida não encontrada." };
  if (m.status === "completed") return { success: false, error: "Partida já reportada." };
  if (!m.team_a_id || !m.team_b_id) {
    return { success: false, error: "A partida ainda não tem os dois times definidos." };
  }
  if (winnerTeamId !== m.team_a_id && winnerTeamId !== m.team_b_id) {
    return { success: false, error: "Vencedor precisa ser um dos dois times da partida." };
  }
  const loserId = winnerTeamId === m.team_a_id ? m.team_b_id : m.team_a_id;
  const nowISO = new Date().toISOString();

  const { error: updErr } = await service
    .from("tournament_matches")
    .update({
      winner_team_id: winnerTeamId,
      score_a: scoreA,
      score_b: scoreB,
      status: "completed",
      completed_at: nowISO,
    })
    .eq("id", matchId);
  if (updErr) return { success: false, error: "Erro ao reportar placar: " + updErr.message };

  // Marca o perdedor como eliminado.
  await service
    .from("tournament_teams")
    .update({ eliminated_at: nowISO })
    .eq("tournament_id", m.tournament_id)
    .eq("team_id", loserId);

  // Final? (round == maior round do torneio) → encerra o torneio.
  const { data: lastRound } = await service
    .from("tournament_matches")
    .select("round")
    .eq("tournament_id", m.tournament_id)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();
  const totalRounds = lastRound?.round ?? m.round;

  if (m.round >= totalRounds) {
    await service
      .from("tournaments")
      .update({ status: "completed", completed_at: nowISO })
      .eq("id", m.tournament_id);
  } else {
    // Avança o vencedor pro slot do match-pai (round+1, posição/2). Slot A se a
    // posição é par, B se ímpar (objetos tipados — key dinâmica o Supabase rejeita).
    const parentUpdate =
      m.bracket_position % 2 === 0
        ? { team_a_id: winnerTeamId }
        : { team_b_id: winnerTeamId };
    await service
      .from("tournament_matches")
      .update(parentUpdate)
      .eq("tournament_id", m.tournament_id)
      .eq("round", m.round + 1)
      .eq("bracket_position", Math.floor(m.bracket_position / 2));
  }

  const { data: t } = await service
    .from("tournaments")
    .select("slug")
    .eq("id", m.tournament_id)
    .maybeSingle();
  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "report_tournament_match",
    reason: `Placar ${scoreA}-${scoreB}`,
    payload: { match_id: matchId, winner: winnerTeamId },
  });
  revalidateTournamentRoutes(t?.slug);
  return { success: true };
}

/** Cancela o torneio (qualquer estado → cancelled). */
export async function cancelTournament(input: { tournamentId: string }): Promise<ActionResult> {
  const id = UuidSchema.safeParse(input.tournamentId);
  if (!id.success) return { success: false, error: "ID inválido." };
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: updated, error } = await service
    .from("tournaments")
    .update({ status: "cancelled" })
    .eq("id", id.data)
    .neq("status", "completed")
    .select("slug");
  if (error) return { success: false, error: "Erro ao cancelar: " + error.message };
  if (!updated || updated.length === 0) {
    return { success: false, error: "Torneio não encontrado ou já encerrado." };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "cancel_tournament",
    reason: "Torneio cancelado",
    payload: { tournament_id: id.data },
  });
  revalidateTournamentRoutes(updated[0]?.slug);
  return { success: true };
}
