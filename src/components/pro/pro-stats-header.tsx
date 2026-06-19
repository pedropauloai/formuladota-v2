// ProStatsHeader — cabeçalho do painel PRO com identidade + tier + status.
//
// Server Component: fetcha dados direto do Supabase server-side.
// Exibe: UserAvatar + username + tier HONOR + tier SKILL + badge de status.
//
// Zero hex hardcoded — apenas tokens semânticos.

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, legacyHonorToBand, type HonorRank } from "@/components/ui/honor-rank-medal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers de conversão de tier
// ---------------------------------------------------------------------------

/** Mapeia resultado do RPC get_honor_tier para HonorRank do componente */
function toHonorRank(tierStr: string | null): HonorRank {
  // RPC get_honor_tier ainda retorna o modelo antigo (8 tiers) — mapeia pras 6 bandas.
  return legacyHonorToBand(tierStr ?? "aprendiz");
}

/** Converte MMR numérico para DotaRank simplificado (sem stars) */
function mmrToDotaRank(mmr: number | null): DotaRank {
  if (mmr === null) return "herald";
  if (mmr >= 9000) return "immortal-top-100";
  if (mmr >= 6000) return "immortal";
  if (mmr >= 5000) return "divine";
  if (mmr >= 4000) return "ancient";
  if (mmr >= 3000) return "legend";
  if (mmr >= 2000) return "archon";
  if (mmr >= 1500) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface ProStatsHeaderProps {
  /** ID do PRO para buscar dados */
  proUserId: string;
}

/**
 * Cabeçalho do painel PRO.
 * Exibe: avatar + username + tier HONOR + tier SKILL + badge de status PRO.
 */
export async function ProStatsHeader({ proUserId }: ProStatsHeaderProps) {
  const t = await getTranslations("proCockpit");
  const supabase = await createClient();

  // Busca perfil, coach data e pro_promotion em paralelo
  const [
    { data: profile },
    { data: coach },
    { data: promo },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, mmr_atual")
      .eq("id", proUserId)
      .single(),
    supabase
      .from("coaches")
      .select("bio, headline")
      .eq("profile_id", proUserId)
      .maybeSingle(),
    supabase
      .from("pro_promotions")
      .select("status, promoted_at")
      .eq("user_id", proUserId)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Honor score via RPC
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: proUserId,
  });

  // Honor tier via RPC
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 0,
  });

  const username = profile?.username ?? "PRO";
  const avatarUrl = profile?.avatar_url ?? undefined;
  const mmr = profile?.mmr_atual ?? null;
  const dotaRank = mmrToDotaRank(mmr);
  const honorRank = toHonorRank(honorTierStr);
  const status = promo?.status ?? "active";
  const isActive = status === "active";

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Esquerda: avatar + identidade + tiers */}
      <div className="flex items-center gap-4">
        {/* Avatar com ring brand se ativo */}
        <UserAvatar
          src={avatarUrl}
          alt={t("avatarAlt", { name: username })}
          fallback={initials}
          size="lg"
          ringColor={isActive ? "brand" : null}
        />

        <div className="flex flex-col gap-1">
          {/* Username + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl font-bold uppercase tracking-widest text-text-display">
              {username}
            </span>
            {/* Badge de status PRO */}
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium uppercase tracking-wider",
                isActive
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-warning/15 text-warning border border-warning/30"
              )}
            >
              {isActive ? t("proActive") : t("proPaused")}
            </span>
          </div>

          {/* Headline do coach */}
          {coach?.headline && (
            <p className="text-sm text-text-muted">
              {coach.headline}
            </p>
          )}

          {/* Duo de medalhas SKILL + HONOR */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <DotaRankMedal rank={dotaRank} size="sm" />
              <span className="text-sm text-text-muted font-mono">
                {mmr ? `${mmr} MMR` : "MMR —"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <HonorRankMedal rank={honorRank} size="sm" />
              <span className="text-sm text-text-muted font-mono">
                {honorScore ?? 0} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Direita: data de promoção */}
      {promo?.promoted_at && (
        <div className="text-right">
          <span className="text-sm text-text-muted uppercase tracking-wider">
            {t("proSince")}
          </span>
          <p className="text-sm text-text-body font-mono">
            {new Date(promo.promoted_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
