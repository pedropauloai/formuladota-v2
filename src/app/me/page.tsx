// /me — Painel do player Phase 9 (Perfil Dota 2 + Social).
// ClientShell modo IMMERSIVE com centerHero=hero portrait do user (D-09).
// Sidebar esquerda continua visível como overlay (D-01 a D-07).
//
// BLOCKER #3 fix: hero portrait fullscreen NÃO é renderizado aqui.
// É delegado ao ClientShell via centerHero prop — background fixo atrás das sidebars.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { ProfilePage } from "@/components/profile/profile-page";
import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
import { getProfileForMe } from "@/lib/queries/profile";
import { getCareerStats } from "@/lib/queries/career";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import { legacyHonorToBand, type HonorRank } from "@/components/ui/honor-rank-medal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meu perfil — FORMULADOTA" };

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

// Helper — converte string do RPC get_honor_tier para HonorRank tipado
function toHonorRank(tierStr: string | null | undefined): HonorRank {
  // RPC get_honor_tier ainda retorna o modelo antigo (8 tiers) — mapeia pras 6 bandas.
  return legacyHonorToBand(tierStr ?? "aprendiz");
}

// Next.js 15+: searchParams é uma Promise que precisa de await (pitfall 5)
interface PageProps {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}

export default async function MePage({ searchParams }: PageProps) {
  // getProfileForMe já checa autenticação e retorna null se não logado
  const profile = await getProfileForMe();
  if (!profile) redirect("/");

  // Resolve tab ativa: default "perfil", fallback pra qualquer tab inválida
  const { tab: rawTab, edit } = await searchParams;
  const activeTab: ProfileTab =
    rawTab && (VALID_TABS as readonly string[]).includes(rawTab)
      ? (rawTab as ProfileTab)
      : "perfil";
  // Edit mode via searchParams — ?edit=1 ativa edição inline
  const editing = edit === "1";

  const dotaRank = mmrToDotaRank(profile.mmr);

  // Carreira OpenDota (cache 24h, nunca lança) — bloco "Carreira" + backdrop
  // do herói nº 1 no header de identidade. null = sem Steam/sem dados.
  const career = await getCareerStats(profile.userId);

  // HONOR tier via RPC — graceful fallback se RPC indisponível
  const supabase = await createClient();
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: profile.userId,
  });
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });
  const honorRank = toHonorRank(honorTierStr);

  // BLOCKER #3 fix: ClientShell immersive + centerHero gerencia o hero portrait
  // fullscreen background. Quando profile.heroPortraitData é null (sem herói escolhido),
  // undefined → ClientShell cai pro background atmospheric padrão.
  const centerHero = profile.heroPortraitData?.portrait_url ?? undefined;

  return (
    <ClientShell currentRoute="/me" immersive centerHero={centerHero}>
      <ProfilePage
        profile={profile}
        activeTab={activeTab}
        dotaRank={dotaRank}
        honorRank={honorRank}
        editing={editing}
        career={career}
      />
    </ClientShell>
  );
}
