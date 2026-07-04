// ProfileView — renderização COMPARTILHADA do perfil público de um membro.
// Usada por /perfil/<handle> (canônica) e /perfil/u/<uuid> (legada/redirect).
// Mesma estrutura do /me (ProfilePage com abas), read-only. Dados públicos via
// getPublicProfile (RPC 065). O caller já resolveu o userId e cuidou de auth +
// do redirect do próprio pro /me.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEquippedForUser } from "@/lib/queries/cosmetics";
import { ClientShell } from "@/components/client-shell/shell";
import { ProfilePage } from "@/components/profile/profile-page";
import { getImmortalRank } from "@/lib/queries/immortal-leaderboard";
import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
import { getPublicProfile } from "@/lib/queries/profile";
import { getCareerStats } from "@/lib/queries/career";
import { getFormulaDotaProfileStats } from "@/lib/queries/formuladota-stats";
import { syncPlayerStats } from "@/app/perfil/actions";
import { computeRankBadges } from "@/lib/dota/rank-badges";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import { xpProgress } from "@/lib/levels";
import type { ProfileFriendState } from "@/components/profile/profile-friend-button";

export async function ProfileView({
  viewerId,
  userId,
  rawTab,
  /** Rota usada no shell (pra realce de navegação). */
  currentRoute,
}: {
  viewerId: string;
  userId: string;
  rawTab?: string;
  currentRoute: string;
}) {
  const supabase = await createClient();

  const profile = await getPublicProfile(userId);
  if (!profile) notFound();

  const activeTab: ProfileTab =
    rawTab && (VALID_TABS as string[]).includes(rawTab)
      ? (rawTab as ProfileTab)
      : "perfil";

  // amizade + carreira + nível + stats + fundo em PARALELO (só dependem dos ids).
  const [friendship, career, levelRow, ext, fdotaStats, equippedForBg] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("id, status, requester_id")
        .or(
          `and(requester_id.eq.${viewerId},addressee_id.eq.${userId}),` +
            `and(requester_id.eq.${userId},addressee_id.eq.${viewerId})`
        )
        .maybeSingle(),
      getCareerStats(userId),
      supabase
        .from("user_levels")
        .select("total_xp_earned")
        .eq("user_id", userId)
        .maybeSingle(),
      syncPlayerStats({ userId }),
      getFormulaDotaProfileStats(userId),
      getEquippedForUser(supabase, profile.userId),
    ]);

  let friendState: ProfileFriendState = "none";
  let friendshipId: string | null = null;
  if (friendship.data) {
    friendshipId = friendship.data.id;
    if (friendship.data.status === "accepted") friendState = "friends";
    else if (friendship.data.status === "pending")
      friendState =
        friendship.data.requester_id === viewerId ? "pending_out" : "pending_in";
  }

  // Medalhas via FONTE ÚNICA (computeRankBadges) — igual ao /me, mini-perfil e hover.
  const { level, pct: xpPct } = xpProgress(levelRow.data?.total_xp_earned ?? 0);
  const badges = computeRankBadges({
    careerRankTier: career?.rankTier ?? null,
    careerLeaderboardRank: career?.leaderboardRank ?? null,
    seasonMmr: profile.mmr,
    level,
  });
  const dotaRank = badges.skillRank;
  const honorRank: HonorRank = badges.honorRank;

  const extData = ext.success ? ext.data : null;
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
  const centerHero = equippedForBg.profileTheme ?? undefined;

  const immortalRank = await getImmortalRank(userId);

  return (
    <ClientShell currentRoute={currentRoute} immersive centerHero={centerHero}>
      <ProfilePage
        profile={profile}
        activeTab={activeTab}
        dotaRank={dotaRank}
        honorRank={honorRank}
        level={level}
        xpPct={xpPct}
        editing={false}
        career={career}
        coachingReviews={[]}
        isOwn={false}
        ownerUserId={userId}
        general={general}
        fdota={fdotaStats}
        friendState={friendState}
        friendshipId={friendshipId}
        immortalRank={immortalRank}
      />
    </ClientShell>
  );
}
