// Visualização de chave (bracket) single-elim no padrão clássico: rodadas em
// COLUNAS da esquerda pra direita, final à direita, com linhas conectando o
// vencedor de cada par ao confronto seguinte.
//
// Geometria: cada coluna de rodada distribui seus matches com flex-1 (altura
// igual). A rodada seguinte tem metade dos matches, cada um flex-1 → centraliza
// naturalmente entre o par que o alimenta. As colunas conectoras (entre rodadas)
// desenham as linhas ⌐/L até o ponto médio do par.

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { ReportMatchButton } from "./report-match-button";

export interface BracketMatch {
  id: string | null;
  status: string | null;
  team_a_name: string | null;
  team_a_tag: string | null;
  team_b_name: string | null;
  team_b_tag: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  score_a: number | null;
  score_b: number | null;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: BracketMatch[];
}

const COL_W = "w-60"; // 240px por coluna de rodada
const HEADER_H = "h-9"; // header igual em todas as colunas mantém o alinhamento
const LINE = "bg-text-faded/50"; // linhas conectoras — visíveis mas discretas

export function BracketView({
  rounds,
  isAdmin,
}: {
  rounds: BracketRound[];
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max">
        {rounds.map((round, idx) => (
          <Fragment key={round.round}>
            <div className={cn("flex shrink-0 flex-col", COL_W)}>
              <div className={cn("flex items-center", HEADER_H)}>
                <h3 className="font-display text-sm uppercase tracking-[0.2em] text-brand-primary">
                  {round.name}
                </h3>
              </div>
              <div className="flex flex-1 flex-col">
                {round.matches.map((m, i) => (
                  <div
                    key={m.id ?? `${round.round}-${i}`}
                    className="flex flex-1 items-center pr-2"
                  >
                    <BracketCard match={m} isAdmin={isAdmin} />
                  </div>
                ))}
              </div>
            </div>

            {idx < rounds.length - 1 && (
              <ConnectorColumn count={rounds[idx + 1]!.matches.length} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Coluna conectora: 1 unidade por match da PRÓXIMA rodada. Cada unidade desenha
// as duas entradas (topo/baixo do par), o trecho vertical e a saída pro centro.
function ConnectorColumn({ count }: { count: number }) {
  return (
    <div className="flex w-8 shrink-0 flex-col">
      <div className={HEADER_H} />
      <div className="flex flex-1 flex-col">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex-1">
            {/* entrada do match de cima (centro a 25% da unidade) */}
            <span className={cn("absolute left-0 top-1/4 h-px w-3", LINE)} />
            {/* entrada do match de baixo (centro a 75%) */}
            <span className={cn("absolute left-0 top-3/4 h-px w-3", LINE)} />
            {/* vertical unindo 25%→75% */}
            <span className={cn("absolute left-3 top-1/4 h-1/2 w-px", LINE)} />
            {/* saída horizontal pro próximo match (centro, 50%) */}
            <span className={cn("absolute left-3 top-1/2 h-px w-5", LINE)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketCard({
  match,
  isAdmin,
}: {
  match: BracketMatch;
  isAdmin: boolean;
}) {
  const winnerA = match.winner_team_id && match.winner_team_id === match.team_a_id;
  const winnerB = match.winner_team_id && match.winner_team_id === match.team_b_id;
  const completed = match.status === "completed";
  const canReport =
    isAdmin &&
    match.status === "scheduled" &&
    Boolean(match.id && match.team_a_id && match.team_b_id);

  return (
    <div className="w-full overflow-hidden rounded-md border border-border-subtle bg-bg-base">
      <TeamLine
        name={match.team_a_name}
        tag={match.team_a_tag}
        score={match.score_a ?? 0}
        winner={Boolean(winnerA)}
        showScore={completed}
      />
      <div className="border-t border-border-subtle" />
      <TeamLine
        name={match.team_b_name}
        tag={match.team_b_tag}
        score={match.score_b ?? 0}
        winner={Boolean(winnerB)}
        showScore={completed}
      />
      {match.status === "walkover" && (
        <div className="bg-bg-deep px-2 py-1 text-center font-display text-[10px] uppercase tracking-wide text-text-faded">
          passou direto (bye)
        </div>
      )}
      {canReport && (
        <ReportMatchButton
          matchId={match.id!}
          teamAId={match.team_a_id!}
          teamBId={match.team_b_id!}
          teamAName={match.team_a_name ?? "Time A"}
          teamBName={match.team_b_name ?? "Time B"}
        />
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
      className={cn(
        "flex items-center justify-between gap-2 px-2.5 py-2",
        winner && "bg-brand-primary/10"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {tag && (
          <span className="shrink-0 font-display text-xs font-semibold uppercase tracking-wide text-text-faded">
            [{tag}]
          </span>
        )}
        <span
          className={cn(
            "truncate font-body text-sm 2xl:text-base",
            winner ? "font-semibold text-text-display" : "text-text-muted"
          )}
        >
          {name ?? "A definir"}
        </span>
      </div>
      {showScore && (
        <span
          className={cn(
            "shrink-0 font-display text-base 2xl:text-lg tabular-nums",
            winner ? "text-brand-primary" : "text-text-faded"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
