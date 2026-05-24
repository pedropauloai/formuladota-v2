"use server";

// Server Actions — Pricing descentralizado FormulaDota
//
// Fluxo de atualização de preço (updateMyPackagePrice):
//   1. Valida input via Zod (floor R$10, ceiling absoluto R$100)
//   2. Verifica se caller é PRO ativo
//   3. Verifica se package pertence ao caller (via coaches.profile_id)
//   4. Verifica cooldown 30 dias via can_change_price RPC
//   5. Verifica ceiling permitido pelo tier HONOR via get_max_price_for_pro RPC
//   6. Registra em package_price_history (audit imutável)
//   7. Atualiza packages.preco_brl + last_price_change_at
//   8. Revalida /pro e /coaches/[slug]
//
// Decisão Pedro 2026-05-23: preço é compromisso, não marketing.
// Histórico imutável garante transparência sagrada pra alunos.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ====================================================
// Schemas de validação
// ====================================================

const UpdatePriceSchema = z.object({
  packageId: z.string().uuid("ID de package inválido."),
  newPrice: z
    .number()
    .min(10, "Preço mínimo é R$ 10,00 (floor universal anti-dumping).")
    .max(100, "Preço absoluto máximo é R$ 100,00."),
  reason: z
    .string()
    .min(10, "Justificativa deve ter pelo menos 10 caracteres.")
    .max(500, "Justificativa deve ter no máximo 500 caracteres."),
});

// ====================================================
// Tipos de retorno
// ====================================================

export interface UpdatePriceResult {
  success: boolean;
  error?: string;
  details?: {
    maxAllowed: number;
    cooldownDaysRemaining: number;
  };
}

export interface PricingInfoResult {
  success: boolean;
  data?: {
    currentPrice: number;
    maxAllowed: number;
    honorTier: string;
    honorScore: number;
    canChangeNow: boolean;
    nextChangeAt: string | null;  // ISO string (serializable pra Client Component)
    daysRemaining: number;
    history: Array<{
      priceBefore: number;
      priceAfter: number;
      reason: string | null;
      honorTierAtChange: string | null;
      changedAt: string;          // ISO string
    }>;
  };
  error?: string;
}

// ====================================================
// updateMyPackagePrice — PRO atualiza próprio preço
// ====================================================

/**
 * Atualiza o preço de um package do PRO logado.
 *
 * Guardrails aplicados (em ordem):
 * - Floor R$ 10 (Zod)
 * - Package pertence ao PRO logado (não pode editar package alheio)
 * - Cooldown 30 dias (can_change_price RPC)
 * - Ceiling escalonado por tier HONOR (get_max_price_for_pro RPC)
 * - Registro imutável em package_price_history
 */
