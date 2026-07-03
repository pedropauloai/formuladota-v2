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
  // Saldo aparece no QueueCtaFooter (/ranked-com-pro) e no mini-perfil (shell).
  revalidatePath("/ranked-com-pro");
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

// ====================================================
// swapSteamLink — troca MANUAL da conta Steam vinculada (exceção admin)
// ====================================================
// Anti-anonimato/anti-smurf: 1 Steam = 1 identidade (steam_links, UNIQUE steam_id_64).
// Quando um jogador vincula a conta ERRADA por engano e comprova ao Pedro, o admin
// troca aqui. Zera persona/avatar → a identidade re-sincroniza no próximo acesso do
// jogador (refreshSteamIdentity no /me). Busta o cache de stats (era da conta antiga).

export type SwapSteamResult = { success: true } | { success: false; error: string };

const STEAMID64_RE = /^\d{17}$/;

export async function swapSteamLink(
  targetUserId: string,
  newSteamId64: string,
  reason: string
): Promise<SwapSteamResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const sid = newSteamId64.trim();
  if (!STEAMID64_RE.test(sid)) {
    return { success: false, error: "SteamID64 inválido (precisa ter 17 dígitos)." };
  }
  if (!reason.trim()) {
    return { success: false, error: "Descreva o motivo (comprovação do engano do jogador)." };
  }

  const service = createServiceClient();

  // O novo Steam já pertence a OUTRO usuário? (viola a UNIQUE + o anti-smurf).
  const { data: conflict } = await service
    .from("steam_links")
    .select("user_id")
    .eq("steam_id_64", sid)
    .maybeSingle();
  if (conflict && conflict.user_id !== targetUserId) {
    return { success: false, error: "Esse Steam já está vinculado a OUTRO usuário." };
  }

  const { data: before } = await service
    .from("steam_links")
    .select("steam_id_64, persona")
    .eq("user_id", targetUserId)
    .maybeSingle();

  // Upsert (PK = user_id): troca o steam_id, zera persona/avatar (re-sync), verified agora.
  const { error } = await service.from("steam_links").upsert({
    user_id: targetUserId,
    steam_id_64: sid,
    persona: null,
    avatar_url: null,
    verified_at: new Date().toISOString(),
  } as never);
  if (error) {
    return { success: false, error: "Erro ao trocar o vínculo: " + error.message };
  }

  // Cache de stats/carreira pertencia à conta ANTIGA → busta pra re-sincronizar.
  await service
    .from("user_stats_extended")
    .update({ career: null, updated_at: "2020-01-01T00:00:00Z" } as never)
    .eq("user_id", targetUserId);

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId,
    action: "swap_steam_link",
    reason,
    payloadBefore: (before ?? {}) as Record<string, unknown>,
    payloadAfter: { steam_id_64: sid },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/me");
  return { success: true };
}

// ====================================================
// EDIÇÃO DE DADOS DO USUÁRIO (Pedro 2026-07-03)
// Painel admin ganha edição direta de: nome, MMR da temporada, ban e acesso.
// Todas passam por requireAdmin + audit log.
// ====================================================

export type EditResult = { success: true } | { success: false; error: string };

