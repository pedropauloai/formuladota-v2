// Finaliza uma partida de MATCHMAKING (via bot) → registra o placar no histórico e
// LIBERA os jogadores da rota da partida. Preenche o mesmo pipeline do fluxo de PT
// (matches + match_players + match_details), mas partindo de um LOBBY (não de uma PT
// de coach). Idempotente: se já foi enriquecida, não duplica.
//
// Fluxo (Pedro 2026-07-01 — partidas de matchmaking não tinham pós-jogo):
//   1. resolve o lobby (precisa de dota_match_id gravado pelo bot);
//   2. garante uma linha em `matches` ligada ao lobby (matches.lobby_id);
//   3. busca a partida no OpenDota, normaliza e insere match_players;
//   4. upsert em match_details (teamfights/objetivos/draft/chat) — feed público do placar;
//   5. atualiza `matches` (placar/duração/vencedor/enriched_at, status='realizada');
//   6. fecha o lobby (status='completed', ended_at) → getQueueStatus para de redirecionar
//      os 10 pra /partida/[id] (jogadores liberados).
//
// Recebe um supabase client JÁ criado (service role no script/cron, server no action).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchOpenDotaMatch,
  normalizePlayers,
  isMatchParsed,
  requestOpenDotaParse,
  type OpenDotaMatch,
} from "./opendota";
import { applyMatchMmr } from "@/lib/queries/apply-match-mmr";

// Quanto tempo esperar o parse do replay antes de aplicar o MMR só com os dados
// básicos (fallback). O parse da OpenDota costuma sair em 1-5 min; 15 min cobre
// folgado sem prender o MMR pra sempre se o replay expirar/der erro. (Pedro 2026-07-03)
const PARSE_FALLBACK_MS = 15 * 60 * 1000;

const STEAM_64_OFFSET = 76561197960265728n;
function steam64To32(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_64_OFFSET);
}

export interface FinalizeResult {
  success: boolean;
  error?: string;
  playersInserted?: number;
  alreadyDone?: boolean;
  dotaMatchId?: string;
}

