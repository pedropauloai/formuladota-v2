// Placar pós-jogo COMPLETO de uma partida FormulaDota (estilo OpenDota, com abas).
// Rota dedicada, pública (match_players tem SELECT público — coerente com a cultura
// anti-anonimato). Todo o parsing roda no servidor; o cliente só troca de aba.
//
// A tabela `matches` (duração, link OpenDota) é lida em best-effort: admin enxerga
// via RLS, público degrada sem quebrar. Vitória e placar (soma de kills por time =
// placar real do Dota) são derivados dos próprios jogadores.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock, Ban } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getAssignedPositionsByDotaMatchId } from "@/lib/queries/assigned-roles";
import { ClientShell } from "@/components/client-shell/shell";
import { MatchDetail } from "@/components/match/match-detail";
import { CopyMatchId } from "@/components/match/copy-match-id";
import { ReprocessMatchButton } from "@/components/match/reprocess-match-button";
import { getMatchBans } from "@/lib/queries/match-bans";
import { xpProgress } from "@/lib/levels";
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
import { parsePlayerHeatmap, type PlayerHeatmap } from "@/lib/dota/match-heatmap";
import { getHeroById } from "@/lib/queries/heroes";

export const dynamic = "force-dynamic";

// OG tags pro desdobramento no Discord/redes. A imagem rica (card do placar) vem
// automática do opengraph-image.tsx co-localizado; aqui só título + descrição.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = `Partida ${id} · FORMULADOTA`;
  const description = "Placar completo: heróis, funções, KDA, MMR e medalhas da partida.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const PLAYER_COLS =
  "user_id, team, player_slot, is_winner, hero_id, personaname, kills, deaths, assists, " +
  "last_hits, denies, gold_per_min, xp_per_min, net_worth, level, hero_damage, hero_healing, " +
  "tower_damage, items, mmr_change, raw_opendota";

