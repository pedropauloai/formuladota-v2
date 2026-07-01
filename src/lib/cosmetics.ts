// Cosméticos — lib PURA de domínio (sem DB, sem React). Tipos + regras de mérito.
// Fase 0 do Compendium (ver docs/foundations/COMPENDIUM.md). O DIREITO de mérito é
// calculado AQUI (fonte única da curva = src/lib/levels.ts), não no SQL.

import type { Tier } from "@/lib/levels";
import { getTierForLevel } from "@/lib/levels";

export const COSMETIC_SLOTS = [
  "ring",
  "frame",
  "smoke",
  "badge",
  "profile_theme",
  "name_effect",
  "notification_sound",
  "chat_reaction",
] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export type CosmeticRarity = "comum" | "raro" | "epico" | "lendario" | "imortal";
export type CosmeticSource =
  | "merito"
  | "temporada"
  | "passe"
  | "plano"
  | "comunidade"
  | "voto";

// Fundo do perfil (slot profile_theme) → valor CSS de `background-image`. Dois formatos:
//   { kind: "image", image: "/dota/backgrounds/x.jpg" } → url("...")
//   { kind: "css",   background: "<gradientes>" }        → o próprio valor CSS
// (fallback: image "solto" pra compat). null = fundo premium limpo (default).
export function profileThemeCss(
  ref: Record<string, unknown>
): string | null {
  if (ref.kind === "css" && typeof ref.background === "string") return ref.background;
  if (typeof ref.image === "string") return `url("${ref.image}")`;
  return null;
}

// asset_ref (config que o front usa pra renderizar) — shapes por slot.
export type RingAsset = { kind: "tier"; tier: Tier } | { kind: "none" };
export type SmokeAsset = { mid: string; hot: string };
export type FrameAsset =
  | { kind: "none" }
  | { kind: "solid"; color: "brand" | "gold" }
  | { kind: "animated"; color: "brand" | "gold" };
export type BadgeAsset = { icon: string; color: string };

// requirement — como se desbloqueia.
export type CosmeticRequirement =
  | { kind: "free" }
  | { kind: "merito"; tier?: Tier; minLevel?: number }
  | { kind: "locked" };

export interface Cosmetic {
  id: string;
  slug: string;
  slot: CosmeticSlot;
  name: string;
  description: string | null;
  rarity: CosmeticRarity;
  source: CosmeticSource;
  requirement: CosmeticRequirement;
  /** Config crua pro front — parseada por slot no ponto de uso. */
  assetRef: Record<string, unknown>;
  sortOrder: number;
}

// Ordem dos tiers pra comparar "atingiu o tier X ou superior".
const TIER_ORDER: Tier[] = [
  "novato",
  "aprendiz",
  "piloto",
  "as",
  "lendario",
  "mistico",
];

/**
 * O user (dado seu nível) cumpre o requisito de mérito de um cosmético?
 * - free → sempre.
 * - locked → nunca por mérito (exige posse materializada — pagos/concedidos).
 * - merito com minLevel → nível ≥ minLevel.
 * - merito com tier → tier atual ≥ tier exigido.
 */
export function meetsRequirement(
  req: CosmeticRequirement,
  userLevel: number
): boolean {
  if (req.kind === "free") return true;
  if (req.kind === "locked") return false;
  // merito: precisa cumprir minLevel (se houver) E tier (se houver) — ambos.
  if (typeof req.minLevel === "number" && userLevel < req.minLevel) return false;
  if (req.tier) {
    const userTier = getTierForLevel(userLevel);
    if (TIER_ORDER.indexOf(userTier) < TIER_ORDER.indexOf(req.tier)) return false;
  }
  return true;
}

// Metadados de raridade — cores na PELE brand (escada de materiais, como o TIER_CONFIG).
export const RARITY_META: Record<
  CosmeticRarity,
  { label: string; text: string; border: string; ring: string }
> = {
  comum: {
    label: "Comum",
    text: "text-metal-silver",
    border: "border-metal-silver/40",
    ring: "ring-metal-silver/40",
  },
  raro: {
    label: "Raro",
    text: "text-play-primary",
    border: "border-play-primary/40",
    ring: "ring-play-primary/40",
  },
  epico: {
    label: "Épico",
    text: "text-gold",
    border: "border-gold/40",
    ring: "ring-gold/40",
  },
  lendario: {
    label: "Lendário",
    text: "text-gold-bright",
    border: "border-gold-bright/50",
    ring: "ring-gold-bright/50",
  },
  imortal: {
    label: "Imortal",
    text: "text-brand-primary",
    border: "border-brand-primary/50",
    ring: "ring-brand-primary/50",
  },
};

// --- Type guards / parsers de asset_ref por slot -----------------------------

export function asRingAsset(ref: Record<string, unknown>): RingAsset {
  // Valida o tier contra a lista conhecida — asset_ref malformado ({tier:'garbage'})
  // não pode virar um tier inválido (TIER_CONFIG[tier] undefined crasharia o ring).
  if (
    ref.kind === "tier" &&
    typeof ref.tier === "string" &&
    (TIER_ORDER as string[]).includes(ref.tier)
  ) {
    return { kind: "tier", tier: ref.tier as Tier };
  }
  return { kind: "none" };
}

export function asSmokeAsset(ref: Record<string, unknown>): SmokeAsset | null {
  if (typeof ref.mid === "string" && typeof ref.hot === "string") {
    return { mid: ref.mid, hot: ref.hot };
  }
  return null;
}

export function asFrameAsset(ref: Record<string, unknown>): FrameAsset {
  if (
    (ref.kind === "solid" || ref.kind === "animated") &&
    (ref.color === "brand" || ref.color === "gold")
  ) {
    return { kind: ref.kind, color: ref.color };
  }
  return { kind: "none" };
}

export function asBadgeAsset(ref: Record<string, unknown>): BadgeAsset | null {
  if (typeof ref.icon === "string") {
    return { icon: ref.icon, color: typeof ref.color === "string" ? ref.color : "brand" };
  }
  return null;
}
