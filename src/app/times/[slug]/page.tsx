// /times/[slug] — detalhe do time. V1 minimal: header + members list + ações.
// Captain ganha controles extras (kick/delete). Members ganham botão sair.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { TeamDetailActions } from "./team-detail-actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: `Time ${slug} — FORMULADOTA` };
}

export default async function TeamDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: team } = await supabase
    .from("teams")
    .select("id, slug, name, tag, captain_id, logo_url, description, created_at")
    .eq("slug", slug)
    .single();

  if (!team) notFound();

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, joined_at")
    .eq("team_id", team.id)
    .order("joined_at");

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", memberIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const enrichedMembers = (members ?? []).map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
  }));

  const isCaptain = team.captain_id === user.id;
  const isMember = enrichedMembers.some((m) => m.user_id === user.id);

  return (
    <ClientShell currentRoute="/times">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12">
        <Link
          href="/times"
          className="inline-flex items-center gap-2 mb-6 font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar pra times
        </Link>

        {/* Header do time — nome em destaque V2.5 */}
        <header className="mb-8 flex items-start gap-5">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt=""
              className="size-20 rounded-md border-2 border-brand-primary/60"
            />
          ) : (
            <div className="size-20 rounded-md border-2 border-brand-primary/60 bg-brand-primary/15 flex items-center justify-center">
              <span className="font-display text-2xl text-brand-primary">
                {team.tag}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm 2xl:text-sm uppercase tracking-wide text-brand-primary">
              [{team.tag}]
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-wide text-text-display 2xl:text-5xl">
              {team.name}
            </h1>
            {team.description && (
              <p className="mt-2 font-body text-sm 2xl:text-base text-text-muted max-w-2xl">
                {team.description}
              </p>
            )}
          </div>
        </header>

        {/* Roster — Card com lista de members */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em]">
              <Users size={14} className="text-text-muted" aria-hidden="true" />
              Roster
              <span className="font-mono text-sm text-text-faded normal-case tracking-normal">
                ({enrichedMembers.length}/7)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {enrichedMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="rounded-md border border-border-subtle bg-bg-base p-4 flex items-center gap-3"
                >
                  <UserAvatar
                    src={m.profile?.avatar_url ?? undefined}
                    alt={m.profile?.username ?? "Anônimo"}
                    fallback={(m.profile?.username ?? "??").slice(0, 2)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm text-text-display truncate flex items-center gap-1.5">
                      {m.profile?.username ?? "Anônimo"}
                      {m.role === "captain" && (
                        <Crown
                          size={12}
                          className="text-warning"
                          aria-label="Capitão"
                        />
                      )}
                    </p>
                    <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
                      {m.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <TeamDetailActions
          teamId={team.id}
          teamName={team.name}
          isCaptain={isCaptain}
          isMember={isMember}
          members={enrichedMembers}
          currentUserId={user.id}
        />
      </div>
    </ClientShell>
  );
}
