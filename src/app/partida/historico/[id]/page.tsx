// Placar pós-jogo COMPLETO de uma partida FormulaDota (estilo OpenDota, com abas).
// Rota dedicada, pública (match_players tem SELECT público — coerente com a cultura
// anti-anonimato). Todo o parsing roda no servidor; o cliente só troca de aba.
//
// A tabela `matches` (duração, link OpenDota) é lida em best-effort: admin enxerga
// via RLS, público degrada sem quebrar. Vitória e placar (soma de kills por time =
// placar real do Dota) são derivados dos próprios jogadores.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { MatchDetail } from "@/components/match/match-detail";
import {
  assembleMatch,
  type MatchPlayerRow,
  type Identity,
} from "@/lib/dota/assemble-match";
import {
  parseObjectives,
  parseTeamfights,
  parseDraft,
} from "@/lib/dota/match-objectives";

export const dynamic = "force-dynamic";

const PLAYER_COLS =
  "user_id, team, player_slot, is_winner, hero_id, personaname, kills, deaths, assists, " +
  "last_hits, denies, gold_per_min, xp_per_min, net_worth, level, hero_damage, hero_healing, " +
  "tower_damage, items, raw_opendota";

export default async function HistoricoPartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Stats de TODOS os jogadores (público) — fonte de todas as abas.
  const { data: playersData } = await supabase
    .from("match_players")
    .select(PLAYER_COLS)
    .eq("match_id", id)
    .order("team", { ascending: true })
    .order("player_slot", { ascending: true });

  const rows = (playersData ?? []) as unknown as MatchPlayerRow[];
  if (rows.length === 0) notFound();

  // Meta da partida (best-effort: público pode não enxergar `matches`).
  const { data: matchMeta } = await supabase
    .from("matches")
    .select("dota_match_id, duracao_min, radiant_win, radiant_score, dire_score, enriched_at")
    .eq("id", id)
    .maybeSingle();

  // Identidade dos jogadores logados (steam_links → fallback profiles).
  const userIds = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  const identityById = new Map<string, Identity>();
  if (userIds.length) {
    const [{ data: links }, { data: profs }] = await Promise.all([
      supabase.from("steam_links").select("user_id, persona, avatar_url").in("user_id", userIds),
      supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
    ]);
    for (const l of links ?? []) {
      identityById.set(l.user_id, { persona: l.persona, avatar_url: l.avatar_url, username: null });
    }
    for (const p of profs ?? []) {
      const cur = identityById.get(p.id);
      identityById.set(p.id, {
        persona: cur?.persona ?? null,
        avatar_url: cur?.avatar_url ?? p.avatar_url,
        username: p.username,
      });
    }
  }

  const { players, advantage, wards, series } = assembleMatch(rows, identityById);

  // Dados de nível-partida (público) — abas Teamfights/Objetivos/Draft.
  // match_details é tabela nova (migration 069), ainda fora dos tipos gerados → cast.
  const detailsTable = supabase.from("match_details" as never) as unknown as {
    select: (q: string) => {
      eq: (c: string, v: string) => {
        maybeSingle: () => PromiseLike<{
          data: { teamfights: unknown; objectives: unknown; picks_bans: unknown } | null;
        }>;
      };
    };
  };
  const { data: details } = await detailsTable
    .select("teamfights, objectives, picks_bans")
    .eq("match_id", id)
    .maybeSingle();
  const objectives = parseObjectives(details?.objectives);
  const teamfights = parseTeamfights(details?.teamfights);
  const draft = parseDraft(details?.picks_bans);

  const radiantRows = rows.filter((r) => r.team === "radiant");
  const direRows = rows.filter((r) => r.team === "dire");
  const radiantWin = matchMeta?.radiant_win ?? radiantRows[0]?.is_winner ?? null;

  // Placar = soma de kills por time (idêntico ao placar do Dota); valor autoritativo
  // de matches quando disponível.
  const sumKills = (list: MatchPlayerRow[]) => list.reduce((acc, r) => acc + r.kills, 0);
  const radiantScore = matchMeta?.radiant_score ?? sumKills(radiantRows);
  const direScore = matchMeta?.dire_score ?? sumKills(direRows);

  const duration = matchMeta?.duracao_min ?? null;
  const dotaMatchId = matchMeta?.dota_match_id ?? null;
  const dateStr = matchMeta?.enriched_at
    ? new Date(matchMeta.enriched_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <ClientShell currentRoute={`/partida/historico/${id}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link
          href="/me"
          className="mb-5 inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-text-muted transition-colors hover:text-text-display"
        >
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>

        <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40">
          {/* Banner: times flanqueando o placar central (estilo STRATZ). */}
          <div className="flex items-center justify-between gap-3 px-4 py-5 sm:gap-6 sm:px-8">
            {/* Iluminados (esquerda). */}
            <div className="flex-1 text-right">
              <p className="font-display text-xl font-bold uppercase tracking-wide text-[#00C466] sm:text-2xl">
                Iluminados
              </p>
              {radiantWin != null && (
                <p
                  className={`font-display text-xs font-bold uppercase tracking-wide ${
                    radiantWin ? "text-[#00C466]" : "text-text-faded"
                  }`}
                >
                  {radiantWin ? "Vitória" : "Derrota"}
                </p>
              )}
            </div>

            {/* Placar + duração no centro. */}
            <div className="shrink-0 text-center">
              <div className="flex items-center gap-2 font-display text-4xl font-bold tabular-nums sm:text-5xl">
                <span className={radiantWin ? "text-[#00C466]" : "text-text-muted"}>
                  {radiantScore}
                </span>
                <span className="text-text-faded">:</span>
                <span className={radiantWin === false ? "text-brand-primary" : "text-text-muted"}>
                  {direScore}
                </span>
              </div>
              {duration != null && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-sm bg-bg-surface px-2 py-0.5 font-mono text-xs tabular-nums text-text-muted">
                  <Clock className="size-3" />
                  {duration}min
                </span>
              )}
            </div>

            {/* Temidos (direita). */}
            <div className="flex-1 text-left">
              <p className="font-display text-xl font-bold uppercase tracking-wide text-brand-primary sm:text-2xl">
                Temidos
              </p>
              {radiantWin != null && (
                <p
                  className={`font-display text-xs font-bold uppercase tracking-wide ${
                    radiantWin === false ? "text-brand-primary" : "text-text-faded"
                  }`}
                >
                  {radiantWin === false ? "Vitória" : "Derrota"}
                </p>
              )}
            </div>
          </div>

          {/* Barra de metadados. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-subtle bg-bg-surface/40 px-4 py-2 font-display text-xs uppercase tracking-wide text-text-muted sm:px-8">
            <span>Partida FormulaDota</span>
            {dateStr && <span className="text-text-faded">{dateStr}</span>}
            {dotaMatchId && (
              <a
                href={`https://www.opendota.com/matches/${dotaMatchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 normal-case text-text-muted transition-colors hover:text-text-display"
              >
                OpenDota
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </header>

        <MatchDetail
          players={players}
          advantage={advantage}
          series={series}
          wards={wards}
          objectives={objectives}
          teamfights={teamfights}
          draft={draft}
          radiantWin={radiantWin}
        />
      </div>
    </ClientShell>
  );
}
