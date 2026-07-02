/**
 * Backfill de MMR das partidas já jogadas na temporada ativa.
 *
 * Reconstrói do zero: zera player_season_mmr da season ativa, reseta o
 * mmr_applied_at das partidas, e reaplica applyMatchMmr em ORDEM CRONOLÓGICA
 * (o delta depende do MMR corrente, que depende das partidas anteriores).
 *
 * Uso: npx tsx scripts/backfill-mmr.ts
 *
 * One-off: rodar depois de a beta passar a contar MMR (2026-07-02). Idempotente
 * (pode rodar de novo — sempre limpa e reconstrói). Carrega .env.local à mão.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { applyMatchMmr } from "../src/lib/queries/apply-match-mmr";

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && m[1] !== undefined && m[2] !== undefined) {
          out[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* arquivo ausente — ok */
    }
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltam SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Season ativa (a beta agora conta).
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("active", true)
    .maybeSingle();
  if (!season) {
    console.error("[backfill] sem temporada ativa");
    process.exit(1);
  }
  console.log(`[backfill] temporada ativa: ${season.name} (id=${season.id})`);

  // 1) Limpa o estado da season pra reconstruir sem contagem dupla.
  const { error: delErr } = await supabase
    .from("player_season_mmr")
    .delete()
    .eq("season_id", season.id);
  if (delErr) throw new Error(`limpar player_season_mmr: ${delErr.message}`);
  console.log("[backfill] player_season_mmr da season zerado");

  // 2) Partidas realizadas em ordem cronológica + reset da idempotência.
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, dota_match_id, created_at")
    .order("created_at", { ascending: true });
  if (mErr) throw new Error(`buscar matches: ${mErr.message}`);
  const list = matches ?? [];
  console.log(`[backfill] ${list.length} partida(s) a reaplicar`);

  const ids = list.map((m) => m.id);
  if (ids.length) {
    const { error: resetErr } = await supabase
      .from("matches")
      .update({ mmr_applied_at: null })
      .in("id", ids);
    if (resetErr) throw new Error(`reset mmr_applied_at: ${resetErr.message}`);
  }

  // 3) Reaplica em ordem.
  for (const m of list) {
    const res = await applyMatchMmr(supabase as never, m.id);
    console.log(`[backfill] ${m.dota_match_id ?? m.id}: ${JSON.stringify(res)}`);
  }

  console.log("[backfill] concluído");
  process.exit(0);
}

void main();
