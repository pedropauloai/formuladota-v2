// /torneios — lista de torneios FORMULADOTA. Filtros por status (open/in_progress/completed).
// Phase 7.5 V1. Server Component.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Calendar, Users, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Torneios — FORMULADOTA",
  description: "Torneios competitivos da comunidade FORMULADOTA.",
};

// Status → label + variant Badge V2.5 (semântico)
const STATUS_LABEL: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  open: { label: "Inscrições abertas", variant: "success" },
  in_progress: { label: "Em andamento", variant: "warning" },
  completed: { label: "Encerrado", variant: "secondary" },
  draft: { label: "Rascunho", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "error" },
};

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Eliminação simples",
  double_elim: "Eliminação dupla",
  round_robin: "Todos contra todos",
  swiss: "Sistema suíço",
};

export default async function TorneiosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Esconde drafts pra users non-admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
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
            FORMULADOTA · Competitivo
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-text-display">
            Torneios
          </h1>
          <p className="mt-3 font-display text-sm font-semibold text-text-body max-w-2xl">
            Torneios oficiais com inscrição por times, brackets e premiação.
          </p>
        </header>

        {!tournaments || tournaments.length === 0 ? (
          <EmptyState
            title="Nenhum torneio ativo"
            description="Acompanhe o Discord pra anúncios de novos torneios."
            icon={<Trophy />}
            principle="random"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((t) => {
              const status = STATUS_LABEL[t.status] ?? {
                label: t.status,
                variant: "outline" as const,
              };
              const teamCount = teamCountByTournament.get(t.id) ?? 0;
              return (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="group block"
                >
                  <Card variant="interactive" className="p-0 overflow-hidden h-full">
                    {t.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.banner_url}
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
                          {t.name}
                        </h3>
                        <Badge variant={status.variant} className="shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="font-body text-sm 2xl:text-sm text-text-muted line-clamp-2">
                          {t.description}
                        </p>
                      )}
                      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                        <Stat
                          icon={Award}
                          label="Formato"
                          value={FORMAT_LABEL[t.format] ?? t.format}
                        />
                        <Stat
                          icon={Users}
                          label="Times"
                          value={`${teamCount}/${t.max_teams}`}
                        />
                        {Number(t.prize_pool ?? 0) > 0 && (
                          <Stat
                            icon={Trophy}
                            label="Premiação"
                            value={`R$ ${Number(t.prize_pool).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`}
                          />
                        )}
                        {t.starts_at && (
                          <Stat
                            icon={Calendar}
                            label="Início"
                            value={new Date(t.starts_at).toLocaleDateString("pt-BR", {
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
    <div className="flex items-center gap-2 text-sm 2xl:text-sm">
      <Icon
        size={11}
        className="text-text-faded shrink-0"
        aria-hidden="true"
      />
      <span className="font-display font-semibold uppercase tracking-wide text-text-faded">
        {label}:
      </span>
      <span className="font-body text-text-body">{value}</span>
    </div>
  );
}