export async function finalizeMatchmakingLobby(
  supabase: SupabaseClient,
  lobbyId: string
): Promise<FinalizeResult> {
  // 1) Lobby + dota_match_id (gravado pelo bot ao criar a sala de liga).
  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, status, dota_match_id, league_id, created_at")
    .eq("id", lobbyId)
    .maybeSingle();
  if (!lobby) return { success: false, error: "Lobby não encontrado." };
  if (!lobby.dota_match_id) {
    return { success: false, error: "Lobby sem dota_match_id — a partida não foi criada pelo bot." };
  }
  const dotaMatchId = String(lobby.dota_match_id);

  // 2) Garante a linha em `matches` ligada ao lobby (idempotente por lobby_id).
  let matchId: string;
  const { data: existing } = await supabase
    .from("matches")
    .select("id, enriched_at")
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  if (existing) {
    matchId = existing.id as string;
    if (existing.enriched_at) {
      // Já enriquecida — só garante o lobby fechado (libera quem ficou preso) e sai.
      await closeLobbyAndRelease(supabase, lobbyId);
      return { success: true, alreadyDone: true, dotaMatchId };
    }
  } else {
    const { data: created, error: insErr } = await supabase
      .from("matches")
      .insert({
        lobby_id: lobbyId,
        dota_match_id: dotaMatchId,
        data_agendada: lobby.created_at ?? new Date().toISOString(),
        status: "agendada",
        league_id: lobby.league_id ?? null,
        match_dataset: "opendota",
      } as never)
      .select("id")
      .single();
    if (insErr || !created) {
      return { success: false, error: "Erro ao criar match: " + (insErr?.message ?? "?") };
    }
    matchId = (created as { id: string }).id;
  }

  // 3) OpenDota → normaliza jogadores.
  let od;
  try {
    od = await fetchOpenDotaMatch(dotaMatchId);
  } catch (e) {
    return { success: false, error: "OpenDota: " + (e instanceof Error ? e.message : "erro") };
  }
  const normalized = normalizePlayers(od);

  // Mapeia account_id (32) → user_id via steam_links (quem é membro da plataforma).
  const steamId64Strings = normalized
    .map((p) => p.steam_account_id)
    .filter((id) => id > 0)
    .map((aid) => (BigInt(aid) + STEAM_64_OFFSET).toString());
  const { data: links } = await supabase
    .from("steam_links")
    .select("user_id, steam_id_64")
    .in("steam_id_64", steamId64Strings);
  const steamToUserId = new Map<number, string>();
  for (const l of links ?? []) steamToUserId.set(steam64To32(l.steam_id_64), l.user_id);

  // Idempotência: não duplica se já há players (ex.: reprocesso).
  const { count: existingPlayers } = await supabase
    .from("match_players")
    .select("match_id", { count: "exact", head: true })
    .eq("match_id", matchId);

  let playersInserted = 0;
  if (!existingPlayers) {
    const rows = normalized.map((p) => ({
      match_id: matchId,
      steam_account_id: p.steam_account_id,
      user_id: steamToUserId.get(p.steam_account_id) ?? null,
      is_pro: false, // matchmaking não tem PRO designado
      team: p.team,
      player_slot: p.player_slot,
      is_winner: p.is_winner,
      hero_id: p.hero_id,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      gold_per_min: p.gold_per_min,
      xp_per_min: p.xp_per_min,
      last_hits: p.last_hits,
      denies: p.denies,
      net_worth: p.net_worth,
      level: p.level,
      hero_damage: p.hero_damage,
      hero_healing: p.hero_healing,
      tower_damage: p.tower_damage,
      items: p.items,
      rank_tier: p.rank_tier,
      leaver_status: p.leaver_status,
      personaname: p.personaname,
      aghanims_scepter: p.aghanims_scepter,
      aghanims_shard: p.aghanims_shard,
      benchmarks: p.benchmarks,
      raw_opendota: p.raw_opendota as unknown as Record<string, unknown>,
    }));
    const { error: insErr } = await supabase.from("match_players").insert(rows as never);
    if (insErr) return { success: false, error: "Erro ao inserir players: " + insErr.message };
    playersInserted = rows.length;
  }

  // 4) match_details (nível-partida, feed público do placar).
  const md = od as unknown as {
    teamfights?: unknown; objectives?: unknown; picks_bans?: unknown;
    chat?: unknown; game_mode?: number; lobby_type?: number;
  };
  const mdTable = supabase.from("match_details" as never) as unknown as {
    upsert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
  await mdTable.upsert({
    match_id: matchId,
    dota_match_id: dotaMatchId,
    teamfights: md.teamfights ?? null,
    objectives: md.objectives ?? null,
    picks_bans: md.picks_bans ?? null,
    chat: md.chat ?? null,
    game_mode: md.game_mode ?? null,
    lobby_type: md.lobby_type ?? null,
  });

  // 5) Atualiza matches com o resultado.
  await supabase
    .from("matches")
    .update({
      dota_match_id: dotaMatchId,
      radiant_win: od.radiant_win ?? null,
      radiant_score: od.radiant_score ?? null,
      dire_score: od.dire_score ?? null,
      duracao_min: od.duration ? Math.round(od.duration / 60) : null,
      game_mode: od.game_mode ?? null,
      lobby_type: od.lobby_type ?? null,
      patch: od.patch ?? null,
      first_blood_time: od.first_blood_time ?? null,
      match_dataset: "opendota",
      enriched_at: new Date().toISOString(),
      status: "realizada",
    } as never)
    .eq("id", matchId);

  // 6) MMR NÃO é aplicado aqui (Pedro 2026-07-03): a partida acabou de terminar e o
  // replay ainda NÃO foi parseado pela OpenDota → faltaria a métrica de maior peso
  // (presença em teamfight). Solicitamos o parse e deixamos o MMR PENDENTE
  // (mmr_applied_at NULL). O cron chama finalizePendingMmr() nos próximos ciclos e
  // aplica o MMR assim que o parse ficar pronto (ou por fallback após 15 min). Isso
  // NÃO atrasa a liberação dos jogadores — o lobby é fechado já a seguir.
  if (!isMatchParsed(od)) {
    await requestOpenDotaParse(dotaMatchId);
  }

  // 7) Fecha o lobby e libera os jogadores (imediato — independe do MMR/parse).
  await closeLobbyAndRelease(supabase, lobbyId);

  return { success: true, playersInserted, dotaMatchId };
}

/**
 * Aplica o MMR das partidas PENDENTES (realizada + mmr_applied_at NULL). Chamado
 * pelo cron a cada ciclo. Espera o replay ser PARSEADO pra usar o desempenho
 * completo (presença em teamfight etc.); se o parse não chegar em PARSE_FALLBACK_MS,
 * aplica com os dados básicos pra não travar o MMR. Pedro 2026-07-03.
 */
export async function finalizePendingMmr(
  supabase: SupabaseClient,
  opts?: { fallbackMs?: number; limit?: number }
): Promise<{ applied: number; waitingParse: number; results: Array<Record<string, unknown>> }> {
  const fallbackMs = opts?.fallbackMs ?? PARSE_FALLBACK_MS;
  const { data: pending } = await supabase
    .from("matches")
    .select("id, dota_match_id, enriched_at")
    .eq("status", "realizada")
    .is("mmr_applied_at", null)
    .not("dota_match_id", "is", null)
    .order("enriched_at", { ascending: true })
    .limit(opts?.limit ?? 10);

  let applied = 0;
  let waitingParse = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const m of pending ?? []) {
    const dotaMatchId = String(m.dota_match_id);
    let od: OpenDotaMatch;
    try {
      od = await fetchOpenDotaMatch(dotaMatchId);
    } catch {
      results.push({ dotaMatchId, status: "indisponivel" });
      continue;
    }

    const parsed = isMatchParsed(od);
    const agedMs = m.enriched_at ? Date.now() - new Date(m.enriched_at).getTime() : Infinity;

    if (!parsed) {
      await requestOpenDotaParse(dotaMatchId); // best-effort — acelera
      if (agedMs < fallbackMs) {
        waitingParse += 1;
        results.push({ dotaMatchId, status: "aguardando_parse" });
        continue;
      }
      // fallback: parse não veio a tempo → aplica com o que tem.
      results.push({ dotaMatchId, status: "fallback_sem_parse" });
    } else {
      // Parseou → atualiza os players com o replay completo ANTES de calcular o MMR
      // (pra o perfScore v2 enxergar teamfight_participation / stuns).
      await updatePlayersFromOd(supabase, m.id, od);
      results.push({ dotaMatchId, status: "parseada" });
    }

    try {
      await applyMatchMmr(supabase as never, m.id);
      applied += 1;
    } catch (e) {
      results.push({ dotaMatchId, status: "erro_mmr", detail: e instanceof Error ? e.message : "?" });
    }
  }

  return { applied, waitingParse, results };
}

