// /torneios/[slug] — detalhe do torneio. V1 minimal: header + teams registrados +
// bracket simples (lista de matches por round). Captain pode inscrever team.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Calendar, Users, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TournamentRegisterButton } from "./register-button";

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
  if (!user) redirect("/");

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

  // User's teams onde é captain (pra inscrever no torneio)
  const { data: userCaptainTeams } = await supabase
    .from("teams")
    .select("id, name, tag")
    .eq("captain_id", user.id);

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

        {/* Times registrados */}
        <section className="mt-8">
          <h2 className="mb-4 font-display text-sm 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-text-body">
            Times registrados
          </h2>
          {registeredTeams.length === 0 ? (
            <p className="font-display text-sm font-medium text-text-muted">Nenhum time inscrito ainda.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {registeredTeams.map((rt) =>
                rt.team ? (
                  <Link
                    key={rt.team_id}
                    href={`/times/${rt.team.slug}`}
                    className="rounded-md border border-border-subtle bg-bg-base p-3 flex items-center gap-3 hover:border-border-brand transition-colors"
                  >
                    {rt.team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rt.team.logo_url}
                        alt=""
                        className="size-10 rounded-sm border border-border-subtle"
                      />
                    ) : (
                      <div className="size-10 rounded-sm border border-border-subtle bg-brand-primary/15 flex items-center justify-center">
                        <span className="font-display text-sm text-brand-primary">
                          {rt.team.tag}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-text-display truncate">
                        {rt.team.name}
                      </p>
                      <p className="font-mono text-sm uppercase tracking-widest text-text-faded">
                        [{rt.team.tag}]
                        {rt.eliminated_at && (
                          <span className="ml-2 text-error">eliminado</span>
                        )}
                      </p>
                    </div>
                  </Link>
                ) : null
              )}
            </div>
          )}
        </section>

        {/* Bracket */}
        {matches && matches.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-sm 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-text-body">
              Chave
            </h2>
            <div className="space-y-6">
              {Array.from(matchesByRound.entries())
                .sort(([a], [b]) => a - b)
                .map(([round, roundMatches]) => (
                  <div key={round}>
                    <h3 className="mb-3 font-display text-sm 2xl:text-base uppercase tracking-[0.2em] text-brand-primary">
                      {roundName(round, totalRounds)}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(roundMatches ?? []).map((m) => (
                        <BracketMatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
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
        <span className="font-mono text-sm 2xl:text-sm uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="font-display text-base 2xl:text-lg text-text-display">{value}</p>
    </div>
  );
}

interface MatchRow {
  id: string | null;
  status: string | null;
  team_a_name: string | null;
  team_a_tag: string | null;
  team_b_name: string | null;
  team_b_tag: string | null;
  winner_team_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  scheduled_at: string | null;
}

// Card local pra match do bracket — distinto do <MatchCard> pattern (que é
// para partidas de mentoria 1-1). Aqui é um placar simples team A vs team B.
function BracketMatchCard({ match }: { match: MatchRow }) {
  const winnerA = match.winner_team_id && match.winner_team_id === match.team_a_id;
  const winnerB = match.winner_team_id && match.winner_team_id === match.team_b_id;

  return (
    <div className="rounded-md border border-border-subtle bg-bg-base overflow-hidden">
      <TeamLine
        name={match.team_a_name}
        tag={match.team_a_tag}
        score={match.score_a ?? 0}
        winner={Boolean(winnerA)}
        showScore={match.status === "completed"}
      />
      <div className="border-t border-border-subtle" />
      <TeamLine
        name={match.team_b_name}
        tag={match.team_b_tag}
        score={match.score_b ?? 0}
        winner={Boolean(winnerB)}
        showScore={match.status === "completed"}
      />
      {match.scheduled_at && match.status === "scheduled" && (
        <div className="px-3 py-1.5 bg-bg-deep font-mono text-sm uppercase tracking-widest text-text-faded text-center">
          {new Date(match.scheduled_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

function TeamLine({
  name,
  tag,
  score,
  winner,
  showScore,
}: {
  name: string | null;
  tag: string | null;
  score: number;
  winner: boolean;
  showScore: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 ${
        winner ? "bg-brand-primary/10" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {tag && (
          <span className="font-mono text-sm uppercase tracking-widest text-text-faded shrink-0">
            [{tag}]
          </span>
        )}
        <span
          className={`font-body text-sm truncate ${
            winner ? "text-text-display font-semibold" : "text-text-muted"
          }`}
        >
          {name ?? "TBD"}
        </span>
      </div>
      {showScore && (
        <span
          className={`font-display text-base shrink-0 ${
            winner ? "text-brand-primary" : "text-text-faded"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
