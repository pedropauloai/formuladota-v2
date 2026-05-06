// /times/[slug] — detalhe do time. V1 minimal: header + members list + ações.
// Captain ganha controles extras (kick/delete). Members ganham botão sair.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
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
  if (!user) redirect("/login");

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
          className="inline-flex items-center gap-2 mb-6 font-sans text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar pra times
        </Link>

        <header className="mb-8 flex items-start gap-5">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt=""
              className="size-20 rounded-md border-2 border-[var(--color-brand-red)]/60"
            />
          ) : (
            <div className="size-20 rounded-md border-2 border-[var(--color-brand-red)]/60 bg-[var(--color-brand-red)]/15 flex items-center justify-center">
              <span className="font-display text-2xl text-[var(--color-brand-red)]">
                {team.tag}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs 2xl:text-sm uppercase tracking-widest text-[var(--color-brand-red)]">
              [{team.tag}]
            </p>
            <h1 className="mt-1 font-display text-3xl 2xl:text-4xl uppercase tracking-tight text-white">
              {team.name}
            </h1>
            {team.description && (
              <p className="mt-2 font-sans text-sm 2xl:text-base text-white/60 max-w-2xl">
                {team.description}
              </p>
            )}
          </div>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Roster <span className="text-white/40">({enrichedMembers.length}/7)</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {enrichedMembers.map((m) => (
              <div
                key={m.user_id}
                className="rounded-md border border-[var(--color-border)] bg-black/40 p-4 flex items-center gap-3"
              >
                {m.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.profile.avatar_url}
                    alt=""
                    className="size-10 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="size-10 rounded-full border border-white/10 bg-black/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-white truncate flex items-center gap-1.5">
                    {m.profile?.username ?? "Anônimo"}
                    {m.role === "captain" && (
                      <Crown size={12} className="text-amber-400" />
                    )}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

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
