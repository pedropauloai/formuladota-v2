// /torneios — lista de torneios FORMULADOTA. Filtros por status (open/in_progress/completed).
// Phase 7.5 V1. Server Component.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, Users, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { languageAlternates } from "@/lib/seo";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("torneios");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: languageAlternates("/torneios"),
  };
}

// Status → variant Badge V2.5 (semântico). Label resolvido por chave i18n no render.
const STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  open: "success",
  in_progress: "warning",
  completed: "secondary",
  draft: "outline",
  cancelled: "error",
};

export default async function TorneiosPage() {
  const t = await getTranslations("torneios");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Leitura pública: visitante navega os torneios; inscrever/gerenciar pede login.

  // Esconde drafts pra users non-admin (e pra visitante).
  const { data: profile } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.is_admin ?? false;

  const statusFilter = isAdmin
    ? ["draft", "open", "in_progress", "completed", "cancelled"]
    : ["open", "in_progress", "completed"];

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(
      "id, slug, name, description, format, status, max_teams, prize_pool, prize_pool_currency, registration_ends_at, starts_at, banner_url"
    )
    .in("status", statusFilter)
    .order("starts_at", { ascending: false, nullsFirst: false });

  // Counts de teams registrados por torneio
  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  const { data: teamRegistrations } =
    tournamentIds.length > 0
      ? await supabase
          .from("tournament_teams")
          .select("tournament_id")
          .in("tournament_id", tournamentIds)
      : { data: [] };

  const teamCountByTournament = new Map<string, number>();
  for (const r of teamRegistrations ?? []) {
    teamCountByTournament.set(
      r.tournament_id,
      (teamCountByTournament.get(r.tournament_id) ?? 0) + 1
    );
  }

  return (
    <ClientShell currentRoute="/torneios">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12">
        {/* Header padronizado V2.5: eyebrow + h1 + descrição */}
        <header className="mb-8 2xl:mb-10">
          <p className="font-display text-sm 2xl:text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-text-display">
            {t("pageTitle")}
          </h1>
          <p className="mt-3 font-display text-sm font-semibold text-text-body max-w-2xl 2xl:text-base">
            {t("pageSubtitle")}
          </p>
          {isAdmin && (
            <Link
              href="/admin/torneios"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-brand-primary bg-brand-primary/15 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-primary transition-colors"
            >
              {t("manageAdmin")}
            </Link>
          )}
        </header>

        {!tournaments || tournaments.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            icon={<Trophy />}
            principle="random"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const statusVariant = STATUS_VARIANT[tournament.status] ?? "outline";
              const statusLabel = STATUS_VARIANT[tournament.status]
                ? t(`status.${tournament.status}`)
                : tournament.status;
              const formatLabel = ["single_elim", "double_elim", "round_robin", "swiss"].includes(
                tournament.format
              )
                ? t(`format.${tournament.format}`)
                : tournament.format;
              const teamCount = teamCountByTournament.get(tournament.id) ?? 0;
              return (
                <Link
                  key={tournament.id}
                  href={`/torneios/${tournament.slug}`}
                  className="group block"
                >
                  <Card variant="interactive" className="p-0 overflow-hidden h-full">
                    {tournament.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tournament.banner_url}
                        alt=""
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-brand-primary/20 to-bg-deep flex items-center justify-center">
                        <Trophy
                          size={36}
                          className="text-brand-primary/60"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-base 2xl:text-lg uppercase tracking-wide text-text-display group-hover:text-brand-primary transition-colors">
                          {tournament.name}
                        </h3>
                        <Badge variant={statusVariant} className="shrink-0">
                          {statusLabel}
                        </Badge>
                      </div>
                      {tournament.description && (
                        <p className="font-body text-sm text-text-muted line-clamp-2 2xl:text-base">
                          {tournament.description}
                        </p>
                      )}
                      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                        <Stat
                          icon={Award}
                          label={t("statFormat")}
                          value={formatLabel}
                        />
                        <Stat
                          icon={Users}
                          label={t("statTeams")}
                          value={`${teamCount}/${tournament.max_teams}`}
                        />
                        {Number(tournament.prize_pool ?? 0) > 0 && (
                          <Stat
                            icon={Trophy}
                            label={t("statPrize")}
                            value={`R$ ${Number(tournament.prize_pool).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`}
                          />
                        )}
                        {tournament.starts_at && (
                          <Stat
                            icon={Calendar}
                            label={t("statStart")}
                            value={new Date(tournament.starts_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ClientShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm 2xl:text-base">
      <Icon
        size={11}
        className="shrink-0 text-text-faded 2xl:size-3.5"
        aria-hidden="true"
      />
      <span className="font-display font-semibold uppercase tracking-wide text-text-faded">
        {label}:
      </span>
      <span className="font-body text-text-body">{value}</span>
    </div>
  );
}
