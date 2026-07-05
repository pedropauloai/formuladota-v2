/**
 * RECOMPUTE TOTAL do MMR da temporada — replay cronológico com o modelo de perf
 * POR FUNÇÃO (v3). One-off, idempotente (o seed em profiles.mmr_inicial é o
 * âncora invariante: sempre re-derivável do zero).
 *
 * O QUE FAZ:
 *   (a) semente de cada jogador = profiles.mmr_inicial (backfill pela medalha).
 *   (b) reaplica TODAS as partidas da season em ordem cronológica, recalculando
 *       médias de time e deltas com os MMRs em evolução + perf POR FUNÇÃO novo.
 *   (c) escreve match_players.mmr_change, match_details (médias/MVP) e
 *       player_season_mmr (mmr/vitórias/derrotas/partidas/peak/calibrated) +
 *       profiles.mmr_atual.
 *   (d) imprime um diff antes/depois por jogador.
 *
 * USO:
 *   npx tsx scripts/recompute-season-mmr.ts           # DRY-RUN (só imprime o diff)
 *   npx tsx scripts/recompute-season-mmr.ts --apply   # grava de verdade
 *
 * A lógica ESPELHA src/lib/queries/apply-match-mmr.ts (mesmas funções puras de
 * src/lib/mmr.ts). Beta = 1ª season: sem carry-over de season anterior e
 * CALIBRATION_MULTIPLIER=1 (sem dobrar), então o replay é o caminho de produção.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  calculateMmrDelta,
  computePerfScore,
  modulateMmrDelta,
  assignRolesByNetWorth,
  positionToRole,
  ASSIGNED_ROLE_TO_POSITION,
  normalizeStuns,
  normalizeWards,
  seedMmrFromRankTier,
  STARTING_MMR,
  type PlayerRole,
} from "../src/lib/mmr";

// Posições ATRIBUÍDAS no matchmaking (lobby_players.role) por user_id, via dota_match_id.
// Inline aqui (não usa @/lib/queries/assigned-roles) porque o tsx do script não resolve
// o alias @/ — mesma lógica, importando só de ../src/lib/mmr.
async function assignedPositionsFor(dotaMatchId: string | null): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!dotaMatchId) return out;
  const { data: lobby } = await sb
    .from("lobbies")
    .select("id")
    .eq("dota_match_id", dotaMatchId)
    .maybeSingle();
  if (!lobby?.id) return out;
  const { data } = await sb.from("lobby_players").select("user_id, role").eq("lobby_id", lobby.id);
  for (const r of (data ?? []) as Array<{ user_id: string; role: string | null }>) {
    const pos = r.role ? ASSIGNED_ROLE_TO_POSITION[r.role] : undefined;
    if (pos && r.user_id) out.set(r.user_id, pos);
  }
  return out;
}

// --- env (.env.local do projeto) --------------------------------------------
const envPath = path.resolve("C:/Users/ADM/projects/formuladota-v2/.env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes em .env.local");
const APPLY = process.argv.includes("--apply");
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

type Raw = Record<string, unknown>;
interface MP {
  match_id: string;
  user_id: string | null;
  team: string;
  is_winner: boolean | null;
  benchmarks: unknown;
  rank_tier: number | null;
  raw_opendota: Raw | null;
}

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const mean = (xs: number[], fallback: number) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : fallback;

async function main() {
  const { data: season } = await sb.from("seasons").select("id, name").eq("active", true).maybeSingle();
  if (!season) throw new Error("sem temporada ativa");

  // Partidas em ordem cronológica.
  const { data: matches } = await sb
    .from("matches")
    .select("id, created_at, dota_match_id")
    .order("created_at", { ascending: true });
  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) {
    console.log("nenhuma partida — nada a recomputar.");
    return;
  }

  // Todos os match_players das partidas (em 1 query), agrupados por match.
  const { data: allMp } = await sb
    .from("match_players")
    .select("match_id, user_id, team, is_winner, benchmarks, rank_tier, raw_opendota")
    .in("match_id", matchIds);
  const byMatch = new Map<string, MP[]>();
  for (const p of (allMp ?? []) as MP[]) {
    (byMatch.get(p.match_id) ?? byMatch.set(p.match_id, []).get(p.match_id)!).push(p);
  }

  // Semente = medalha Valve (seedMmrFromRankTier(rank_tier)). É o ÚNICO âncora
  // limpo: independe de partidas. NÃO usamos profiles.mmr_inicial — o backfill da
  // migration 126 o poluiu (setou = mmr da season CORRENTE, já movido por partidas,
  // pra quem já tinha linha). rank_tier é o mesmo em todas as partidas do jogador.
  const userIds = Array.from(
    new Set((allMp ?? []).map((p) => p.user_id).filter((u): u is string => Boolean(u)))
  );
  const rankTierOf = new Map<string, number | null>();
  for (const p of (allMp ?? []) as MP[]) {
    if (p.user_id && !rankTierOf.has(p.user_id)) rankTierOf.set(p.user_id, p.rank_tier);
    else if (p.user_id && rankTierOf.get(p.user_id) == null && p.rank_tier != null)
      rankTierOf.set(p.user_id, p.rank_tier);
  }

  // Estado do replay.
  const current = new Map<string, number>();
  const seedOf = new Map<string, number>();
  const stat = new Map<string, { w: number; l: number; games: number; peak: number; mvps: number }>();
  const seedFor = (uid: string, rankTier: number | null): number => {
    if (seedOf.has(uid)) return seedOf.get(uid)!;
    const s = seedMmrFromRankTier(rankTier ?? rankTierOf.get(uid) ?? null) ?? STARTING_MMR;
    seedOf.set(uid, s);
    current.set(uid, s);
    stat.set(uid, { w: 0, l: 0, games: 0, peak: s, mvps: 0 });
    return s;
  };

  // Snapshot ANTES (player_season_mmr atual) pro diff.
  const { data: beforeRows } = await sb
    .from("player_season_mmr")
    .select("user_id, mmr")
    .eq("season_id", season.id)
    .in("user_id", userIds);
  const beforeMmr = new Map<string, number>(
    (beforeRows ?? []).map((r) => [r.user_id as string, r.mmr as number])
  );

  // Escritas acumuladas.
  const changeWrites: { match_id: string; user_id: string; mmr_change: number }[] = [];
  const detailWrites: {
    match_id: string;
    radiant_avg_mmr: number;
    dire_avg_mmr: number;
    mvp_user_id: string | null;
  }[] = [];

  // Replay.
  for (const m of matches ?? []) {
    const players = byMatch.get(m.id) ?? [];
    const platform = players.filter((p): p is MP & { user_id: string } => Boolean(p.user_id));
    if (platform.length === 0) continue;
    // garante seed de cada um
    for (const p of platform) seedFor(p.user_id, p.rank_tier);

    const radiantAvg = mean(
      platform.filter((p) => p.team === "radiant").map((p) => current.get(p.user_id)!),
      STARTING_MMR
    );
    const direAvg = mean(
      platform.filter((p) => p.team === "dire").map((p) => current.get(p.user_id)!),
      radiantAvg
    );
    const anyRad = platform.find((p) => p.team === "radiant");
    const anyDire = platform.find((p) => p.team === "dire");
    const radiantWon = anyRad ? Boolean(anyRad.is_winner) : !anyDire?.is_winner;
    const { radiantDelta, direDelta } = calculateMmrDelta({
      radiantAvgMmr: radiantAvg,
      direAvgMmr: direAvg,
      radiantWon,
    });

    // FUNÇÃO = role ATRIBUÍDA no matchmaking (lobby_players.role); net worth só fallback.
    const assignedPos = await assignedPositionsFor(
      (m as { dota_match_id?: string | null }).dota_match_id ?? null
    );
    const nwRoles = assignRolesByNetWorth(
      players.map((p) => ({ team: p.team, netWorth: num(p.raw_opendota?.net_worth) }))
    );
    const roleOf = new Map<string, PlayerRole>();
    players.forEach((p, i) => {
      if (!p.user_id) return;
      const pos = assignedPos.get(p.user_id);
      roleOf.set(p.user_id, pos ? positionToRole(pos) : nwRoles[i] ?? "core");
    });
    let durMin = 0;
    for (const p of players) {
      const d = num(p.raw_opendota?.duration);
      if (d && d > 0) {
        durMin = d / 60;
        break;
      }
    }

    let mvpUser: string | null = null;
    let mvpPerf = -1;
    for (const p of platform) {
      const role = roleOf.get(p.user_id) ?? "core";
      const raw = p.raw_opendota;
      const obs = num(raw?.obs_placed);
      const sen = num(raw?.sen_placed);
      const wardsTotal = obs == null && sen == null ? null : (obs ?? 0) + (sen ?? 0);
      const perf = computePerfScore(role, p.benchmarks as Record<string, { pct?: number | null }> | null, {
        teamfightParticipation: num(raw?.teamfight_participation),
        stuns: normalizeStuns(num(raw?.stuns), durMin),
        wards: normalizeWards(wardsTotal, durMin),
      });
      if (perf > mvpPerf) {
        mvpPerf = perf;
        mvpUser = p.user_id;
      }
      const won = Boolean(p.is_winner);
      const base = p.team === "radiant" ? radiantDelta : direDelta;
      const delta = modulateMmrDelta(base, perf, won); // calib mult=1 → sem dobrar
      const newMmr = Math.max(0, current.get(p.user_id)! + delta);
      current.set(p.user_id, newMmr);
      const s = stat.get(p.user_id)!;
      s.games += 1;
      if (won) s.w += 1;
      else s.l += 1;
      s.peak = Math.max(s.peak, newMmr);
      changeWrites.push({ match_id: m.id, user_id: p.user_id, mmr_change: delta });
    }
    if (mvpUser) stat.get(mvpUser)!.mvps += 1;
    detailWrites.push({
      match_id: m.id,
      radiant_avg_mmr: radiantAvg,
      dire_avg_mmr: direAvg,
      mvp_user_id: mvpUser,
    });
  }

  // Diff antes/depois.
  console.log(`\n=== RECOMPUTE season ${season.name} (${matchIds.length} partidas, ${userIds.length} jogadores) ===`);
  console.log(APPLY ? ">>> MODO --apply (grava)\n" : ">>> DRY-RUN (não grava; use --apply)\n");
  const rows = [...current.entries()]
    .map(([uid, mmr]) => {
      const before = beforeMmr.get(uid) ?? null;
      const st = stat.get(uid)!;
      return { uid, seed: seedOf.get(uid)!, before, after: mmr, diff: before == null ? null : mmr - before, games: st.games, w: st.w, l: st.l, mvps: st.mvps };
    })
    .sort((a, b) => b.after - a.after);
  console.log("user_id".padEnd(38), "seed".padStart(6), "antes".padStart(7), "depois".padStart(7), "Δ".padStart(6), "  W-L", " MVP");
  for (const r of rows) {
    console.log(
      r.uid.padEnd(38),
      String(r.seed).padStart(6),
      String(r.before ?? "—").padStart(7),
      String(r.after).padStart(7),
      String(r.diff ?? "—").padStart(6),
      `  ${r.w}-${r.l}`,
      `  ${r.mvps}`
    );
  }

  if (!APPLY) {
    console.log("\nDRY-RUN concluído. Rode com --apply pra gravar.");
    return;
  }

  // --- ESCRITA ---------------------------------------------------------------
  console.log("\ngravando...");
  // 1) match_players.mmr_change
  for (const c of changeWrites) {
    const { error } = await sb
      .from("match_players")
      .update({ mmr_change: c.mmr_change })
      .eq("match_id", c.match_id)
      .eq("user_id", c.user_id);
    if (error) throw new Error(`match_players ${c.match_id}/${c.user_id}: ${error.message}`);
  }
  // 2) match_details (médias + MVP)
  for (const d of detailWrites) {
    const { error } = await sb
      .from("match_details")
      .update({ radiant_avg_mmr: d.radiant_avg_mmr, dire_avg_mmr: d.dire_avg_mmr, mvp_user_id: d.mvp_user_id })
      .eq("match_id", d.match_id);
    if (error) throw new Error(`match_details ${d.match_id}: ${error.message}`);
  }
  // 3) player_season_mmr + profiles.mmr_atual
  for (const [uid, mmr] of current) {
    const st = stat.get(uid)!;
    const { error: e1 } = await sb
      .from("player_season_mmr")
      .update({
        mmr,
        vitorias: st.w,
        derrotas: st.l,
        partidas_total: st.games,
        placements_played: st.games,
        calibrated: st.games > 0,
        peak_mmr: st.peak,
        mvps: st.mvps,
      })
      .eq("season_id", season.id)
      .eq("user_id", uid);
    if (e1) throw new Error(`player_season_mmr ${uid}: ${e1.message}`);
    // Corrige o mmr_inicial poluido (backfill 126) pro seed VERDADEIRO da medalha,
    // e sincroniza mmr_atual com o MMR final da season.
    const { error: e2 } = await sb
      .from("profiles")
      .update({ mmr_inicial: seedOf.get(uid)!, mmr_atual: mmr })
      .eq("id", uid);
    if (e2) throw new Error(`profiles ${uid}: ${e2.message}`);
  }
  console.log("OK — recompute aplicado.");
}

main().catch((err) => {
  console.error("recompute falhou:", err);
  process.exit(1);
});