export async function updateMyPackagePrice(
  rawInput: z.infer<typeof UpdatePriceSchema>
): Promise<UpdatePriceResult> {
  // 1. Valida input
  const parsed = UpdatePriceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Input inválido." };
  }
  const { packageId, newPrice, reason } = parsed.data;

  // 2. Autentica caller via cookie
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  // 3. Verifica se caller é PRO ativo
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!promo) {
    return { success: false, error: "Acesso negado. Apenas PROs ativos podem editar preços." };
  }

  // 4. Verifica se package pertence ao PRO logado (via coaches.profile_id)
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, preco_brl, coach_id, last_price_change_at")
    .eq("id", packageId)
    .maybeSingle();

  if (!pkg) {
    return { success: false, error: "Package não encontrado." };
  }

  // Busca coach_id do PRO logado
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach || pkg.coach_id !== coach.id) {
    return { success: false, error: "Acesso negado. Este package não pertence a você." };
  }

  // 5. Verifica cooldown 30 dias via RPC
  const { data: cooldownRows } = await supabase.rpc("can_change_price", {
    p_package_id: packageId,
  });

  const cooldown = cooldownRows?.[0];
  if (cooldown && !cooldown.can_change) {
    return {
      success: false,
      error: `Cooldown ativo. Próxima mudança permitida em ${cooldown.days_remaining} dia(s).`,
      details: {
        maxAllowed: 0, // preenchido abaixo se necessário
        cooldownDaysRemaining: cooldown.days_remaining ?? 0,
      },
    };
  }

  // 6. Verifica ceiling permitido pelo tier HONOR via RPC
  const { data: maxAllowed } = await supabase.rpc("get_max_price_for_pro", {
    p_user_id: user.id,
  });

  const ceiling = maxAllowed ?? 25;

  if (newPrice > ceiling) {
    return {
      success: false,
      error: `Seu tier HONOR permite cobrar no máximo R$ ${ceiling.toFixed(2)}. Suba de tier para desbloquear ceiling maior.`,
      details: {
        maxAllowed: ceiling,
        cooldownDaysRemaining: 0,
      },
    };
  }

  // 7. Busca honor tier atual pra registrar no histórico (audit)
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: user.id,
  });
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });

  // 8. Registra em package_price_history + atualiza preço (service role = bypass RLS)
  const service = createServiceClient();

  const { error: historyError } = await service
    .from("package_price_history")
    .insert({
      package_id: packageId,
      changed_by_user_id: user.id,
      price_before: Number(pkg.preco_brl),
      price_after: newPrice,
      reason,
      honor_tier_at_change: honorTierStr ?? "aprendiz",
    });

  if (historyError) {
    console.error("[updateMyPackagePrice] Erro ao registrar histórico:", historyError);
    return { success: false, error: "Erro interno ao registrar histórico de preço." };
  }

  // 9. Atualiza o preço e last_price_change_at
  const { error: updateError } = await service
    .from("packages")
    .update({
      preco_brl: newPrice,
      last_price_change_at: new Date().toISOString(),
    })
    .eq("id", packageId);

  if (updateError) {
    console.error("[updateMyPackagePrice] Erro ao atualizar preço:", updateError);
    return { success: false, error: "Erro interno ao atualizar preço." };
  }

  // 10. Revalida páginas relevantes
  revalidatePath("/pro");
  // Revalida página pública do PRO se slug existir
  const { data: coachSlug } = await supabase
    .from("coaches")
    .select("slug")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (coachSlug?.slug) {
    revalidatePath(`/coaches/${coachSlug.slug}`);
  }

  return { success: true };
}

// ====================================================
// getMyPricingInfo — lê info de pricing do PRO logado
// ====================================================

/**
 * Retorna informações completas de pricing para o PRO logado:
 * - Preço atual do package
 * - Ceiling permitido pelo tier HONOR
 * - Status do cooldown
 * - Histórico de mudanças (últimas 20)
 */
export async function getMyPricingInfo(
  packageId: string
): Promise<PricingInfoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sessão expirada." };
  }

  // Busca package + honor score + ceiling + cooldown em paralelo
  const [
    { data: pkg },
    { data: honorScore },
    { data: maxAllowed },
    { data: cooldownRows },
    { data: historyRows },
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("preco_brl, last_price_change_at")
      .eq("id", packageId)
      .maybeSingle(),
    supabase.rpc("get_honor_score", { p_user_id: user.id }),
    supabase.rpc("get_max_price_for_pro", { p_user_id: user.id }),
    supabase.rpc("can_change_price", { p_package_id: packageId }),
    supabase
      .from("package_price_history")
      .select("price_before, price_after, reason, honor_tier_at_change, created_at")
      .eq("package_id", packageId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!pkg) {
    return { success: false, error: "Package não encontrado." };
  }

  // Honor tier pra label legível
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });

  const cooldown = cooldownRows?.[0];
  const ceiling = maxAllowed ?? 25;

  return {
    success: true,
    data: {
      currentPrice: Number(pkg.preco_brl),
      maxAllowed: ceiling,
      honorTier: honorTierStr ?? "aprendiz",
      honorScore: honorScore ?? 1000,
      canChangeNow: cooldown?.can_change ?? true,
      nextChangeAt: cooldown?.next_change_allowed_at ?? null,
      daysRemaining: cooldown?.days_remaining ?? 0,
      history: (historyRows ?? []).map((row) => ({
        priceBefore: Number(row.price_before),
        priceAfter: Number(row.price_after),
        reason: row.reason,
        honorTierAtChange: row.honor_tier_at_change,
        changedAt: row.created_at,
      })),
    },
  };
}
