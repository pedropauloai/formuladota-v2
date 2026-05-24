"use server";

// Server Actions — admin gestão de usuários FormulaDota.
//
// Todas as actions:
//   1. Verificam is_admin do caller (createClient cookie-based)
//   2. Executam a mutação via service client (bypass RLS para admin_audit_log)
//   3. Inserem em admin_audit_log com payload_before/payload_after
//   4. Revalidam rotas afetadas

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ====================================================
// Helpers internos
// ====================================================

type AdminCheckResult =
  | { ok: true; adminId: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { ok: false, error: "Apenas admins podem realizar esta ação." };
  }
  return { ok: true, adminId: user.id };
}

async function insertAuditLog(
  service: ReturnType<typeof createServiceClient>,
  opts: {
    actorId: string;
    targetUserId: string;
    action: string;
    reason: string;
    payloadBefore?: Record<string, unknown>;
    payloadAfter?: Record<string, unknown>;
  }
) {
  // admin_audit_log pode não existir em todas as migrations — fire and forget
  try {
    await service.from("admin_audit_log" as never).insert({
      actor_user_id: opts.actorId,
      target_user_id: opts.targetUserId,
      action: opts.action,
      reason: opts.reason,
      payload_before: opts.payloadBefore ?? null,
      payload_after: opts.payloadAfter ?? null,
      created_at: new Date().toISOString(),
    } as never);
  } catch {
    // Audit log é best-effort — não bloqueia a action principal
  }
}

// ====================================================
// adjustUserFichas (delegação para fichas/actions já existente + audit)
// ====================================================

export type AdjustFichasResult =
  | { success: true; newBalance: number }
  | { success: false; error: string };

