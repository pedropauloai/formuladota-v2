// /me — painel do player. Phase 8 H6.5.
// Status assinatura, ranking, identidades, histórico.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TierBadge } from "@/components/dota/tier-badge";
import { ClientShell } from "@/components/templates/client-shell";

export const metadata: Metadata = { title: "Meu painel — FORMULADOTA" };

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: subscription },
    { data: steamLink },
    { data: season },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, role, behavior_status, doctrine_accepted_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status, next_payment_date, cancelled_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", user.id)
      .single(),
    supabase.from("seasons").select("id, name").eq("active", true).limit(1).single(),
  ]);

  let mmrRow: { mmr: number; vitorias: number; derrotas: number; partidas_total: number } | null = null;
  if (season) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .single();
    mmrRow = data;
  }

  const subActive = subscription?.status === "authorized";

  return (
    <ClientShell>
      <div className="px-6 py-10 mx-auto max-w-4xl space-y-10">
        <header className="flex items-center gap-6">
          {(steamLink?.avatar_url ?? profile?.avatar_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={steamLink?.avatar_url ?? profile?.avatar_url ?? ""}
              alt=""
              className="size-20 rounded-md border-2 border-[var(--color-brand-red)]"
            />
          )}
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Meu painel
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
              {steamLink?.persona ?? profile?.username ?? "Você"}
            </h1>
            {mmrRow && <TierBadge mmr={mmrRow.mmr} size="md" showName />}
          </div>
        </header>

        {/* Status assinatura */}
        <section className="space-y-3">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Mensalidade
          </h2>
          <div
            className={`rounded-md border p-6 flex items-center justify-between ${
              subActive
                ? "border-[var(--color-success)]/40 bg-[var(--color-card)]"
                : "border-[var(--color-warning)]/40 bg-[var(--color-card)]"
            }`}
          >
            <div className="flex items-center gap-3">
              {subActive ? (
                <CheckCircle2 size={20} className="text-[var(--color-success)]" aria-hidden="true" />
              ) : (
                <AlertCircle size={20} className="text-[var(--color-warning)]" aria-hidden="true" />
              )}
              <div>
                <p className="font-display text-base uppercase tracking-wide text-[var(--color-foreground)]">
                  {subActive ? "Mensalidade ativa" : "Sem mensalidade ativa"}
                </p>
                {subscription?.next_payment_date && (
                  <p className="mt-1 font-mono text-xs text-[var(--color-muted-foreground)]">
                    Próxima cobrança: {new Date(subscription.next_payment_date).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/assinatura"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:border-[var(--color-brand-red)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Gerenciar
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Stats */}
        {mmrRow && (
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="MMR" value={mmrRow.mmr} />
            <StatCard label="Vitórias" value={mmrRow.vitorias} />
            <StatCard label="Derrotas" value={mmrRow.derrotas} />
            <StatCard label="Partidas" value={mmrRow.partidas_total} />
          </section>
        )}

        {/* Identidades */}
        <section className="space-y-3">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Identidades vinculadas
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <IdentityCard
              label="Discord"
              value={profile?.username ?? "—"}
              connected={!!profile?.username}
            />
            <IdentityCard
              label="Steam"
              value={steamLink?.steam_id_64 ?? "—"}
              connected={!!steamLink}
              href={!steamLink ? "/vincular/steam" : undefined}
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid gap-3 md:grid-cols-3">
          <ActionCard href="/criar-lobby" label="Criar lobby" />
          <ActionCard href="/lobbies" label="Lobbies abertos" />
          <ActionCard href="/ranking" label="Ranking" />
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

function IdentityCard({
  label,
  value,
  connected,
  href,
}: {
  label: string;
  value: string;
  connected: boolean;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-brand-red)]/40">
      <div>
        <p className="font-sans text-xs uppercase tracking-widest text-[var(--color-text-faded)]">{label}</p>
        <p className="mt-1 font-mono text-sm text-[var(--color-foreground)] truncate">{value}</p>
      </div>
      <span
        className={`size-2 rounded-full ${connected ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`}
        aria-label={connected ? "Conectado" : "Não conectado"}
      />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:border-[var(--color-brand-red)]"
    >
      {label}
    </Link>
  );
}