// ── Nome / nick oficial ──────────────────────────────────────────────────────
// Corrige o username exibido (números, caps, nome errado) sem depender do botão
// de uso único do jogador. Marca official_nick_set=true (fica "definido").
export async function updateUsernameAdmin(
  targetUserId: string,
  username: string
): Promise<EditResult> {
  const nick = username.trim();
  if (nick.length < 2 || nick.length > 32) {
    return { success: false, error: "Nome precisa ter entre 2 e 32 caracteres." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();
  const { data: before } = await service
    .from("profiles")
    .select("username")
    .eq("id", targetUserId)
    .maybeSingle();

  const { error } = await service
    .from("profiles")
    .update({ username: nick, official_nick_set: true } as never)
    .eq("id", targetUserId);
  if (error) return { success: false, error: "Erro ao atualizar o nome: " + error.message };

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId,
    action: "admin_edit_username",
    reason: "Edição admin do nome",
    payloadBefore: { username: before?.username ?? null },
    payloadAfter: { username: nick },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  revalidatePath("/ranking");
  revalidatePath(`/perfil/u/${targetUserId}`);
  return { success: true };
}

// ── MMR da temporada ─────────────────────────────────────────────────────────
// Ajusta o MMR FormulaDota da SEASON ATIVA (player_season_mmr). Ex.: corrigir
// calibração errada. Afeta a posição no /ranking. Cria a linha se não existir.
export async function setSeasonMmrAdmin(
  targetUserId: string,
  mmr: number,
  reason: string
): Promise<EditResult> {
  if (!Number.isInteger(mmr) || mmr < 0 || mmr > 10000) {
    return { success: false, error: "MMR precisa ser um inteiro entre 0 e 10000." };
  }
  if (reason.trim().length < 3) {
    return { success: false, error: "Razão obrigatória (mínimo 3 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };

  const service = createServiceClient();
  const { data: season } = await service
    .from("seasons")
    .select("id")
    .eq("active", true)
    .maybeSingle();
  if (!season) return { success: false, error: "Nenhuma temporada ativa." };

  const { data: before } = await service
    .from("player_season_mmr")
    .select("mmr")
    .eq("user_id", targetUserId)
    .eq("season_id", season.id)
    .maybeSingle();

  // peak_mmr não é tocado aqui (é gerido pelo fluxo de partidas); ajuste manual
  // só corrige o mmr corrente + garante calibrated.
  const { error } = await service
    .from("player_season_mmr")
    .upsert(
      {
        user_id: targetUserId,
        season_id: season.id,
        mmr,
        calibrated: true,
      } as never,
      { onConflict: "user_id,season_id" }
    );
  if (error) return { success: false, error: "Erro ao ajustar o MMR: " + error.message };

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId,
    action: "admin_edit_season_mmr",
    reason: reason.trim(),
    payloadBefore: { mmr: before?.mmr ?? null },
    payloadAfter: { mmr, season_id: season.id },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  revalidatePath("/ranking");
  return { success: true };
}

// ── Conduta: banir / desbanir ────────────────────────────────────────────────
// Banimento DIRETO (o acúmulo de strikes também bane, mas às vezes o admin quer
// aplicar/reverter na hora). Banido sai do /ranking e entra no /mural.
export async function setBanStatusAdmin(
  targetUserId: string,
  banned: boolean,
  reason: string
): Promise<EditResult> {
  if (banned && reason.trim().length < 5) {
    return { success: false, error: "Descreva o motivo do banimento (mínimo 5 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };
  if (targetUserId === adminCheck.adminId) {
    return { success: false, error: "Você não pode banir a si mesmo." };
  }

  const service = createServiceClient();
  const { data: before } = await service
    .from("profiles")
    .select("behavior_status, banned_at")
    .eq("id", targetUserId)
    .maybeSingle();

  const patch = banned
    ? {
        behavior_status: "banned",
        banned_at: new Date().toISOString(),
        banned_reason: reason.trim(),
      }
    : {
        behavior_status: "ok",
        banned_at: null,
        banned_reason: null,
      };

  const { error } = await service.from("profiles").update(patch as never).eq("id", targetUserId);
  if (error) return { success: false, error: "Erro ao alterar conduta: " + error.message };

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId,
    action: banned ? "admin_ban" : "admin_unban",
    reason: reason.trim() || "Desbanimento admin",
    payloadBefore: { behavior_status: before?.behavior_status ?? null },
    payloadAfter: { behavior_status: patch.behavior_status },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  revalidatePath("/ranking");
  revalidatePath("/mural");
  return { success: true };
}

// ── Acesso: role / admin ─────────────────────────────────────────────────────
// Sensível: concede/remove poderes. Guardas: não permite remover o próprio admin
// (evita se trancar pra fora).
export async function setUserAccessAdmin(
  targetUserId: string,
  input: { isAdmin: boolean; role: string },
  reason: string
): Promise<EditResult> {
  const role = input.role.trim();
  if (!["player", "coach", "admin"].includes(role)) {
    return { success: false, error: "Role inválida (player, coach ou admin)." };
  }
  if (reason.trim().length < 3) {
    return { success: false, error: "Razão obrigatória (mínimo 3 caracteres)." };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { success: false, error: adminCheck.error };
  if (targetUserId === adminCheck.adminId && !input.isAdmin) {
    return { success: false, error: "Você não pode remover o seu próprio admin." };
  }

  const service = createServiceClient();
  const { data: before } = await service
    .from("profiles")
    .select("is_admin, role")
    .eq("id", targetUserId)
    .maybeSingle();

  const { error } = await service
    .from("profiles")
    .update({ is_admin: input.isAdmin, role } as never)
    .eq("id", targetUserId);
  if (error) return { success: false, error: "Erro ao alterar acesso: " + error.message };

  await insertAuditLog(service, {
    actorId: adminCheck.adminId,
    targetUserId,
    action: "admin_edit_access",
    reason: reason.trim(),
    payloadBefore: { is_admin: before?.is_admin ?? null, role: before?.role ?? null },
    payloadAfter: { is_admin: input.isAdmin, role },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  return { success: true };
}
