/**
 * RE-SEED dos jogadores SEM partida (partidas_total=0) da temporada ativa pro seed PURO
 * da medalha Valve. One-off idempotente (Pedro 2026-07-06): reverte o reset −20% que foi
 * aplicado durante a temporada — o reset agora vale SÓ na virada (applySeasonDecay).
 *
 * Os jogadores COM partida são cobertos pelo recompute-season-mmr.ts (replay). Este script
 * cuida só de quem nunca jogou: MMR = seedMmrFromRankTier(career.rankTier) — puro, sem
 * retenção. Sem medalha → STARTING_MMR (1000).
 *
 * USO:
 *   npx tsx scripts/reseed-idle-players.ts           # DRY-RUN (só imprime o diff)
 *   npx tsx scripts/reseed-idle-players.ts --apply    # grava de verdade
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedMmrFromRankTier, STARTING_MMR } from "../src/lib/mmr";

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

async function main() {
  const { data: season } = await sb.from("seasons").select("id, name").eq("active", true).maybeSingle();
  if (!season) throw new Error("sem temporada ativa");

  // Jogadores da season SEM partida.
  const { data: idle } = await sb
    .from("player_season_mmr")
    .select("user_id, mmr")
    .eq("season_id", season.id)
    .eq("partidas_total", 0);
  const rows = (idle ?? []) as { user_id: string; mmr: number }[];
  if (rows.length === 0) {
    console.log("nenhum jogador idle — nada a re-seedar.");
    return;
  }

  // Medalha (career.rankTier) de cada um.
  const ids = rows.map((r) => r.user_id);
  const { data: careerRows } = await sb
    .from("user_stats_extended")
    .select("user_id, career")
    .in("user_id", ids);
  const rankTierOf = new Map<string, number | null>();
  for (const c of (careerRows ?? []) as { user_id: string; career: { rankTier?: number | null } | null }[]) {
    rankTierOf.set(c.user_id, typeof c.career?.rankTier === "number" ? c.career.rankTier : null);
  }

  console.log(`\n=== RE-SEED idle season ${season.name} (${rows.length} jogadores) ===`);
  console.log(APPLY ? ">>> MODO --apply (grava)\n" : ">>> DRY-RUN (não grava; use --apply)\n");
  const plan = rows
    .map((r) => {
      const seed = seedMmrFromRankTier(rankTierOf.get(r.user_id) ?? null) ?? STARTING_MMR;
      return { uid: r.user_id, before: r.mmr, after: seed, diff: seed - r.mmr };
    })
    .sort((a, b) => b.after - a.after);
  for (const p of plan) {
    console.log(p.uid.padEnd(38), String(p.before).padStart(6), "→", String(p.after).padStart(6), `(${p.diff >= 0 ? "+" : ""}${p.diff})`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN concluído. Rode com --apply pra gravar.");
    return;
  }

  console.log("\ngravando...");
  for (const p of plan) {
    const { error: e1 } = await sb
      .from("player_season_mmr")
      .update({ mmr: p.after, peak_mmr: p.after })
      .eq("season_id", season.id)
      .eq("user_id", p.uid);
    if (e1) throw new Error(`player_season_mmr ${p.uid}: ${e1.message}`);
    const { error: e2 } = await sb
      .from("profiles")
      .update({ mmr_inicial: p.after, mmr_atual: p.after })
      .eq("id", p.uid);
    if (e2) throw new Error(`profiles ${p.uid}: ${e2.message}`);
  }
  console.log("OK — re-seed aplicado.");
}

main().catch((err) => {
  console.error("reseed falhou:", err);
  process.exit(1);
});
