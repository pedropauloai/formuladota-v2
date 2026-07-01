// Queries de cosméticos (Compendium Fase 0). Leitura pública do EQUIPADO (perfil é
// público) + coleção do user logado (pra rota /colecao). Ver docs/foundations/COMPENDIUM.md.

import { createClient } from "@/lib/supabase/server";
import { xpProgress } from "@/lib/levels";
import {
  asRingAsset,
  asSmokeAsset,
  asFrameAsset,
  asBadgeAsset,
  meetsRequirement,
  type Cosmetic,
  type CosmeticSlot,
  type CosmeticRarity,
  type CosmeticSource,
  type CosmeticRequirement,
  type RingAsset,
  type SmokeAsset,
  type FrameAsset,
  type BadgeAsset,
} from "@/lib/cosmetics";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

interface CosmeticRow {
  id: string;
  slug: string;
  slot: string;
  name: string;
  description: string | null;
  rarity: string;
  source: string;
  requirement: unknown;
  asset_ref: unknown;
  sort_order: number;
}

function rowToCosmetic(r: CosmeticRow): Cosmetic {
  return {
    id: r.id,
    slug: r.slug,
    slot: r.slot as CosmeticSlot,
    name: r.name,
    description: r.description,
    rarity: r.rarity as CosmeticRarity,
    source: r.source as CosmeticSource,
    requirement: (r.requirement ?? { kind: "free" }) as CosmeticRequirement,
    assetRef: (r.asset_ref ?? {}) as Record<string, unknown>,
    sortOrder: r.sort_order,
  };
}

/** O que um user tem equipado, resolvido pros asset_refs por slot. Público. */
export interface EquippedCosmetics {
  ring: RingAsset | null; // null = sem cosmético equipado → front usa default por tier
  smoke: SmokeAsset | null;
  frame: FrameAsset | null;
  badge: BadgeAsset | null;
}

const EMPTY_EQUIPPED: EquippedCosmetics = {
  ring: null,
  smoke: null,
  frame: null,
  badge: null,
};

/**
 * Cosméticos equipados de um user (leitura pública). Recebe o client já criado
 * pra reuso no shell/perfil. Duas queries (sem depender de embed/FK tipada).
 */
export async function getEquippedForUser(
  supabase: ServerClient,
  userId: string
): Promise<EquippedCosmetics> {
  const { data: equipped } = await supabase
    .from("user_equipped")
    .select("slot, cosmetic_id")
    .eq("user_id", userId);

  const ids = (equipped ?? []).map((e) => e.cosmetic_id);
  if (ids.length === 0) return EMPTY_EQUIPPED;

  const { data: cosmetics } = await supabase
    .from("cosmetics")
    .select("slot, asset_ref")
    .in("id", ids);

  const out: EquippedCosmetics = { ...EMPTY_EQUIPPED };
  for (const c of cosmetics ?? []) {
    const ref = (c.asset_ref ?? {}) as Record<string, unknown>;
    if (c.slot === "ring") out.ring = asRingAsset(ref);
    else if (c.slot === "smoke") out.smoke = asSmokeAsset(ref);
    else if (c.slot === "frame") out.frame = asFrameAsset(ref);
    else if (c.slot === "badge") out.badge = asBadgeAsset(ref);
  }
  return out;
}

// --- Coleção do user logado (rota /colecao) ----------------------------------

export interface CollectionItem extends Cosmetic {
  owned: boolean; // tem direito (mérito) OU posse materializada
  equipped: boolean;
}

export interface CollectionSlot {
  slot: CosmeticSlot;
  items: CollectionItem[];
}

export interface MyCollection {
  level: number;
  slots: CollectionSlot[];
}

/**
 * Coleção completa do user logado: catálogo + o que ele já desbloqueou (mérito
 * calculado no TS, ou posse materializada) + o que está equipado. Agrupado por slot.
 */
export async function getMyCollection(): Promise<MyCollection | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: catalog }, { data: levelRow }, { data: owned }, { data: equipped }] =
    await Promise.all([
      supabase
        .from("cosmetics")
        .select(
          "id, slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order"
        )
        .eq("active", true)
        .order("slot")
        .order("sort_order"),
      supabase
        .from("user_levels")
        .select("total_xp_earned")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", user.id),
      supabase.from("user_equipped").select("cosmetic_id").eq("user_id", user.id),
    ]);

  const { level } = xpProgress(levelRow?.total_xp_earned ?? 0);
  const ownedIds = new Set((owned ?? []).map((o) => o.cosmetic_id));
  const equippedIds = new Set((equipped ?? []).map((e) => e.cosmetic_id));

  const bySlot = new Map<CosmeticSlot, CollectionItem[]>();
  for (const row of (catalog ?? []) as CosmeticRow[]) {
    const c = rowToCosmetic(row);
    const item: CollectionItem = {
      ...c,
      owned: ownedIds.has(c.id) || meetsRequirement(c.requirement, level),
      equipped: equippedIds.has(c.id),
    };
    const list = bySlot.get(c.slot) ?? [];
    list.push(item);
    bySlot.set(c.slot, list);
  }

  const slots: CollectionSlot[] = [...bySlot.entries()].map(([slot, items]) => ({
    slot,
    items,
  }));
  return { level, slots };
}
