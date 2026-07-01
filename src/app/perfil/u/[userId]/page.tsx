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
import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
import { getPublicProfile } from "@/lib/queries/profile";
import { getCareerStats } from "@/lib/queries/career";
import { getFormulaDotaProfileStats } from "@/lib/queries/formuladota-stats";
import { syncPlayerStats } from "@/app/perfil/actions";
import { rankTierToDotaRank } from "@/components/profile/career-stats";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import { getGatedTierForLevel, xpProgress, mmrFromRankTier } from "@/lib/levels";
import type { ProfileFriendState } from "@/components/profile/profile-friend-button";

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

  // Estado de amizade com o viewer → botão no header (adicionar/aceitar/remover).
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),` +
        `and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();
  let friendState: ProfileFriendState = "none";
  let friendshipId: string | null = null;
  if (friendship) {
    friendshipId = friendship.id;
    if (friendship.status === "accepted") friendState = "friends";
    else if (friendship.status === "pending")
      friendState = friendship.requester_id === user.id ? "pending_out" : "pending_in";
    // blocked → "none" (esconde o botão de ação)
  }

  const career = await getCareerStats(userId);

  // HONOR = NÍVEL (canônico), gate pela skill Valve real — igual ao /me e mini-perfil.
  const { data: levelRow } = await supabase
    .from("user_levels")
    .select("total_xp_earned")
    .eq("user_id", userId)
    .maybeSingle();
  const { level } = xpProgress(levelRow?.total_xp_earned ?? 0);
  const honorRank: HonorRank = getGatedTierForLevel(
    level,
    mmrFromRankTier(career?.rankTier ?? null)
  );

  // Medalha SKILL = rank Valve real (career.rankTier) → fallback MMR da liga.
  const dotaRank =
    rankTierToDotaRank(career?.rankTier ?? null, career?.leaderboardRank ?? null) ??
    mmrToDotaRank(profile.mmr);

  // Carreira STRATZ + partidas FormulaDota → os 2 hexágonos (igual ao /me).
  const ext = await syncPlayerStats({ userId });
  const extData = ext.success ? ext.data : null;
  const fdotaStats = await getFormulaDotaProfileStats(userId);
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
  const equippedForBg = await getEquippedForUser(supabase, profile.userId);
  const centerHero = equippedForBg.profileTheme ?? undefined;

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
      />
    </ClientShell>
  );
}
