"use server";

// Server Actions exclusivas do painel PRO (scope limitado).
//
// Diferença fundamental vs /admin:
//   PRO pode APENAS interagir com seus próprios alunos (quem jogou com ele).
//   PRO NÃO pode: promover outros PROs, ver dados de outros PROs,
//   tocar em aluno que nunca jogou com ele.
//
// Cada action valida o scope antes de qualquer mutação.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ====================================================
// Helpers internos
// ====================================================

/**
 * Verifica se o usuário autenticado é PRO ativo.
 * Retorna o user.id se for PRO, lança mensagem de erro se não for.
 */
async function requireActivePro(): Promise<{ userId: string; coachId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  // Verifica pro_promotion ativa
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!promo) {
    throw new Error("Acesso negado — você não é PRO ativo.");
  }

  // Busca coachId correspondente
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) {
    throw new Error("Perfil de coach não encontrado.");
  }

  return { userId: user.id, coachId: coach.id };
}

/**
 * Valida que o studentUserId já jogou ao menos 1 partida com coachId.
 * Garante que PRO só toque em alunos seus.
 */
async function requireStudentOfCoach(
  studentUserId: string,
  coachId: string
): Promise<void> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .eq("user_id", studentUserId);

  if (!count || count === 0) {
    throw new Error(
      "Aluno não encontrado — apenas alunos que jogaram contigo podem receber coach notes."
    );
  }
}

// ====================================================
// addCoachNote
// ====================================================

const addCoachNoteSchema = z.object({
  studentUserId: z.string().uuid("ID de aluno inválido."),
  // PRO só pode dar +5 ou -5 (sem acesso ao range completo do admin)
  delta: z.union([z.literal(5), z.literal(-5)]),
  reason: z
    .string()
    .min(10, "Motivo deve ter pelo menos 10 caracteres.")
    .max(500, "Motivo deve ter no máximo 500 caracteres."),
});

export type AddCoachNoteInput = z.infer<typeof addCoachNoteSchema>;

/**
 * PRO adiciona coach note (HONOR delta +5 ou -5) em aluno.
 *
 * Validações:
 * - Caller deve ser PRO ativo
 * - Student deve ter jogado pelo menos 1 partida com esse PRO
 * - Insere em honor_ledger source='coach_note_positive'/'coach_note_negative'
 * - Insere em pro_audit_log
 */
export async function addCoachNote(
  input: AddCoachNoteInput
): Promise<{ success: boolean; error?: string }> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  // Valida input com Zod
  const parsed = addCoachNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  try {
    await requireStudentOfCoach(parsed.data.studentUserId, proData.coachId);
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const source =
    parsed.data.delta > 0 ? "coach_note_positive" : "coach_note_negative";

  const service = createServiceClient();

  // Insere no honor_ledger (eixo HONOR)
  const { error: ledgerErr } = await service.from("honor_ledger").insert({
    user_id: parsed.data.studentUserId,
    admin_user_id: proData.userId,
    delta: parsed.data.delta,
    source,
    reason: parsed.data.reason,
  });

  if (ledgerErr) {
    console.error("[addCoachNote] Erro honor_ledger:", ledgerErr.message);
    return { success: false, error: "Erro ao registrar nota no ledger." };
  }

  // Audit log do PRO
  await service.from("pro_audit_log").insert({
    actor_user_id: proData.userId,
    target_user_id: parsed.data.studentUserId,
    action: parsed.data.delta > 0 ? "coach_note_positive" : "coach_note_negative",
    reason: parsed.data.reason,
    payload: {
      delta: parsed.data.delta,
      coach_id: proData.coachId,
    },
  });

  revalidatePath("/pro");
  revalidatePath(`/pro/students/${parsed.data.studentUserId}`);

  return { success: true };
}

// ====================================================
// recommendPromotion
// ====================================================

const recommendPromotionSchema = z.object({
  studentUserId: z.string().uuid("ID de aluno inválido."),
  justification: z
    .string()
    .min(30, "Justificativa deve ter pelo menos 30 caracteres.")
    .max(1000, "Justificativa deve ter no máximo 1000 caracteres."),
});

/**
 * PRO recomenda aluno pra promoção.
 * Cria row em pro_audit_log action='recommend_promotion'.
 * Pedro (admin) será notificado para avaliação manual.
 *
 * Validações:
 * - Caller deve ser PRO ativo
 * - Student deve ter jogado com esse PRO (scope)
 * - Conta com pelo menos 30 dias de existência (critério mínimo)
 */