export default async function HistoricoPartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // match_details é pública e tem dota_match_id → resolve o ID real da Valve
  // (URL canônica) pro match_id interno (UUID). matches tem RLS restrita, então
  // NÃO dá pra resolver por lá pro público. Cast: tabela nova (migration 069).
  const mdTable = supabase.from("match_details" as never) as unknown as {
    select: (q: string) => {
      eq: (c: string, v: string) => {
        maybeSingle: () => PromiseLike<{
          data: {
            match_id?: string;
            teamfights?: unknown;
            objectives?: unknown;
            picks_bans?: unknown;
            mvp_user_id?: string | null;
          } | null;
        }>;
      };
    };
  };

  // URL canônica = dota_match_id (ex 8873698944). Aceita UUID interno como fallback.
  let matchUuid = id;
  if (!isUuid) {
    const { data: resolved } = await mdTable
      .select("match_id")
      .eq("dota_match_id", id)
      .maybeSingle();
    if (!resolved?.match_id) notFound();
    matchUuid = resolved.match_id;
  }

  // Após ter o matchUuid, tudo abaixo é independente → UM Promise.all em vez
  // de ~4 round-trips em série (players, meta, details, viewer).
  const [
    { data: playersData },
    { data: matchMeta },
    { data: details },
    viewer,
  ] = await Promise.all([
    // Stats de TODOS os jogadores (público) — fonte de todas as abas.
    supabase
      .from("match_players")
      .select(PLAYER_COLS)
      .eq("match_id", matchUuid)
      .order("team", { ascending: true })
      .order("player_slot", { ascending: true }),
    // Meta da partida (best-effort: público pode não enxergar `matches`).
    supabase
      .from("matches")
      .select("dota_match_id, duracao_min, radiant_win, radiant_score, dire_score, enriched_at")
      .eq("id", matchUuid)
      .maybeSingle(),
    // Dados de nível-partida (público) — abas Teamfights/Objetivos/Draft.
    mdTable
      .select("teamfights, objectives, picks_bans, mvp_user_id")
      .eq("match_id", matchUuid)
      .maybeSingle(),
    // Viewer (deduplicado por React.cache — o shell reaproveita).
    getCurrentUser(),
  ]);

  const rows = (playersData ?? []) as unknown as MatchPlayerRow[];
  if (rows.length === 0) notFound();

  // Viewer é admin? (mostra o botão de reprocessar OpenDota — corrige abas vazias).
  // Dispara já e resolve junto com o bloco de identidade abaixo.
  const viewerAdminPromise: Promise<boolean> = (async () => {
    if (!viewer) return false;
    const { data: vp } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", viewer.id)
      .maybeSingle();
    return vp?.is_admin === true;
  })();

  // Identidade dos jogadores: nick (Discord>Steam), avatar, + NÍVEL da conta e
  // MMR FormulaDota (identidade viaja com o jogador, decisão Pedro 2026-07-02).
  const userIds = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  const identityById = new Map<string, Identity>();
  if (userIds.length) {
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("active", true)
      .maybeSingle();
    const [{ data: links }, { data: profs }, { data: levels }, { data: mmrs }] =
      await Promise.all([
        supabase.from("steam_links").select("user_id, persona, avatar_url").in("user_id", userIds),
        // View pública (Discord-first) em vez de `profiles` direto: a RLS de profiles
        // só deixa admin/self/coach lerem username → sem isso, não-admin via "anônimo".
        // A view expõe SÓ identidade pública, então o nome/foto Discord aparece pra todos.
        supabase.from("public_player_identities").select("id, username, avatar_url").in("id", userIds),
        supabase.from("user_levels").select("user_id, total_xp_earned").in("user_id", userIds),
        season?.id
          ? supabase.from("player_season_mmr").select("user_id, mmr").eq("season_id", season.id).in("user_id", userIds)
          : Promise.resolve({ data: [] as { user_id: string; mmr: number }[] }),
      ]);
    const xpBy = new Map((levels ?? []).map((l) => [l.user_id, xpProgress(l.total_xp_earned ?? 0)]));
    const mmrBy = new Map((mmrs ?? []).map((m) => [m.user_id, m.mmr]));
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
    // Merge nível + MMR em todos os user_ids (mesmo os sem steam/profile).
    for (const uid of userIds) {
      const cur = identityById.get(uid) ?? { persona: null, avatar_url: null, username: null };
      const xp = xpBy.get(uid);
      identityById.set(uid, {
        ...cur,
        level: xp?.level ?? 1,
        xpPct: xp?.pct ?? 0,
        mmr: mmrBy.get(uid) ?? null,
      });
    }
  }

  const viewerIsAdmin = await viewerAdminPromise;

  // Posições ATRIBUÍDAS no matchmaking (fonte correta da role, não net worth). O `id`
  // da URL é canônico = dota_match_id; matchMeta é preferido quando o público o enxerga.
  const valveMatchId = matchMeta?.dota_match_id ?? id;
  const assignedPos = await getAssignedPositionsByDotaMatchId(supabase, valveMatchId);
  const { players, advantage, wards, series } = assembleMatch(rows, identityById, assignedPos);

  // Mapa de calor de posição por jogador (lane_pos → minimapa). Aba "Presença".
  const heatmaps: PlayerHeatmap[] = rows.map((r) => {
    const hero = getHeroById(r.hero_id);
    const cells = parsePlayerHeatmap(r.raw_opendota);
    const ident = r.user_id ? identityById.get(r.user_id) : null;
    return {
      userId: r.user_id,
      slot: r.player_slot,
      team: r.team,
      playerName: ident?.username ?? ident?.persona ?? r.personaname ?? "Jogador",
      heroName: hero?.name_pt ?? `Herói ${r.hero_id}`,
      heroIcon: hero?.image_icon ?? null,
      cells,
      hasData: cells.length > 0,
    };
  });

  const objectives = parseObjectives(details?.objectives);
  const teamfights = parseTeamfights(details?.teamfights);
  const draft = parseDraft(details?.picks_bans);
  const mvpUserId = details?.mvp_user_id ?? null;

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
  // Banimentos ligados a ESTA partida (público — accountability no placar).
  const matchBans = dotaMatchId ? await getMatchBans(dotaMatchId) : [];
  const dateStr = matchMeta?.enriched_at
    ? new Date(matchMeta.enriched_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <ClientShell currentRoute={`/partida/historico/${id}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-bg-surface/40 px-4 py-2 font-display text-xs uppercase tracking-wide text-text-muted sm:px-8">
            <span>Partida FormulaDota</span>
            {dateStr && <span className="text-text-faded">{dateStr}</span>}
            {dotaMatchId && <CopyMatchId matchId={dotaMatchId} />}
            {viewerIsAdmin && (
              <ReprocessMatchButton matchId={matchUuid} dotaMatchId={id} />
            )}
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

        {/* Aviso público de banimento nesta partida (anti-anonimato — visível a todos). */}
        {matchBans.length > 0 && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-error/40 bg-error/5 p-4">
            <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.15em] text-error">
              <Ban className="size-4" aria-hidden="true" />
              {matchBans.length === 1
                ? "Jogador banido nesta partida"
                : "Jogadores banidos nesta partida"}
            </p>
            <ul className="mt-2 space-y-1.5">
              {matchBans.map((b) => (
                <li key={b.userId} className="text-sm">
                  <Link
                    href={`/perfil/u/${b.userId}`}
                    className="font-display font-bold text-text-display hover:text-brand-primary"
                  >
                    {b.username ?? "Jogador"}
                  </Link>
                  {b.antipattern && (
                    <span className="ml-2 font-display text-xs font-semibold uppercase tracking-wide text-error/90">
                      {b.antipattern}
                    </span>
                  )}
                  {b.notes && (
                    <p className="mt-0.5 font-body text-xs leading-relaxed text-text-muted">
                      {b.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <MatchDetail
          players={players}
          advantage={advantage}
          series={series}
          wards={wards}
          objectives={objectives}
          teamfights={teamfights}
          draft={draft}
          radiantWin={radiantWin}
          dotaMatchId={dotaMatchId ?? id}
          mvpUserId={mvpUserId}
          heatmaps={heatmaps}
        />
      </div>
    </ClientShell>
  );
}
