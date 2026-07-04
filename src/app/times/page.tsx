// /times — lista times do user + convites pendentes + botão criar.
// Phase 7.5. Server Component fetch + Client Component criar/aceitar.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { languageAlternates } from "@/lib/seo";
import { ClientShell } from "@/components/client-shell/shell";
import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "@/app/login/actions";
import { TimesContent } from "./times-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("times");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: languageAlternates("/times"),
  };
}

export default async function TimesPage() {
  const t = await getTranslations("times");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Leitura pública: visitante vê o que é a área de Times + CTA. Criar/gerenciar
  // é pessoal e pede login.
  if (!user) {
    return (
      <ClientShell currentRoute="/times">
        <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12">
          <header className="mb-8 2xl:mb-10">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-text-display 2xl:text-5xl">
              {t("heading")}
            </h1>
            <p className="mt-3 max-w-2xl font-display text-sm 2xl:text-base font-semibold text-text-body">
              {t("guestSubtitle")}
            </p>
          </header>
          <form action={signInWithDiscord}>
            <Button type="submit" variant="cinematic" size="lg">
              <Swords size={20} aria-hidden="true" />
              {t("signInWithDiscord")}
            </Button>
          </form>
        </div>
      </ClientShell>
    );
  }

  // Times do user
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", user.id);

  const teamIds = (memberships ?? []).map((m) => m.team_id);
  const { data: teams } = teamIds.length > 0
    ? await supabase
        .from("teams")
        .select("id, slug, name, tag, captain_id, logo_url, description")
        .in("id", teamIds)
    : { data: [] };

  // Counts de membros por time
  const { data: memberCounts } = teamIds.length > 0
    ? await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds)
    : { data: [] };

  const countByTeam = new Map<string, number>();
  for (const m of memberCounts ?? []) {
    countByTeam.set(m.team_id, (countByTeam.get(m.team_id) ?? 0) + 1);
  }

  const userTeams = (teams ?? []).map((t) => {
    const membership = (memberships ?? []).find((m) => m.team_id === t.id);
    return {
      ...t,
      role: membership?.role ?? "player",
      memberCount: countByTeam.get(t.id) ?? 0,
      isCaptain: t.captain_id === user.id,
    };
  });

  // Convites pending
  const { data: pendingInvites } = await supabase
    .from("team_invites")
    .select("id, team_id, message, created_at, expires_at, invited_by")
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  const inviteTeamIds = (pendingInvites ?? []).map((i) => i.team_id);
  const { data: inviteTeams } = inviteTeamIds.length > 0
    ? await supabase
        .from("teams")
        .select("id, slug, name, tag, captain_id")
        .in("id", inviteTeamIds)
    : { data: [] };

  const inviteTeamMap = new Map((inviteTeams ?? []).map((t) => [t.id, t]));
  const invites = (pendingInvites ?? []).map((i) => ({
    ...i,
    team: inviteTeamMap.get(i.team_id) ?? null,
  }));

  return (
    <ClientShell currentRoute="/times">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12">
        {/* Header padronizado V2.5: eyebrow + h1 + descrição */}
        <header className="mb-8 2xl:mb-10">
          <p className="font-display text-sm 2xl:text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-text-display">
            {t("heading")}
          </h1>
          <p className="mt-3 font-display text-sm 2xl:text-base font-semibold text-text-body max-w-2xl">
            {t("memberSubtitle")}
          </p>
        </header>

        <TimesContent userTeams={userTeams} invites={invites} />
      </div>
    </ClientShell>
  );
}