export async function recommendPromotion(
  studentUserId: string,
  justification: string
): Promise<{ success: boolean; error?: string }> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const parsed = recommendPromotionSchema.safeParse({
    studentUserId,
    justification,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  try {
    await requireStudentOfCoach(parsed.data.studentUserId, proData.coachId);
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const supabase = await createClient();

  // Verifica critério mínimo: conta com pelo menos 30 dias
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("created_at, is_banned")
    .eq("id", parsed.data.studentUserId)
    .maybeSingle();

  if (!studentProfile) {
    return { success: false, error: "Aluno não encontrado." };
  }

  if (studentProfile.is_banned) {
    return { success: false, error: "Aluno banido não pode ser recomendado para promoção." };
  }

  const ageDays =
    (Date.now() - new Date(studentProfile.created_at).getTime()) /
    (1000 * 60 * 60 * 24);

  if (ageDays < 30) {
    return {
      success: false,
      error: `Conta criada há ${Math.floor(ageDays)} dias — mínimo 30 dias para recomendação.`,
    };
  }

  // Verifica se já não é PRO ativo
  const { data: existingPromo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", parsed.data.studentUserId)
    .eq("status", "active")
    .maybeSingle();

  if (existingPromo) {
    return { success: false, error: "Este aluno já é PRO ativo." };
  }

  const service = createServiceClient();

  // Registra recomendação no audit log (Pedro verá no painel admin)
  await service.from("pro_audit_log").insert({
    actor_user_id: proData.userId,
    target_user_id: parsed.data.studentUserId,
    action: "recommend_promotion",
    reason: parsed.data.justification,
    payload: {
      recommending_coach_id: proData.coachId,
      student_age_days: Math.floor(ageDays),
    },
  });

  // TODO: disparar webhook Discord para notificar Pedro
  // await notifyDiscordWebhook({ type: "pro_recommendation", ... })

  revalidatePath("/pro");

  return { success: true };
}

// ====================================================
// updateMyBio
// ====================================================

const updateMyBioSchema = z.object({
  newBio: z
    .string()
    .max(500, "Bio deve ter no máximo 500 caracteres.")
    .optional(),
});

/**
 * PRO atualiza própria bio (em coaches.bio).
 * Apenas PRO ativo pode alterar a própria bio.
 */
export async function updateMyBio(
  newBio: string
): Promise<{ success: boolean; error?: string }> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const parsed = updateMyBioSchema.safeParse({ newBio });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const service = createServiceClient();

  const { error: updateErr } = await service
    .from("coaches")
    .update({ bio: parsed.data.newBio ?? null })
    .eq("profile_id", proData.userId);

  if (updateErr) {
    console.error("[updateMyBio] Erro:", updateErr.message);
    return { success: false, error: "Erro ao atualizar bio." };
  }

  revalidatePath("/pro");

  return { success: true };
}

// ====================================================
// getMyStudents — PRO busca próprios alunos
// ====================================================

export interface StudentSummary {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  totalMatches: number;
  lastMatchAt: string | null;
  strikeCount: number;
}

/**
 * Retorna lista de alunos distintos que já jogaram com o PRO logado.
 * Inclui: username, total partidas, última partida, strikes (honor negativo).
 */
export async function getMyStudents(): Promise<{
  success: boolean;
  data?: StudentSummary[];
  error?: string;
}> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const supabase = await createClient();

  // Busca matches agrupados por aluno
  const { data: matchRows, error: matchErr } = await supabase
    .from("matches")
    .select("user_id, created_at")
    .eq("coach_id", proData.coachId)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });

  if (matchErr) {
    console.error("[getMyStudents] Erro matches:", matchErr.message);
    return { success: false, error: "Erro ao buscar alunos." };
  }

  if (!matchRows || matchRows.length === 0) {
    return { success: true, data: [] };
  }

  // Agrupa por user_id
  const studentMap = new Map<
    string,
    { totalMatches: number; lastMatchAt: string }
  >();
  for (const row of matchRows) {
    if (!row.user_id) continue;
    const existing = studentMap.get(row.user_id);
    if (!existing) {
      studentMap.set(row.user_id, {
        totalMatches: 1,
        lastMatchAt: row.created_at,
      });
    } else {
      existing.totalMatches += 1;
      // Ordem descendente, então primeiro encontrado = mais recente
    }
  }

  const studentIds = Array.from(studentMap.keys());

  // Busca perfis em paralelo com strikes (honor negativo count)
  const [{ data: profiles }, { data: strikesRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", studentIds),
    supabase
      .from("honor_ledger")
      .select("user_id")
      .in("user_id", studentIds)
      .lt("delta", 0),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Conta strikes por aluno
  const strikeCount = new Map<string, number>();
  for (const r of strikesRows ?? []) {
    strikeCount.set(r.user_id, (strikeCount.get(r.user_id) ?? 0) + 1);
  }

  const data: StudentSummary[] = studentIds.map((uid) => {
    const p = profileById.get(uid);
    const stats = studentMap.get(uid)!;
    return {
      userId: uid,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      totalMatches: stats.totalMatches,
      lastMatchAt: stats.lastMatchAt,
      strikeCount: strikeCount.get(uid) ?? 0,
    };
  });

  return { success: true, data };
}

// ====================================================
// getStudentHonorHistory — PRO vê histórico de honor do aluno
// ====================================================

export interface HonorLedgerEntry {
  id: string;
  delta: number;
  source: string;
  reason: string | null;
  createdAt: string;
}

/**
 * PRO busca histórico de honor de aluno específico (scope: apenas alunos seus).
 * Retorna apenas eventos públicos ao PRO (exclui admin_only sources).
 */
export async function getStudentHonorHistory(
  studentUserId: string
): Promise<{
  success: boolean;
  data?: HonorLedgerEntry[];
  error?: string;
}> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    await requireStudentOfCoach(studentUserId, proData.coachId);
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("honor_ledger")
    .select("id, delta, source, reason, created_at")
    .eq("user_id", studentUserId)
    // PRO vê coach_notes e partidas — não vê eventos admin puros
    .in("source", [
      "coach_note_positive",
      "coach_note_negative",
      "match_completed",
      "match_bonus",
      "season_reset",
      "manual_admin",
    ])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[getStudentHonorHistory] Erro:", error.message);
    return { success: false, error: "Erro ao buscar histórico." };
  }

  const entries: HonorLedgerEntry[] = (data ?? []).map((r) => ({
    id: r.id,
    delta: r.delta,
    source: r.source,
    reason: r.reason,
    createdAt: r.created_at,
  }));

  return { success: true, data: entries };
}
