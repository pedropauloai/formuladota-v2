// /torneios/[slug] — detalhe do torneio. V1 minimal: header + teams registrados +
// bracket simples (lista de matches por round). Captain pode inscrever team.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Trophy, Calendar, Users, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TournamentRegisterButton } from "./register-button";
import { BracketView } from "./bracket-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: `Torneio ${slug} — FORMULADOTA` };
}

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

const ROUND_NAMES: Record<number, string> = {
  1: "Primeira fase",
  2: "Oitavas",
  3: "Quartas",
  4: "Semifinal",
  5: "Final",
};

function roundName(round: number, totalRounds: number): string {
  // Calcula nome relativo ao total — round final = "Final", penúltimo = "Semifinal"
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quartas";
  if (fromEnd === 3) return "Oitavas";
  return ROUND_NAMES[round] ?? `Round ${round}`;
}

export default async function TournamentDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Leitura pública: visitante VÊ o torneio e a chave; inscrever/reportar pedem login.

  const { data: me } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.is_admin ?? false;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "id, slug, name, description, format, status, max_teams, prize_pool, prize_pool_currency, registration_ends_at, starts_at, completed_at, banner_url, rules"
    )
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  // Teams registrados
  const { data: registeredTeamsRaw } = await supabase
    .from("tournament_teams")
    .select("team_id, registered_at, seed, eliminated_at")
    .eq("tournament_id", tournament.id);

  const registeredTeamIds = (registeredTeamsRaw ?? []).map((r) => r.team_id);
  const { data: teams } = registeredTeamIds.length > 0
    ? await supabase
        .from("teams")
        .select("id, slug, name, tag, logo_url, captain_id")
        .in("id", registeredTeamIds)
    : { data: [] };

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const registeredTeams = (registeredTeamsRaw ?? []).map((r) => ({
    ...r,
    team: teamMap.get(r.team_id) ?? null,
  }));

  // Matches (bracket)
  const { data: matches } = await supabase
    .from("tournament_matches_expanded")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("round")
    .order("bracket_position");

  const matchesByRound = new Map<number, typeof matches>();
  const totalRounds = Math.max(...(matches ?? []).map((m) => m.round ?? 0), 0);
  for (const m of matches ?? []) {
    if (m.round === null) continue;
    const arr = matchesByRound.get(m.round) ?? [];
    arr.push(m);
    matchesByRound.set(m.round, arr);
  }

  // User's teams onde é captain (pra inscrever no torneio) — só logado.
  const { data: userCaptainTeams } = user
    ? await supabase.from("teams").select("id, name, tag").eq("captain_id", user.id)
    : { data: [] };

  const captainTeamsAvailable = (userCaptainTeams ?? []).filter(
    (t) => !registeredTeamIds.includes(t.id)
  );

  const status = STATUS_LABEL[tournament.status] ?? {
    label: tournament.status,
    variant: "outline" as const,
  };
  const canRegister = tournament.status === "open" && captainTeamsAvailable.length > 0;

  return (
    <ClientShell currentRoute="/torneios">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12">
        <Link
          href="/torneios"
          className="inline-flex items-center gap-2 mb-6 font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar pra torneios
        </Link>

        {tournament.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.banner_url}
            alt=""
            className="w-full h-48 2xl:h-64 object-cover rounded-md mb-6"
          />
        )}

        {/* Header torneio — nome em destaque V2.5 */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-4xl uppercase tracking-wide text-text-display 2xl:text-5xl">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="mt-3 font-body text-sm 2xl:text-base text-text-muted max-w-3xl">
                  {tournament.description}
                </p>
              )}
            </div>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
        </header>

        {/* Stats */}
        <section className="grid gap-3 md:grid-cols-4 mb-8">
          <StatBlock icon={Award} label="Formato" value={FORMAT_LABEL[tournament.format] ?? tournament.format} />
          <StatBlock
            icon={Users}
            label="Times"
            value={`${registeredTeams.length}/${tournament.max_teams}`}
          />
          {Number(tournament.prize_pool ?? 0) > 0 && (
            <StatBlock
              icon={Trophy}
              label="Premiação"
              value={`R$ ${Number(tournament.prize_pool).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            />
          )}
          {tournament.starts_at && (
            <StatBlock
              icon={Calendar}
              label="Início"
              value={new Date(tournament.starts_at).toLocaleDateString("pt-BR")}
            />
          )}
        </section>

        {/* Inscrição */}
        {canRegister && (
          <TournamentRegisterButton
            tournamentId={tournament.id}
            availableTeams={captainTeamsAvailable}
          />
        )}

        {/* Chave + Times. Com chave gerada: ela é a ESTRELA (foco principal) e
            os times viram sidebar de referência. Sem chave (inscrições abertas):
            nada a priorizar acima, então os times ficam em destaque.
            Decisão Pedro 2026-06-18. */}
        {matches && matches.length > 0 ? (
          <div className="mt-10 flex flex-col gap-6 lg:flex-row">
            <section className="min-w-0 flex-1">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-body">
                Chave
              </h2>
              <BracketView
                isAdmin={isAdmin}
                rounds={Array.from(matchesByRound.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([round, roundMatches]) => ({
                    round,
                    name: roundName(round, totalRounds),
                    matches: roundMatches ?? [],
                  }))}
              />
            </section>
            <aside className="lg:w-64 lg:shrink-0">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-body">
                Times{" "}
                <span className="text-text-faded">({registeredTeams.length})</span>
              </h2>
              <div className="space-y-2">
                {registeredTeams.map((rt) => (
                  <RegisteredTeamCard key={rt.team_id} rt={rt} />
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <section className="mt-8">
            <h2 className="mb-4 font-display text-sm 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-text-body">
              Times registrados
            </h2>
            {registeredTeams.length === 0 ? (
              <p className="font-display text-sm 2xl:text-base font-medium text-text-muted">
                Nenhum time inscrito ainda.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {registeredTeams.map((rt) => (
                  <RegisteredTeamCard key={rt.team_id} rt={rt} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Regras */}
        {tournament.rules && (
          <section className="mt-10">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.2em]">
                  Regras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm 2xl:text-base text-text-body whitespace-pre-wrap">
                  {tournament.rules}
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </ClientShell>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-base p-4 space-y-1">
      <div className="flex items-center gap-2 text-text-faded">
        <Icon size={12} aria-hidden="true" />
        <span className="font-display font-semibold text-sm 2xl:text-sm uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="font-display text-base 2xl:text-lg text-text-display">{value}</p>
    </div>
  );
}

// Card de time inscrito — usado tanto na grade (sem chave) quanto na sidebar
// (com chave). Linka pro perfil do time; marca "eliminado" quando aplicável.
interface RegisteredTeamEntry {
  team_id: string;
  eliminated_at: string | null;
  team: {
    slug: string;
    name: string;
    tag: string;
    logo_url: string | null;
  } | null;
}

function RegisteredTeamCard({ rt }: { rt: RegisteredTeamEntry }) {
  if (!rt.team) return null;
  return (
    <Link
      href={`/times/${rt.team.slug}`}
      className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 transition-colors hover:border-border-brand"
    >
      {rt.team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={rt.team.logo_url}
          alt=""
          className="size-10 rounded-sm border border-border-subtle"
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-sm border border-border-subtle bg-brand-primary/15">
          <span className="font-display text-sm 2xl:text-base text-brand-primary">
            {rt.team.tag}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm 2xl:text-base text-text-display">
          {rt.team.name}
        </p>
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          [{rt.team.tag}]
          {rt.eliminated_at && <span className="ml-2 text-error">eliminado</span>}
        </p>
      </div>
    </Link>
  );
}

