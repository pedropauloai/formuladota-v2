"use server";

// Server Actions: gerenciamento de PROs FormulaDota.
//
// Fluxo de promoção (promoveCoach):
//   1. Verifica caller é admin
//   2. Verifica critérios mínimos do target (Imortal + seasons + achievements + sem strikes)
//   3. Cria row em coaches (se não existir)
//   4. Cria row em pro_promotions (sponsor = caller)
//   5. Insere pro_audit_log com critérios atingidos
//   6. Revalida /admin/users/[targetId]
//
// Revenue tracking:
//   O split financeiro é automático via trigger PG (calculate_revenue_split).
//   As actions aqui apenas consultam o resumo via RPC get_pro_revenue_summary.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ====================================================
// Tipos auxiliares
// ====================================================

export interface PromoResult {
  success: boolean;
  error?: string;
  /** Lista de critérios faltantes quando success=false por critérios */
  missingCriteria?: string[];
}

export interface RevenueResult {
  success: boolean;
  data?: {
    totalRevenue: number;
    proEarnings: number;
    sponsorGiven: number;
    totalSales: number;
    isFirstSaleDone: boolean;
  };
  error?: string;
}

// ====================================================
// promoveCoach — admin promove user a PRO
// ====================================================

interface PromoteCoachInput {
  targetUserId: string;
  promotionNotes: string;
}

/**
 * Promove um usuário a status PRO.
 * Apenas admins podem chamar. Valida critérios mínimos antes de promover.
 *
 * Critérios obrigatórios:
 * - Pelo menos 1 season completa no sistema (registered_at há pelo menos 60 dias)
 * - Sem strikes graves (is_banned = false)
 * - Ainda não é PRO ativo (sem pro_promotions active)
 */
