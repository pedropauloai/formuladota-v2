// Servidor HTTP Express — recebe comandos da plataforma Next.js.
// Todas as rotas (exceto /health) exigem header x-api-key correto.

import express from "express";
import { requireApiKey } from "./middleware/auth.js";
import { generalRoomRouter } from "./routes/general-room.js";
import { matchRoomRouter } from "./routes/match-room.js";
import { discordClient } from "../discord/client.js";

const app = express();
app.use(express.json());

// Health check público — Railway usa pra saber se o serviço está de pé
app.get("/health", (_req, res) => {
  const isReady = discordClient.isReady();
  const guildId = process.env.DISCORD_GUILD_ID ?? "";
  const guildCached = isReady && !!discordClient.guilds.cache.get(guildId);

  res.status(isReady ? 200 : 503).json({
    ok: isReady,
    discord: isReady,
    guildReady: guildCached,
    tag: discordClient.user?.tag ?? null,
  });
});

// Rotas protegidas
app.use("/api/general-room", requireApiKey, generalRoomRouter);
app.use("/api/match-room", requireApiKey, matchRoomRouter);

// Rota não encontrada
app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

/**
 * Inicia o servidor HTTP na porta configurada.
 */
export function startHttpServer(): void {
  const port = Number(process.env.PORT ?? 8080);

  app.listen(port, () => {
    console.log(`[http] Servidor HTTP escutando na porta ${port}`);
  });
}
