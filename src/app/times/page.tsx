// /times — lista times do user + convites pendentes + botão criar.
// Phase 7.5. Server Component fetch + Client Component criar/aceitar.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { TimesContent } from "./times-content";

export const metadata: Metadata = {
  title: "Times — FORMULADOTA",
  description: "Seus times competitivos e convites pendentes.",
};

export default async function TimesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
          <p className="font-display text-xs 2xl:text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            FORMULADOTA · Competitivo
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-text-display">
            Times
          </h1>
          <p className="mt-3 font-body text-sm text-text-muted max-w-2xl">
            Seus times competitivos, convites pendentes e ações de capitão.
          </p>
        </header>

        <TimesContent userTeams={userTeams} invites={invites} />
      </div>
    </ClientShell>
  );
}