export async function promoveCoach(
  input: PromoteCoachInput
): Promise<PromoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  // 1. Verifica se caller é admin
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return { success: false, error: "Apenas admins podem promover PROs." };
  }

  // 2. Busca perfil do target com dados para validar critérios
  const { data: target, error: targetErr } = await supabase
    .from("profiles")
    .select("id, username, is_banned, created_at")
    .eq("id", input.targetUserId)
    .single();

  if (targetErr || !target) {
    return { success: false, error: "Usuário não encontrado." };
  }

  // 3. Valida critérios mínimos
  const missingCriteria: string[] = [];

  // Critério: conta com pelo menos 60 dias (equivalente a ~1 season)
  const accountAgeDays =
    (Date.now() - new Date(target.created_at).getTime()) /
    (1000 * 60 * 60 * 24);
  if (accountAgeDays < 60) {
    missingCriteria.push(
      `Conta criada há ${Math.floor(accountAgeDays)} dias — mínimo 60 dias (≈1 season)`
    );
  }

  // Critério: sem banimento
  if (target.is_banned) {
    missingCriteria.push("Usuário banido — não elegível para promoção");
  }

  // Critério: não ter pro_promotion ativa já
  const { data: existingPromo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", input.targetUserId)
    .eq("status", "active")
    .maybeSingle();

  if (existingPromo) {
    return { success: false, error: "Usuário já é PRO ativo." };
  }

  if (missingCriteria.length > 0) {
    return { success: false, error: "Critérios não atendidos.", missingCriteria };
  }

  // 4. Usa service client para mutations que precisam de bypass de RLS
  const service = createServiceClient();

  // 4a. Cria row em coaches se não existir
  const { data: existingCoach } = await service
    .from("coaches")
    .select("id")
    .eq("profile_id", input.targetUserId)
    .maybeSingle();

  if (!existingCoach) {
    const slug = (target.username ?? input.targetUserId)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    const { error: coachErr } = await service.from("coaches").insert({
      profile_id: input.targetUserId,
      slug,
      bio: `PRO FormulaDota — promovido em ${new Date().toLocaleDateString("pt-BR")}`,
      ativo: true,
    });

    if (coachErr) {
      console.error("[promoveCoach] Erro ao criar coach:", coachErr.message);
      return { success: false, error: "Erro ao criar perfil de coach." };
    }
  }

  // 4b. Cria pro_promotion
  const { error: promoErr } = await service.from("pro_promotions").insert({
    user_id: input.targetUserId,
    sponsor_user_id: user.id,
    promotion_notes: input.promotionNotes,
  });

  if (promoErr) {
    console.error("[promoveCoach] Erro ao criar pro_promotion:", promoErr.message);
    return { success: false, error: "Erro ao registrar promoção." };
  }

  // 5. Audit log
  await service.from("pro_audit_log").insert({
    actor_user_id: user.id,
    target_user_id: input.targetUserId,
    action: "promote_to_pro",
    payload: {
      promotion_notes: input.promotionNotes,
      account_age_days: Math.floor(accountAgeDays),
    },
    reason: input.promotionNotes,
  });

  // 6. Revalida páginas do admin
  revalidatePath(`/admin/users/${input.targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ====================================================
// revokeCoachStatus — admin revoga PRO
// ====================================================

/**
 * Revoga status de PRO de um usuário.
 * Apenas admin pode revogar. Audit log obrigatório.
 */
export async function revokeCoachStatus(
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return { success: false, error: "Apenas admins podem revogar PROs." };
  }

  if (!reason?.trim()) {
    return { success: false, error: "Motivo obrigatório para revogação." };
  }

  const service = createServiceClient();

  // Atualiza pro_promotion para revoked
  const { error: updateErr } = await service
    .from("pro_promotions")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq("user_id", targetUserId)
    .eq("status", "active");

  if (updateErr) {
    console.error("[revokeCoachStatus] Erro:", updateErr.message);
    return { success: false, error: "Erro ao revogar status." };
  }

  // Desativa coach
  await service
    .from("coaches")
    .update({ ativo: false, fila_aberta: false })
    .eq("profile_id", targetUserId);

  // Audit log
  await service.from("pro_audit_log").insert({
    actor_user_id: user.id,
    target_user_id: targetUserId,
    action: "revoke_pro",
    reason,
    payload: { revoked_by: user.id },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ====================================================
// pausePro — PRO pausa próprio status voluntariamente
// ====================================================

/**
 * PRO logado pausa o próprio status.
 * Status 'paused' oculta da lista pública mas mantém histórico e revenue.
 */
export async function pausePro(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  // Verifica se é PRO ativo
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!promo) {
    return { success: false, error: "Você não é PRO ativo." };
  }

  const service = createServiceClient();

  const { error: pauseErr } = await service
    .from("pro_promotions")
    .update({ status: "paused" })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (pauseErr) {
    console.error("[pausePro] Erro:", pauseErr.message);
    return { success: false, error: "Erro ao pausar status." };
  }

  // Fecha fila automaticamente ao pausar
  await service
    .from("coaches")
    .update({ fila_aberta: false })
    .eq("profile_id", user.id);

  // Audit log
  await service.from("pro_audit_log").insert({
    actor_user_id: user.id,
    target_user_id: user.id,
    action: "pause_pro",
    reason: "Pausa voluntária pelo PRO",
  });

  revalidatePath("/dashboard");

  return { success: true };
}

// ====================================================
// resumePro — PRO retoma status pausado
// ====================================================

/**
 * PRO logado retoma status após pausa voluntária.
 * Apenas pausa voluntária pode ser revertida pelo próprio PRO.
 * Revogação exige admin.
 */
export async function resumePro(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "paused")
    .maybeSingle();

  if (!promo) {
    return {
      success: false,
      error: "Nenhuma pausa voluntária ativa. Revogações exigem admin.",
    };
  }

  const service = createServiceClient();

  const { error: resumeErr } = await service
    .from("pro_promotions")
    .update({ status: "active" })
    .eq("user_id", user.id)
    .eq("status", "paused");

  if (resumeErr) {
    console.error("[resumePro] Erro:", resumeErr.message);
    return { success: false, error: "Erro ao retomar status." };
  }

  await service.from("pro_audit_log").insert({
    actor_user_id: user.id,
    target_user_id: user.id,
    action: "resume_pro",
    reason: "Retorno voluntário pelo PRO",
  });

  revalidatePath("/dashboard");

  return { success: true };
}

// ====================================================
// getMyProRevenue — PRO consulta próprio revenue
// ====================================================

/**
 * Retorna resumo de revenue do PRO logado.
 * Opcionalmente filtrado por data (since).
 */
export async function getMyProRevenue(
  since?: Date
): Promise<RevenueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data, error } = await supabase.rpc("get_pro_revenue_summary", {
    p_pro_user_id: user.id,
    p_since: since?.toISOString() ?? null,
  });

  if (error) {
    console.error("[getMyProRevenue] Erro RPC:", error.message);
    return { success: false, error: "Erro ao buscar revenue." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      success: true,
      data: {
        totalRevenue: 0,
        proEarnings: 0,
        sponsorGiven: 0,
        totalSales: 0,
        isFirstSaleDone: false,
      },
    };
  }

  return {
    success: true,
    data: {
      totalRevenue: Number(row.total_revenue),
      proEarnings: Number(row.pro_earnings),
      sponsorGiven: Number(row.sponsor_given),
      totalSales: Number(row.total_sales),
      isFirstSaleDone: Boolean(row.is_first_sale_done),
    },
  };
}

// ====================================================
// getProRevenue — admin consulta revenue de qualquer PRO
// ====================================================

/**
 * Admin consulta resumo de revenue de qualquer PRO.
 * Requer is_admin = true no perfil do caller.
 */
export async function getProRevenue(
  proUserId: string,
  since?: Date
): Promise<RevenueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return { success: false, error: "Apenas admins podem consultar revenue de outros PROs." };
  }

  const { data, error } = await supabase.rpc("get_pro_revenue_summary", {
    p_pro_user_id: proUserId,
    p_since: since?.toISOString() ?? null,
  });

  if (error) {
    console.error("[getProRevenue] Erro RPC:", error.message);
    return { success: false, error: "Erro ao buscar revenue." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      success: true,
      data: {
        totalRevenue: 0,
        proEarnings: 0,
        sponsorGiven: 0,
        totalSales: 0,
        isFirstSaleDone: false,
      },
    };
  }

  return {
    success: true,
    data: {
      totalRevenue: Number(row.total_revenue),
      proEarnings: Number(row.pro_earnings),
      sponsorGiven: Number(row.sponsor_given),
      totalSales: Number(row.total_sales),
      isFirstSaleDone: Boolean(row.is_first_sale_done),
    },
  };
}
