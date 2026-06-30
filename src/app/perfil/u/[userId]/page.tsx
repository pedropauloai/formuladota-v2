// /perfil/u/[userId] — perfil PÚBLICO de qualquer membro, na MESMA estrutura do
// /me (ProfilePage com abas). Navegação coerente estilo client Dota 2: o perfil
// que vejo dos outros é igual ao meu, read-only. Dados públicos via getPublicProfile
// (RPC 065). O próprio user é redirecionado pro /me canônico.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { ProfilePage } from "@/components/profile/profile-page";
import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
import { getPublicProfile } from "@/lib/queries/profile";
import { getCareerStats } from "@/lib/queries/career";
import { syncPlayerStats } from "@/app/perfil/actions";
import { rankTierToDotaRank } from "@/components/profile/career-stats";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import { legacyHonorToBand, type HonorRank } from "@/components/ui/honor-rank-medal";

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

function toHonorRank(tierStr: string | null | undefined): HonorRank {
  return legacyHonorToBand(tierStr ?? "aprendiz");
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

  // HONOR + carreira — mesmos RPCs/queries do /me, com o userId do alvo.
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: userId,
  });
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });
  const honorRank = toHonorRank(honorTierStr);

  const career = await getCareerStats(userId);

  // Medalha SKILL = rank Valve real (career.rankTier) → fallback MMR da liga.
  const dotaRank =
    rankTierToDotaRank(career?.rankTier ?? null, career?.leaderboardRank ?? null) ??
    mmrToDotaRank(profile.mmr);

  // Stats externos (KDA/GPM/XPM — cache 24h; após o backfill admin lê do cache).
  const ext = await syncPlayerStats({ userId });
  const externalStats = ext.success
    ? {
        source: ext.data.source,
        avgKDA: ext.data.avgKDA,
        avgGPM: ext.data.avgGPM,
        avgXPM: ext.data.avgXPM,
      }
    : null;
  const centerHero = profile.heroPortraitData?.portrait_url ?? undefined;

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
        externalStats={externalStats}
      />
    </ClientShell>
  );
}
