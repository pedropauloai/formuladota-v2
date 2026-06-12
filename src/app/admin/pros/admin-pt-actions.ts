"use server";

// Server Actions ADMIN sobre PTs (matches) de QUALQUER coach — emergência.
//
// O caminho FELIZ de confirmação com dados continua sendo
// enrichMatchFromOpenDota (./actions.ts), que JÁ aceita admin via
// profiles.is_admin e confirma + enriquece num passo só (trigger PG cobra as
// fichas). Aqui ficam:
//   - adminPreviewMatchValidation: anti-Turbo resolvendo o coach PELO MATCH
//     (a variante do PRO em match-coordination.ts exige caller PRO)
//   - adminConfirmPTRealized: fallback manual sem dados OpenDota
//   - adminCancelPT: cancela sem cobrança
//
// Gate is_admin em todas — ver ./admin-gate.ts.

import { createClient } from "@/lib/supabase/server";
import { validateOpendotaMatch } from "@/lib/dota/opendota";
import { sendPTConfirmedEmail } from "@/lib/resend";
import {
  type ActionResult,
  DotaMatchIdSchema,
  ReasonSchema,
  UuidSchema,
  logAdmin,
  requireAdmin,
  revalidateQueueRoutes,
} from "./admin-gate";

// ─── adminCancelPT — cancelar PT agendada (sem cobrança) ─────────────────────

export async function adminCancelPT(
  matchId: string,
  reason: string
): Promise<ActionResult<{ cancelledEntries: number }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const reasonParsed = ReasonSchema.safeParse(reason);
  if (!reasonParsed.success) {
    return {
      success: false,
      error: reasonParsed.error.errors[0]?.message ?? "Motivo inválido.",
    };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, status")
    .eq("id", matchId)
    .single();
  if (!match) return { success: false, error: "PT não encontrada." };
  if (match.status !== "agendada") {
    return { success: false, error: `Não pode cancelar PT em status ${match.status}.` };
  }

  // Entries in_match -> cancelled (nenhuma ficha foi cobrada ainda)
  const { error: entriesErr, count } = await supabase
    .from("coach_queue_entries")
    .update({ status: "cancelled" } as never, { count: "exact" })
    .eq("match_id", matchId)
    .eq("status", "in_match");
  if (entriesErr) {
    return { success: false, error: "Erro ao cancelar entries: " + entriesErr.message };
  }

  const { error: matchErr } = await supabase
    .from("matches")
    .update({ status: "cancelada", notas_pedro: `[admin] ${reasonParsed.data}` })
    .eq("id", matchId);
  if (matchErr) {
    return { success: false, error: "Erro ao cancelar match: " + matchErr.message };
  }

  void logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "admin_cancel_pt",
    reason: reasonParsed.data,
    payload: { matchId, coachId: match.coach_id, cancelledEntries: count ?? 0 },
  });
  revalidateQueueRoutes();
  return { success: true, data: { cancelledEntries: count ?? 0 } };
}

// ─── adminConfirmPTRealized — confirmar sem dados OpenDota (fallback) ────────

export async function adminConfirmPTRealized(
  matchId: string
): Promise<ActionResult<{ matchId: string }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, status")
    .eq("id", matchId)
    .single();
  if (!match) return { success: false, error: "PT não encontrada." };
  if (match.status !== "agendada") {
    return { success: false, error: `PT já está ${match.status}.` };
  }

  // Trigger trg_match_realizada consome as fichas das entries in_match
  const { error } = await supabase
    .from("matches")
    .update({
      status: "realizada",
      enriched_at: new Date().toISOString(),
      match_dataset: "manual",
    })
    .eq("id", matchId);
  if (error) {
    return { success: false, error: "Erro ao confirmar PT: " + error.message };
  }

  void notifyPTParticipants(matchId);
  void logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "admin_confirm_pt_manual",
    reason: "Confirmação manual via /admin/pros (sem dados OpenDota)",
    payload: { matchId, coachId: match.coach_id },
  });
  revalidateQueueRoutes();
  return { success: true, data: { matchId } };
}

/** Email não-crítico pros alunos cobrados — fire-and-forget. */
async function notifyPTParticipants(matchId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: entries } = await supabase
      .from("coach_queue_entries")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("status", "consumed");
    if (!entries || entries.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, username")
      .in("id", entries.map((e) => e.user_id));

    await Promise.all(
      (profiles ?? []).map((p) =>
        p.email
          ? sendPTConfirmedEmail({
              matchId,
              customerEmail: p.email,
              customerName: p.username ?? undefined,
              fichasConsumidas: 1,
            })
          : Promise.resolve()
      )
    );
  } catch (err) {
    console.error("[adminConfirmPTRealized] email PT falhou:", err);
  }
}

// ─── adminPreviewMatchValidation — anti-Turbo resolvendo coach pelo match ────

export async function adminPreviewMatchValidation(
  matchId: string,
  dotaMatchId: string
): Promise<{ success: boolean; valid?: boolean; reason?: string; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const idParsed = DotaMatchIdSchema.safeParse(dotaMatchId);
  if (!idParsed.success) {
    return { success: false, error: idParsed.error.errors[0]?.message };
  }
  if (!UuidSchema.safeParse(matchId).success) {
    return { success: false, error: "PT inválida." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id")
    .eq("id", matchId)
    .single();
  if (!match?.coach_id) return { success: false, error: "PT não encontrada." };

  // Participantes esperados: alunos in_match + o próprio PRO do match
  const [{ data: entries }, { data: coach }] = await Promise.all([
    supabase
      .from("coach_queue_entries")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("status", "in_match"),
    supabase.from("coaches").select("profile_id").eq("id", match.coach_id).single(),
  ]);
  const participantIds = [
    ...(entries ?? []).map((e) => e.user_id),
    ...(coach?.profile_id ? [coach.profile_id] : []),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, steam_id")
    .in("id", participantIds);
  const steamIds64 = (profiles ?? [])
    .map((p) => p.steam_id as string | null)
    .filter((id): id is string => id !== null && id.length > 0);

  const result = await validateOpendotaMatch(idParsed.data, steamIds64);
  return { success: true, valid: result.valid, reason: result.reason };
}
