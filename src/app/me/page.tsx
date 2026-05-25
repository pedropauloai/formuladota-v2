// /me — painel do player. Phase 8 H6.5.
// Status assinatura, ranking, identidades, histórico.
//
// Refatorado para Design System V2.5 (Wave 8 — 2026-05-24):
//   - <UserAvatar> + <DotaRankMedal> + <HonorRankMedal> no header
//   - <Card> + <CardHeader>/<CardTitle>/<CardContent> em vez de divs ad-hoc
//   - <Button> em vez de <Link> com classes manuais
//   - <PresenceDot> indicando conexão de identidades
//   - Tokens semânticos (text-text-display/body/muted/faded, bg-bg-base/elevated, border-border-*)

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DotaRankMedal,
  type DotaRank,
} from "@/components/ui/dota-rank-medal";
import {
  HonorRankMedal,
  type HonorRank,
} from "@/components/ui/honor-rank-medal";
import { PresenceDot } from "@/components/ui/presence-dot";

export const metadata: Metadata = { title: "Meu painel — FORMULADOTA" };

// Helper local — mapeia MMR Valve → DotaRank V2.5 (mesma escala do exemplar /coaches/[slug])
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

// Helper — converte string do RPC get_honor_tier para HonorRank tipado.
function toHonorRank(tierStr: string | null | undefined): HonorRank {
  const allowed: HonorRank[] = [
    "aprendiz",
    "disciplinado",
    "confiavel",
    "respeitado",
    "honrado",
    "mestre",
    "lendario",
    "imortal-da-formula",
  ];
  const found = allowed.find((t) => t === tierStr);
  return found ?? "aprendiz";
}

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

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

  // HONOR tier via RPC — graceful fallback se RPC indisponível
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: user.id,
  });
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });

  const subActive = subscription?.status === "authorized";
  const displayName = steamLink?.persona ?? profile?.username ?? "Você";
  const avatarSrc = steamLink?.avatar_url ?? profile?.avatar_url ?? undefined;
  const dotaRank = mmrToDotaRank(mmrRow?.mmr);
  const honorRank = toHonorRank(honorTierStr);
  // Sem mmrRow assumimos visitante (sem partidas) — DotaRankMedal exibe lock
  const calibrationStatus = mmrRow ? "ranqueado" : "visitante";

  return (
    <ClientShell currentRoute="/me">
      <div className="px-6 py-10 mx-auto max-w-4xl space-y-10">
        {/* ----------------------------------------------------------------
            Header — Identidade do player com avatar + medalhas SKILL e HONOR
            ---------------------------------------------------------------- */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <UserAvatar
            src={avatarSrc}
            alt={`Avatar de ${displayName}`}
            fallback={displayName.slice(0, 2).toUpperCase()}
            size="xl"
            ringColor={mmrRow ? "brand" : null}
          />

          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              Meu painel
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-text-display">
              {displayName}
            </h1>

            {/* Par canônico: SKILL + HONOR lado a lado */}
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <DotaRankMedal
                rank={dotaRank}
                size="md"
                showLabel
                glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
                calibrationStatus={calibrationStatus}
              />
              <HonorRankMedal
                rank={honorRank}
                size="md"
                showLabel
                calibrationStatus={mmrRow ? "ranqueado" : "visitante"}
              />
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------------
            Mensalidade
            ---------------------------------------------------------------- */}
        <section className="space-y-3">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
            Mensalidade
          </h2>
          <Card
            variant="flat"
            className={
              subActive
                ? "border-success/40"
                : "border-warning/40"
            }
          >
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {subActive ? (
                  <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
                ) : (
                  <AlertCircle size={20} className="text-warning" aria-hidden="true" />
                )}
                <div>
                  <p className="font-display text-base uppercase tracking-wide text-text-display">
                    {subActive ? "Mensalidade ativa" : "Sem mensalidade ativa"}
                  </p>
                  {subscription?.next_payment_date && (
                    <p className="mt-1 font-mono text-sm text-text-muted">
                      Próxima cobrança:{" "}
                      {new Date(subscription.next_payment_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
              <Link href="/assinatura">
                <Button variant="ghost" size="sm">
                  Gerenciar
                  <ArrowRight size={12} aria-hidden="true" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* ----------------------------------------------------------------
            Stats — KPIs da temporada
            ---------------------------------------------------------------- */}
        {mmrRow && (
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="MMR" value={mmrRow.mmr} />
            <StatCard label="Vitórias" value={mmrRow.vitorias} />
            <StatCard label="Derrotas" value={mmrRow.derrotas} />
            <StatCard label="Partidas" value={mmrRow.partidas_total} />
          </section>
        )}

        {/* ----------------------------------------------------------------
            Identidades vinculadas — Discord + Steam com PresenceDot
            ---------------------------------------------------------------- */}
        <section className="space-y-3">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
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

        {/* ----------------------------------------------------------------
            Quick actions — Atalhos do jogador
            ---------------------------------------------------------------- */}
        <section className="grid gap-3 md:grid-cols-3">
          <ActionCard href="/criar-lobby" label="Criar lobby" />
          <ActionCard href="/lobbies" label="Lobbies abertos" />
          <ActionCard href="/ranking" label="Ranking" />
        </section>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes locais — usam primitives V2.5 (Card)
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="flat">
      <CardHeader>
        <CardTitle className="font-sans text-sm uppercase tracking-widest text-text-faded font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl text-text-display">{value}</p>
      </CardContent>
    </Card>
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
  // PresenceDot: online quando conectado, offline quando não — feedback visual rico
  const inner = (
    <Card variant={href ? "interactive" : "flat"}>
      <CardContent className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-sans text-sm uppercase tracking-widest text-text-faded">
            {label}
          </p>
          <p className="mt-1 font-mono text-sm text-text-display truncate">
            {value}
          </p>
        </div>
        <PresenceDot status={connected ? "online" : "offline"} size="md" />
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionCard({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block">
      <Card variant="interactive">
        <CardContent className="text-center">
          <p className="font-sans text-sm font-semibold uppercase tracking-wide text-text-display">
            {label}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
