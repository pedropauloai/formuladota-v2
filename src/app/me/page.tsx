// /me — Painel do player Phase 9 (Perfil Dota 2 + Social).
// ClientShell modo IMMERSIVE com centerHero=hero portrait do user (D-09).
// Sidebar esquerda continua visível como overlay (D-01 a D-07).
//
// BLOCKER #3 fix: hero portrait fullscreen NÃO é renderizado aqui.
// É delegado ao ClientShell via centerHero prop — background fixo atrás das sidebars.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientShell } from "@/components/client-shell/shell";
import { ProfilePage } from "@/components/profile/profile-page";
import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
import { getProfileForMe } from "@/lib/queries/profile";
import { getCareerStats } from "@/lib/queries/career";
import { getFormulaDotaProfileStats } from "@/lib/queries/formuladota-stats";
import { syncPlayerStats } from "@/app/perfil/actions";
import { rankTierToDotaRank } from "@/components/profile/career-stats";
import { getCoachingReviewsForUser } from "@/lib/queries/coaching-reviews";
import { refreshSteamIdentity } from "@/lib/steam/refresh-identity";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import { getGatedTierForLevel, xpProgress, mmrFromRankTier } from "@/lib/levels";
import { getEquippedForUser } from "@/lib/queries/cosmetics";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("meMetaTitle") };
}

// Helper local — mapeia MMR Valve → DotaRank (mesma escala do /coaches/[slug])
function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
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

// Next.js 15+: searchParams é uma Promise que precisa de await (pitfall 5)
interface PageProps {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}

export default async function MePage({ searchParams }: PageProps) {
  // getProfileForMe já checa autenticação e retorna null se não logado
  const profile = await getProfileForMe();
  if (!profile) redirect("/");

  // Refresh do snapshot Steam (nick/foto) — fire-and-forget: NÃO bloqueia o
  // render e falha em silêncio se a Steam API estiver fora. Visitar o próprio
  // perfil mantém a identidade fresca pra próxima renderização.
  void refreshSteamIdentity(profile.userId);

  // Resolve tab ativa: default "perfil", fallback pra qualquer tab inválida
  const { tab: rawTab, edit } = await searchParams;
  const activeTab: ProfileTab =
    rawTab && (VALID_TABS as readonly string[]).includes(rawTab)
      ? (rawTab as ProfileTab)
      : "perfil";
  // Edit mode via searchParams — ?edit=1 ativa edição inline
  const editing = edit === "1";

  // PERFORMANCE (auditoria): tudo que só depende de profile.userId roda em PARALELO.
  // Antes eram ~6 awaits em série (~6 round-trips somados no TTFB). getCareerStats e
  // syncPlayerStats têm cache próprio (24h) e nunca lançam.
  const supabase = await createClient();
  const [career, levelRow, coachingReviews, ext, fdotaStats, equippedForBg] =
    await Promise.all([
      // Carreira OpenDota/STRATZ (cache 24h) — hexágono + medalha SKILL.
      getCareerStats(profile.userId),
      supabase
        .from("user_levels")
        .select("total_xp_earned")
        .eq("user_id", profile.userId)
        .maybeSingle(),
      // Análises de coaching recebidas (aba Conduta) — RLS: aluno lê as próprias.
      getCoachingReviewsForUser(supabase, profile.userId),
      // Carreira REAL (STRATZ) pros hexágonos de performance.
      syncPlayerStats({ userId: profile.userId }),
      getFormulaDotaProfileStats(profile.userId),
      // Fundo do perfil (slot profile_theme equipado).
      getEquippedForUser(supabase, profile.userId),
    ]);

  // Medalha SKILL = RANK VALVE REAL (career.rankTier); fallback pro MMR de liga.
  const dotaRank =
    rankTierToDotaRank(career?.rankTier ?? null, career?.leaderboardRank ?? null) ??
    mmrToDotaRank(profile.mmr);

  // HONOR = NÍVEL da conta com co-requisito de skill (gate pela skill Valve real).
  const { level } = xpProgress(levelRow.data?.total_xp_earned ?? 0);
  const honorRank: HonorRank = getGatedTierForLevel(
    level,
    mmrFromRankTier(career?.rankTier ?? null)
  );

  const extData = ext.success ? ext.data : null;

  // Hexágono "Conta geral" = carreira do STRATZ (KDA/GPM/XPM/LH/Dano médios).
  const general = extData
    ? {
        matches: extData.totalMatches,
        wins: extData.totalWins,
        losses: Math.max(0, extData.totalMatches - extData.totalWins),
        avgKDA: extData.avgKDA,
        avgGPM: extData.avgGPM,
        avgXPM: extData.avgXPM,
        avgLastHits: extData.avgLastHits,
        avgHeroDamage: extData.avgHeroDamage,
      }
    : null;

  // Fundo do perfil = profile_theme equipado; default (nada) = fundo premium limpo.
  const centerHero = equippedForBg.profileTheme ?? undefined;

  return (
    <ClientShell currentRoute="/me" immersive centerHero={centerHero}>
      <ProfilePage
        profile={profile}
        activeTab={activeTab}
        dotaRank={dotaRank}
        honorRank={honorRank}
        editing={editing}
        career={career}
        coachingReviews={coachingReviews}
        general={general}
        fdota={fdotaStats}
      />
    </ClientShell>
  );
}