export async function adjustUserFichasAdmin(input: {
  userId: string;
  delta: number;
  reason: string;
}): Promise<AdjustFichasResult> {
  if (input.delta === 0) {
    return { success: false, error: "Delta não pode ser zero." };
  }
  if (Math.abs(input.delta) > 1000) {
    return { success: false, error: "Delta absurdo (máx 1000 por operação)." };
  }
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { success: false, error: "Razão obrigatória (mínimo 3 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const supabase = await createClient();
  const service = createServiceClient();

  // Snapshot saldo anterior
  const { data: beforeRow } = await supabase
    .from("user_fichas")
    .select("balance")
    .eq("user_id", input.userId)
    .maybeSingle();
  const balanceBefore = beforeRow?.balance ?? 0;

  const source = input.delta > 0 ? "admin_grant" : "admin_debit";
  const { data: ledger, error: ledgerErr } = await service
    .from("ficha_ledger")
    .insert({
      user_id: input.userId,
      delta: input.delta,
      source,
      reason,
      admin_user_id: adminCheck.adminId,
    } as never)
    .select("id")
    .single();

  if (ledgerErr) {
    if (ledgerErr.message.includes("user_fichas_balance_check")) {
      return { success: false, error: "Saldo insuficiente — debit deixaria saldo negativo." };
    }
    return { success: false, error: "Erro: " + ledgerErr.message };
  }

  const { data: afterRow } = await service
    .from("user_fichas")
    .select("balance")
    .eq("user_id", input.userId)
    .single();
  const newBalance = afterRow?.balance ?? 0;

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId: input.userId,
    action: source,
    reason,
    payloadBefore: { balance: balanceBefore },
    payloadAfter: { balance: newBalance, ledger_id: ledger?.id },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${input.userId}`);
  revalidatePath("/dashboard");

  return { success: true, newBalance };
}

// ====================================================
// applyStrike — Pedro aplica strike de conduta
// ====================================================

export type StrikeSeverity = "leve" | "grave";

export type ApplyStrikeResult =
  | { success: true }
  | { success: false; error: string };

export async function applyStrike(input: {
  targetUserId: string;
  severity: StrikeSeverity;
  reason: string;
}): Promise<ApplyStrikeResult> {
  if (!input.reason?.trim() || input.reason.trim().length < 5) {
    return { success: false, error: "Razão obrigatória (mínimo 5 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();

  // Deltas de honor por severidade (Doutrina: strike leve = -20, grave = -50)
  const honorDelta = input.severity === "grave" ? -50 : -20;
  const source =
    input.severity === "grave" ? "admin_strike_severe" : "admin_strike_light";
  const reason = input.reason.trim();

  // Insere honor_ledger
  const { error: honorErr } = await service
    .from("honor_ledger" as never)
    .insert({
      user_id: input.targetUserId,
      delta: honorDelta,
      source,
      reason,
      admin_user_id: adminCheck.adminId,
      created_at: new Date().toISOString(),
    } as never);

  if (honorErr) {
    return { success: false, error: "Erro ao registrar honor ledger: " + honorErr.message };
  }

  // Insere user_warnings
  const { error: warnErr } = await service
    .from("user_warnings" as never)
    .insert({
      user_id: input.targetUserId,
      severity: input.severity,
      reason,
      issued_by: adminCheck.adminId,
      created_at: new Date().toISOString(),
    } as never);

  if (warnErr) {
    // Não bloqueante — warn pode falhar se tabela ainda não tem esse schema
    console.error("[applyStrike] user_warnings insert falhou:", warnErr.message);
  }

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId: input.targetUserId,
    action: source,
    reason,
    payloadAfter: { honor_delta: honorDelta, severity: input.severity },
  });

  revalidatePath(`/admin/users/${input.targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ====================================================
// applyHonorBonus — Pedro concede bonus de HONOR
// ====================================================

export type ApplyHonorBonusResult =
  | { success: true }
  | { success: false; error: string };

export async function applyHonorBonus(input: {
  targetUserId: string;
  amount: number;
  reason: string;
}): Promise<ApplyHonorBonusResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, error: "Quantidade deve ser positiva." };
  }
  if (input.amount > 500) {
    return { success: false, error: "Máximo 500 pontos por operação." };
  }
  if (!input.reason?.trim() || input.reason.trim().length < 5) {
    return { success: false, error: "Razão obrigatória (mínimo 5 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();
  const reason = input.reason.trim();

  const { error: honorErr } = await service
    .from("honor_ledger" as never)
    .insert({
      user_id: input.targetUserId,
      delta: input.amount,
      source: "admin_bonus",
      reason,
      admin_user_id: adminCheck.adminId,
      created_at: new Date().toISOString(),
    } as never);

  if (honorErr) {
    return { success: false, error: "Erro ao registrar bonus: " + honorErr.message };
  }

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId: input.targetUserId,
    action: "admin_bonus_honor",
    reason,
    payloadAfter: { honor_delta: input.amount },
  });

  revalidatePath(`/admin/users/${input.targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ====================================================
// grantAchievement — concede achievement ao usuário
// ====================================================

export type GrantAchievementResult =
  | { success: true }
  | { success: false; error: string };

export async function grantAchievement(input: {
  targetUserId: string;
  variant: string;
  reason: string;
}): Promise<GrantAchievementResult> {
  if (!input.variant?.trim()) {
    return { success: false, error: "Variant obrigatório." };
  }
  if (!input.reason?.trim() || input.reason.trim().length < 3) {
    return { success: false, error: "Razão obrigatória (mínimo 3 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();
  const reason = input.reason.trim();

  // Tenta inserir — se já existir, upsert via on_conflict
  const { error: achErr } = await service
    .from("achievements" as never)
    .upsert({
      user_id: input.targetUserId,
      variant: input.variant.trim(),
      granted_by: adminCheck.adminId,
      reason,
      granted_at: new Date().toISOString(),
    } as never, { onConflict: "user_id,variant" });

  if (achErr) {
    return { success: false, error: "Erro ao conceder achievement: " + achErr.message };
  }

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId: input.targetUserId,
    action: "grant_achievement",
    reason,
    payloadAfter: { variant: input.variant },
  });

  revalidatePath(`/admin/users/${input.targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ====================================================
// applyCoachNote — Coach Note inline na confirmação PT
// ====================================================

export type CoachNoteResult =
  | { success: true }
  | { success: false; error: string };

export async function applyCoachNote(input: {
  targetUserId: string;
  delta: 5 | -5;
  reason?: string;
  matchId?: string;
}): Promise<CoachNoteResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();
  const source = input.delta > 0 ? "coach_note_positive" : "coach_note_negative";
  const reason = input.reason?.trim() ?? (input.delta > 0 ? "Nota positiva do coach" : "Nota negativa do coach");

  const { error } = await service
    .from("honor_ledger" as never)
    .insert({
      user_id: input.targetUserId,
      delta: input.delta,
      source,
      reason,
      admin_user_id: adminCheck.adminId,
      match_id: input.matchId ?? null,
      created_at: new Date().toISOString(),
    } as never);

  if (error) {
    return { success: false, error: "Erro ao registrar coach note: " + error.message };
  }

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId: input.targetUserId,
    action: source,
    reason,
    payloadAfter: { honor_delta: input.delta, match_id: input.matchId },
  });

  revalidatePath(`/admin/users/${input.targetUserId}`);

  return { success: true };
}
