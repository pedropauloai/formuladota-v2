// /torneios — lista de torneios FORMULADOTA. Filtros por status (open/in_progress/completed).
// Phase 7.5 V1. Server Component.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Calendar, Users, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";

export const metadata: Metadata = {
  title: "Torneios — FORMULADOTA",
  description: "Torneios competitivos da comunidade FORMULADOTA.",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: {
    label: "Inscrições abertas",
    cls: "border-emerald-400/40 text-emerald-400",
  },
  in_progress: {
    label: "Em andamento",
    cls: "border-amber-400/40 text-amber-400",
  },
  completed: {
    label: "Encerrado",
    cls: "border-white/20 text-white/50",
  },
  draft: {
    label: "Rascunho",
    cls: "border-white/10 text-white/30",
  },
  cancelled: {
    label: "Cancelado",
    cls: "border-rose-400/40 text-rose-400",
  },
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
        <header className="mb-8 2xl:mb-10">
          <p className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            FORMULADOTA · Competitivo
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-white">
            Torneios
          </h1>
          <div className="mt-4 brand-divider" />
        </header>

        {!tournaments || tournaments.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-black/30 p-12 text-center">
            <Trophy size={28} className="mx-auto mb-3 text-white/30" />
            <p className="font-display text-base 2xl:text-lg uppercase tracking-wide text-white/60">
              Nenhum torneio ativo
            </p>
            <p className="mt-2 font-sans text-xs 2xl:text-sm text-white/40">
              Acompanhe o Discord pra anúncios de novos torneios.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((t) => {
              const status = STATUS_LABEL[t.status] ?? {
                label: t.status,
                cls: "border-white/10 text-white/30",
              };
              const teamCount = teamCountByTournament.get(t.id) ?? 0;
              return (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="group rounded-md border border-[var(--color-border)] bg-gradient-to-b from-black/60 to-black/40 overflow-hidden hover:border-[var(--color-brand-red)]/60 transition-colors"
                >
                  {t.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.banner_url}
                      alt=""
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-[var(--color-brand-red)]/20 to-black flex items-center justify-center">
                      <Trophy size={36} className="text-[var(--color-brand-red)]/60" />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base 2xl:text-lg uppercase tracking-wide text-white group-hover:text-[var(--color-brand-red)] transition-colors">
                        {t.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    {t.description && (
                      <p className="font-sans text-xs 2xl:text-sm text-white/60 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
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
                  </div>
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
    <div className="flex items-center gap-2 text-[11px] 2xl:text-xs">
      <Icon size={11} className="text-white/40 shrink-0" aria-hidden="true" />
      <span className="font-mono uppercase tracking-widest text-white/40">
        {label}:
      </span>
      <span className="font-sans text-white/80">{value}</span>
    </div>
  );
}
