// /perfil/u/[userId] — perfil PÚBLICO de qualquer membro, na MESMA estrutura do
// /me (ProfilePage com abas). Navegação coerente estilo client Dota 2: o perfil
// que vejo dos outros é igual ao meu, read-only. Dados públicos via getPublicProfile
// (RPC 065). O próprio user é redirecionado pro /me canônico.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { userId } = await props.params;
  const profile = await getPublicProfile(userId);
  return { title: profile?.username ?? "Perfil — FORMULADOTA" };
}

export default async function PublicProfilePage(props: PageProps) {
  const { userId } = await props.params;
  const { tab: rawTab } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/"); // perfis são públicos PRA MEMBROS (logados)
  if (user.id === userId) redirect("/me"); // o próprio → /me canônico

  const profile = await getPublicProfile(userId);
  if (!profile) notFound();

  const activeTab: ProfileTab =
    rawTab && (VALID_TABS as string[]).includes(rawTab)
      ? (rawTab as ProfileTab)
      : "perfil";

  // PERFORMANCE (auditoria): amizade + carreira + nível + stats + fundo em PARALELO
  // (antes eram ~6 awaits em série). Todos só dependem de user.id/userId.
  const [friendship, career, levelRow, ext, fdotaStats, equippedForBg] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("id, status, requester_id")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),` +
            `and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
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

  // Estado de amizade com o viewer → botão no header (adicionar/aceitar/remover).
  let friendState: ProfileFriendState = "none";
  let friendshipId: string | null = null;
  if (friendship.data) {
    friendshipId = friendship.data.id;
    if (friendship.data.status === "accepted") friendState = "friends";
    else if (friendship.data.status === "pending")
      friendState =
        friendship.data.requester_id === user.id ? "pending_out" : "pending_in";
    // blocked → "none" (esconde o botão de ação)
  }

  // Medalhas via FONTE ÚNICA (computeRankBadges) — igual ao /me, mini-perfil e hover.
  const { level } = xpProgress(levelRow.data?.total_xp_earned ?? 0);
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
  // Fundo = tema equipado (slot profile_theme); default limpo (sem herói automático).
  const centerHero = equippedForBg.profileTheme ?? undefined;

  // Posição no leaderboard de Imortais (#N + elite → medalha vermelha).
  const immortalRank = await getImmortalRank(userId);

  return (
    <ClientShell currentRoute={`/perfil/u/${userId}`} immersive centerHero={centerHero}>
      <ProfilePage
        profile={profile}
        activeTab={activeTab}
        dotaRank={dotaRank}
        honorRank={honorRank}
        editing={false}
        career={career}
        coachingReviews={[]} // coaching é privado do aluno — não exposto no público
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
