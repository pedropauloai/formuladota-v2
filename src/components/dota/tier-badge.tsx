// Componente <TierBadge tier={n} stars={s} /> — Phase 7 H5.2.
// Renderiza badge cyberpunk reskinned do tier Dota (Herald → Immortal × 5 stars).
// Por enquanto badge texto+stars; V2 usa SVG/PNG art reskinned (cyan/red overlay sobre tier oficial).

import { Star } from "lucide-react";
import { mmrToTier } from "@/lib/mmr";

interface TierBadgeProps {
  mmr?: number;          // Modo: derivar tier+stars de mmr (preferred)
  tier?: number;         // Modo: passar tier+stars já computados
  stars?: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;    // mostra texto "Immortal" ao lado dos stars
}

const TIER_COLORS: Record<number, string> = {
  1: "text-zinc-400 border-zinc-400/40",     // Herald — bronze opaco
  2: "text-zinc-300 border-zinc-300/40",     // Guardian
  3: "text-amber-700 border-amber-700/40",   // Crusader — bronze
  4: "text-cyan-400 border-cyan-400/40",     // Archon — azul claro
  5: "text-emerald-500 border-emerald-500/40", // Legend — verde
  6: "text-purple-500 border-purple-500/40", // Ancient — roxo
  7: "text-blue-500 border-blue-500/40",     // Divine — azul vibrante
  8: "text-[var(--color-brand-red)] border-[var(--color-brand-red)]/60", // Immortal — vermelho FORMULADOTA
};

export function TierBadge({ mmr, tier, stars, size = "md", showName = false }: TierBadgeProps) {
  let computedTier: number;
  let computedStars: number;
  let tierName: string;

  if (typeof mmr === "number") {
    const info = mmrToTier(mmr);
    computedTier = info.tier;
    computedStars = info.stars;
    tierName = info.tierName;
  } else {
    computedTier = tier ?? 1;
    computedStars = stars ?? 1;
    tierName = mmrToTier(0).tierName; // fallback, recompute via mapping
    const computed = mmrToTier(0); // não dá pra resolver sem mmr; usa tier-map manual
    const tierNames = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
    tierName = tierNames[computedTier - 1] ?? "Herald";
    void computed;
  }

  const sizeCls = size === "lg" ? "text-base px-4 py-2" : size === "sm" ? "text-sm px-2 py-1" : "text-sm px-3 py-1.5";
  const iconSize = size === "lg" ? 14 : size === "sm" ? 10 : 12;
  const colorCls = TIER_COLORS[computedTier] ?? TIER_COLORS[1];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border bg-[var(--color-card)] font-display uppercase tracking-wide ${sizeCls} ${colorCls}`}
      aria-label={`Tier ${tierName}${computedStars > 0 ? `, ${computedStars} estrelas` : ""}`}
    >
      <span>{showName ? tierName : `T${computedTier}`}</span>
      {computedStars > 0 && (
        <span className="flex gap-0.5" aria-hidden="true">
          {Array.from({ length: computedStars }).map((_, i) => (
            <Star key={i} size={iconSize} fill="currentColor" />
          ))}
        </span>
      )}
    </span>
  );
}