/** Atualiza match_players (raw_opendota + benchmarks + colunas) a partir do od
 *  parseado, casando por player_slot. Sem auth (uso interno cron/service). */
async function updatePlayersFromOd(
  supabase: SupabaseClient,
  matchId: string,
  od: OpenDotaMatch
): Promise<void> {
  for (const p of normalizePlayers(od)) {
    await supabase
      .from("match_players")
      .update({
        gold_per_min: p.gold_per_min,
        xp_per_min: p.xp_per_min,
        last_hits: p.last_hits,
        denies: p.denies,
        net_worth: p.net_worth,
        level: p.level,
        hero_damage: p.hero_damage,
        hero_healing: p.hero_healing,
        tower_damage: p.tower_damage,
        items: p.items,
        benchmarks: p.benchmarks,
        raw_opendota: p.raw_opendota as unknown as Record<string, unknown>,
      } as never)
      .eq("match_id", matchId)
      .eq("player_slot", p.player_slot);
  }
}

// Fecha o lobby (completed) → getQueueStatus deixa de redirecionar os 10 pra a rota da
// partida. Também "arquiva" as entries matched dessa partida (não bloqueiam re-fila; o
// índice único da fila só vale pra status 'waiting', mas deixamos explícito).
async function closeLobbyAndRelease(supabase: SupabaseClient, lobbyId: string): Promise<void> {
  await supabase
    .from("lobbies")
    .update({ status: "completed", ended_at: new Date().toISOString() } as never)
    .eq("id", lobbyId)
    .in("status", ["open", "in_progress"]);
}
