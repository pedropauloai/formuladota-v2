/**
 * Finaliza uma partida de MATCHMAKING manualmente: registra o placar no histórico
 * (matches + match_players + match_details via OpenDota) e fecha o lobby, liberando
 * os jogadores da rota da partida. Reusa o core src/lib/dota/finalize-match.ts.
 *
 * Uso: npx tsx scripts/finalize-match.ts <lobby_id>
 *
 * One-off/manutenção enquanto o fluxo automático (fim de partida → finalize) não
 * está ligado. Carrega .env.local à mão (o projeto não usa dotenv).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { finalizeMatchmakingLobby } from "../src/lib/dota/finalize-match";

// Carrega .env.local (KEY=VALUE por linha) sem dep externa.
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
  const lobbyId = process.argv[2];
  if (!lobbyId) {
    console.error("Uso: npx tsx scripts/finalize-match.ts <lobby_id>");
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltam SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  console.log(`[finalize] processando lobby ${lobbyId}...`);
  const res = await finalizeMatchmakingLobby(supabase, lobbyId);
  console.log("[finalize] resultado:", JSON.stringify(res, null, 2));
  process.exit(res.success ? 0 : 1);
}

void main();
