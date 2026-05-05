// Perfil público /perfil/[steamid64] — Phase 7 H5.4.
// Server Component cyberpunk. Stats agregados + identidades vinculadas + histórico.
// V1: stats locais (player_season_mmr). V2: integrar Stratz GraphQL pra heroes/builds.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TierBadge } from "@/components/dota/tier-badge";
import { ClientShell } from "@/components/client-shell/shell";

interface PageProps {
  params: Promise<{ steamid: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Perfil ${params.steamid} — FORMULADOTA`,
  };
}

export default async function PerfilPublicoPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();

  // Busca user via steam_id_64
  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("user_id, persona, avatar_url, verified_at")
    .eq("steam_id_64", params.steamid)
    .single();

  if (!steamLink) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role")
    .eq("id", steamLink.user_id)
    .single();

  // Season ativa + MMR
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("active", true)
    .limit(1)
    .single();

  let mmrRow: { mmr: number; vitorias: number; derrotas: number; partidas_total: number; last_match_at: string | null } | null = null;
  if (season) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total, last_match_at")
      .eq("user_id", steamLink.user_id)
      .eq("season_id", season.id)
      .single();
    mmrRow = data;
  }

  const winRate = mmrRow && mmrRow.partidas_total > 0
    ? Math.round((mmrRow.vitorias / mmrRow.partidas_total) * 100)
    : null;

  return (
    <ClientShell currentRoute="/perfil">
      <section className="relative h-[40vh] overflow-hidden border-b border-[var(--color-border)] bg-black/60">
        <div className="relative z-10 mx-auto flex max-w-5xl items-end gap-6 px-6 pb-8 pt-12 h-full">
          {(steamLink.avatar_url ?? profile?.avatar_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={steamLink.avatar_url ?? profile?.avatar_url ?? ""}
              alt=""
              className="size-24 rounded-md border-2 border-[var(--color-brand-red)]"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Perfil público
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-tight text-white truncate">
              {steamLink.persona ?? profile?.username ?? "Anônimo"}
            </h1>
            {mmrRow && <TierBadge mmr={mmrRow.mmr} size="lg" showName />}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-10">
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao ranking
        </Link>

        {/* Stats grid */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="MMR atual" value={mmrRow?.mmr ?? "—"} />
          <StatCard label="Vitórias" value={mmrRow?.vitorias ?? 0} />
          <StatCard label="Derrotas" value={mmrRow?.derrotas ?? 0} />
          <StatCard
            label="Win rate"
            value={winRate !== null ? `${winRate}%` : "—"}
          />
        </section>

        {/* Identidades vinculadas */}
        <section>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Identidades vinculadas
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-md border border-[var(--color-brand-red)]/40 bg-[var(--color-card)] px-4 py-2 font-mono text-xs">
              Steam: {params.steamid}
            </span>
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 font-mono text-xs text-[var(--color-muted-foreground)]">
              Discord: {profile?.username ?? "—"}
            </span>
          </div>
        </section>

        {/* Histórico (V2 expandido com Stratz) */}
        <section>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Histórico de temporadas
          </h2>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            {mmrRow ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-sm uppercase text-[var(--color-foreground)]">
                    {season?.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--color-muted-foreground)]">
                    {mmrRow.partidas_total} partidas
                    {mmrRow.last_match_at ? ` · Última partida: ${new Date(mmrRow.last_match_at).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <Trophy size={20} className="text-[var(--color-brand-red)]" aria-hidden="true" />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">Sem partidas oficiais nesta temporada.</p>
            )}
          </div>
        </section>
      </div>
    </ClientShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
      <p className="font-sans text-xs uppercase tracking-widest text-[var(--color-text-faded)]">{label}</p>
      <p className="font-display text-3xl text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}
