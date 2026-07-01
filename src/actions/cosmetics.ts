"use server";

// Server actions de cosméticos (Compendium Fase 0). Equipar/desequipar.
// O DIREITO de mérito é validado AQUI (TS, fonte única da curva = src/lib/levels.ts);
// a RPC equip_cosmetic revalida a trava de posse pra itens 'locked' (pagos/futuros).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { xpProgress } from "@/lib/levels";
import {
  meetsRequirement,
  profileThemeCss,
  COSMETIC_SLOTS,
  type CosmeticRequirement,
} from "@/lib/cosmetics";

type ActionResult = { success: boolean; error?: string };

// Opções de fundo (slot profile_theme) pro picker do perfil — catálogo + posse/equipado.
export interface ProfileThemeOption {
  id: string;
  name: string;
  rarity: string;
  bg: string | null; // valor CSS de background-image (null = fundo limpo)
  owned: boolean;
  equipped: boolean;
}

export async function getProfileThemeOptions(): Promise<ProfileThemeOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const [{ data: catalog }, { data: levelRow }, { data: owned }, { data: equipped }] =
    await Promise.all([
      supabase
        .from("cosmetics")
        .select("id, name, rarity, requirement, asset_ref, sort_order")
        .eq("slot", "profile_theme")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("user_levels").select("total_xp_earned").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", user.id),
      supabase.from("user_equipped").select("cosmetic_id").eq("user_id", user.id),
    ]);
  const { level } = xpProgress(levelRow?.total_xp_earned ?? 0);
  const ownedIds = new Set((owned ?? []).map((o) => o.cosmetic_id));
  const equippedIds = new Set((equipped ?? []).map((e) => e.cosmetic_id));
  return (catalog ?? []).map((row) => {
    const req = (row.requirement ?? { kind: "free" }) as CosmeticRequirement;
    const ref = (row.asset_ref ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      rarity: row.rarity as string,
      bg: profileThemeCss(ref),
      owned: ownedIds.has(row.id) || meetsRequirement(req, level),
      equipped: equippedIds.has(row.id),
    };
  });
}

const IdSchema = z.string().uuid();
const SlotSchema = z.enum(COSMETIC_SLOTS);

export async function equipCosmetic(cosmeticId: string): Promise<ActionResult> {
  if (!IdSchema.safeParse(cosmeticId).success) {
    return { success: false, error: "ID inválido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: cos } = await supabase
    .from("cosmetics")
    .select("id, requirement")
    .eq("id", cosmeticId)
    .eq("active", true)
    .maybeSingle();
  if (!cos) return { success: false, error: "Cosmético inexistente" };

  const req = (cos.requirement ?? { kind: "free" }) as CosmeticRequirement;
  if (req.kind === "locked") {
    const { data: own } = await supabase
      .from("user_cosmetics")
      .select("cosmetic_id")
      .eq("user_id", user.id)
      .eq("cosmetic_id", cosmeticId)
      .maybeSingle();
    if (!own) return { success: false, error: "Você ainda não tem esse item." };
  } else {
    const { data: levelRow } = await supabase
      .from("user_levels")
      .select("total_xp_earned")
      .eq("user_id", user.id)
      .maybeSingle();
    const { level } = xpProgress(levelRow?.total_xp_earned ?? 0);
    if (!meetsRequirement(req, level)) {
      return { success: false, error: "Você ainda não desbloqueou esse item." };
    }
  }

  const { error } = await supabase.rpc("equip_cosmetic", {
    p_cosmetic_id: cosmeticId,
  });
  if (error) {
    console.error("[equipCosmetic] error:", error);
    return { success: false, error: "Não foi possível equipar" };
  }

  revalidatePath("/colecao");
  revalidatePath("/me");
  return { success: true };
}

export async function unequipSlot(slot: string): Promise<ActionResult> {
  if (!SlotSchema.safeParse(slot).success) {
    return { success: false, error: "Slot inválido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { error } = await supabase.rpc("unequip_slot", { p_slot: slot });
  if (error) {
    console.error("[unequipSlot] error:", error);
    return { success: false, error: "Não foi possível desequipar" };
  }

  revalidatePath("/colecao");
  revalidatePath("/me");
  return { success: true };
}
