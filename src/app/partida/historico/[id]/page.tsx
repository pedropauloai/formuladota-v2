// Placar pós-jogo de uma partida FormulaDota (histórico). Rota dedicada, pública
// (match_players tem SELECT público — coerente com a cultura anti-anonimato).
//
// Tudo que o placar precisa vem de match_players (público). A tabela `matches`
// (duração, link OpenDota) é lida em best-effort: admin enxerga via RLS, público
// degrada sem quebrar. Vitória e placar (soma de kills por time = placar real do
// Dota) são derivados dos próprios jogadores.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { getHeroById } from "@/lib/queries/heroes";
import {
  MatchScoreboard,
  type ScoreboardPlayer,
} from "@/components/match/match-scoreboard";

export const dynamic = "force-dynamic";

interface PlayerRow {
  user_id: string | null;
  team: "radiant" | "dire";
  player_slot: number;
  is_winner: boolean;
  hero_id: number;
  personaname: string | null;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  net_worth: number;
  level: number;
  hero_damage: number;
  hero_healing: number;
  tower_damage: number;
  items: {
    inventory?: (number | null)[];
    backpack?: (number | null)[];
    neutral?: number | null;
    neutral2?: number | null;
  } | null;
}

export default async function HistoricoPartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Stats de TODOS os jogadores (público). É a fonte do placar inteiro.
  const { data: playersData } = await supabase
    .from("match_players")
    .select(
      "user_id, team, player_slot, is_winner, hero_id, personaname, kills, deaths, assists, last_hits, denies, gold_per_min, xp_per_min, net_worth, level, hero_damage, hero_healing, tower_damage, items"
    )
    .eq("match_id", id)
    .order("team", { ascending: true })
    .order("player_slot", { ascending: true });

  const rows = (playersData ?? []) as PlayerRow[];
  if (rows.length === 0) notFound();

  // Meta da partida (best-effort: público pode não enxergar `matches`).
  const { data: matchMeta } = await supabase
    .from("matches")
    .select("dota_match_id, duracao_min, radiant_win, radiant_score, dire_score, enriched_at")
    .eq("id", id)
    .maybeSingle();

  // Identidade dos jogadores logados (steam_links → fallback profiles).
  const userIds = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  const steamById = new Map<string, { persona: string | null; avatar_url: string | null }>();
  const profById = new Map<string, { username: string | null; avatar_url: string | null }>();
  if (userIds.length) {
    const [{ data: links }, { data: profs }] = await Promise.all([
      supabase.from("steam_links").select("user_id, persona, avatar_url").in("user_id", userIds),
      supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
    ]);
    for (const l of links ?? []) steamById.set(l.user_id, l);
    for (const p of profs ?? []) profById.set(p.id, p);
  }

  function toScoreboardPlayer(r: PlayerRow): ScoreboardPlayer {
    const sl = r.user_id ? steamById.get(r.user_id) : undefined;
    const pr = r.user_id ? profById.get(r.user_id) : undefined;
    const hero = getHeroById(r.hero_id);
    const inv = (r.items?.inventory ?? []).map((x) => x ?? 0);
    return {
      userId: r.user_id,
      name: sl?.persona || pr?.username || r.personaname || "Jogador anônimo",
      avatar: sl?.avatar_url || pr?.avatar_url || null,
      profileHref: r.user_id ? `/perfil/u/${r.user_id}` : null,
      heroName: hero?.name_pt ?? `Herói ${r.hero_id}`,
      heroPortrait: hero?.portrait_url ?? null,
      level: r.level,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      lastHits: r.last_hits,
      denies: r.denies,
      gpm: r.gold_per_min,
      xpm: r.xp_per_min,
      netWorth: r.net_worth,
      heroDamage: r.hero_damage,
      towerDamage: r.tower_damage,
      heroHealing: r.hero_healing,
      inventory: inv,
      neutral: r.items?.neutral ?? null,
    };
  }

  const radiantRows = rows.filter((r) => r.team === "radiant");
  const direRows = rows.filter((r) => r.team === "dire");
  const radiant = radiantRows.map(toScoreboardPlayer);
  const dire = direRows.map(toScoreboardPlayer);

  // Vitória: usa matches.radiant_win se visível; senão deriva dos jogadores.
  const radiantWin = matchMeta?.radiant_win ?? radiantRows[0]?.is_winner ?? null;

  // Placar = soma de kills por time (idêntico ao placar exibido no Dota); usa o
  // valor autoritativo de matches quando disponível.
  const sumKills = (list: PlayerRow[]) => list.reduce((acc, r) => acc + r.kills, 0);
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

        <header className="mb-6">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-text-muted">
            Partida FormulaDota
          </p>

          {/* Placar grande: Iluminados X x Y Temidos. */}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-2xl font-bold uppercase tracking-wide text-[#00C466]">
              Iluminados
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-text-display">
              {radiantScore}
              <span className="mx-2 text-text-faded">x</span>
              {direScore}
            </span>
            <span className="font-display text-2xl font-bold uppercase tracking-wide text-brand-primary">
              Temidos
            </span>
          </div>

          {/* Metadados: vencedor + duração + data + link externo. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-sm text-text-muted">
            {radiantWin != null && (
              <span>
                Vitória{" "}
                <strong className={radiantWin ? "text-[#00C466]" : "text-brand-primary"}>
                  {radiantWin ? "Iluminados" : "Temidos"}
                </strong>
              </span>
            )}
            {duration != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {duration} min
              </span>
            )}
            {dateStr && <span>{dateStr}</span>}
            {dotaMatchId && (
              <a
                href={`https://www.opendota.com/matches/${dotaMatchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text-display"
              >
                OpenDota
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </header>

        <MatchScoreboard radiant={radiant} dire={dire} radiantWin={radiantWin} />
      </div>
    </ClientShell>
  );
}
