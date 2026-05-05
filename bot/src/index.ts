// Bot Steam FORMULADOTA — Phase 5 H3.1-H3.6
// Roda 24/7 em Railway Hobby (~$3/mês). Cria lobbies Dota 2 customizados,
// captura match_id ao final, comunica com app via API interna key-auth.
//
// Auth Steam: refresh JWT (200 dias) via steam-user.
// 2FA: TOTP gerado de STEAM_SHARED_SECRET via steam-totp.
// Setup inicial: rodar npm run setup-once pra primeiro login + gerar refresh token.

import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { startSteamClient, type SteamBotState } from "./steam-client.js";
import {
  createLobbyHandler,
  captureMatchHandler,
  inviteToLobbyHandler,
} from "./handlers.js";

const PORT = Number(process.env.PORT ?? 8080);
const BOT_API_KEY = requireEnv("BOT_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`[bot] env var ausente: ${key}`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let botState: SteamBotState | null = null;

async function main(): Promise<void> {
  console.log("[bot] starting FORMULADOTA Steam bot...");

  // Conecta Steam + Dota 2 GC
  botState = await startSteamClient({
    accountName: requireEnv("STEAM_ACCOUNT_NAME"),
    refreshToken: process.env.STEAM_REFRESH_TOKEN,
    sharedSecret: process.env.STEAM_SHARED_SECRET,
    password: process.env.STEAM_PASSWORD,
    dataDir: process.env.STEAM_DATA_DIR ?? "/data",
  });

  console.log("[bot] Steam + Dota GC ready");

  // HTTP API interna — recebe POST do app pra criar lobby
  const server = createServer(async (req, res) => {
    // CORS / health
    if (req.method === "GET" && req.url === "/health") {
      const ready = botState?.dota.connected === true;
      res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: ready, steam: !!botState, dota: ready }));
      return;
    }

    // Auth — header Authorization Bearer ${BOT_API_KEY}
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${BOT_API_KEY}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString("utf8")));
    req.on("end", async () => {
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
        return;
      }

      try {
        if (req.url === "/lobby/create") {
          const result = await createLobbyHandler(supabase, botState!, body);
          res.writeHead(result.ok ? 200 : 500, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }
        if (req.url === "/lobby/capture-match") {
          const result = await captureMatchHandler(supabase, botState!, body);
          res.writeHead(result.ok ? 200 : 500, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }
        if (req.url === "/lobby/invite") {
          const result = await inviteToLobbyHandler(botState!, body);
          res.writeHead(result.ok ? 200 : 500, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "route not found" }));
      } catch (err) {
        console.error("[bot] handler erro:", err);
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "internal error" }));
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[bot] HTTP API listening :${PORT}`);
  });
}

main().catch((err) => {
  console.error("[bot] fatal:", err);
  process.exit(1);
});

// Graceful shutdown — preserva refresh token em volume
process.on("SIGTERM", () => {
  console.log("[bot] SIGTERM, encerrando...");
  botState?.steam.logOff();
  process.exit(0);
});
