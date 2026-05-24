// Rotas HTTP para gerenciamento da sala geral.
//
// POST /api/general-room/ensure
//   Garante que a sala geral existe (cria se necessário).
//   Resposta: { channelId, existed, created }
//
// DELETE /api/general-room
//   Apaga a sala geral.
//   Pré-condição (verificada pelo caller): sem matches ativas e fila vazia.
//   Resposta: { deleted: bool }

import { Router } from "express";
import { discordClient } from "../../discord/client.js";
import { ensureGeneralRoom, destroyGeneralRoom } from "../../discord/general-room.js";

export const generalRoomRouter = Router();

generalRoomRouter.post("/ensure", async (_req, res): Promise<void> => {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    res.status(500).json({ error: "DISCORD_GUILD_ID não configurado." });
    return;
  }

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    res.status(503).json({ error: "Guild não encontrada — bot pode não estar pronto." });
    return;
  }

  try {
    const result = await ensureGeneralRoom(guild);
    res.status(200).json(result);
  } catch (err) {
    console.error("[general-room/ensure] Erro:", (err as Error).message);
    res.status(500).json({ error: "Erro ao criar sala geral." });
  }
});

generalRoomRouter.delete("/", async (_req, res): Promise<void> => {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    res.status(500).json({ error: "DISCORD_GUILD_ID não configurado." });
    return;
  }

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    res.status(503).json({ error: "Guild não encontrada." });
    return;
  }

  try {
    const deleted = await destroyGeneralRoom(guild);
    res.status(200).json({ deleted });
  } catch (err) {
    console.error("[general-room/delete] Erro:", (err as Error).message);
    res.status(500).json({ error: "Erro ao apagar sala geral." });
  }
});
