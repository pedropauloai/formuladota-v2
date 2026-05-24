// Rotas HTTP para gerenciamento de salas temporárias de partida.
//
// POST /api/match-room/create
//   Cria voice channel temp + move usuários.
//   Body: { customName: string, userDiscordIds: string[] }
//   Resposta: { channelId, movedCount }
//
// DELETE /api/match-room/:channelId
//   Move usuários de volta pra sala geral + apaga canal temp.
//   Resposta: { deleted: bool }

import { Router } from "express";
import { discordClient } from "../../discord/client.js";
import { createMatchRoom, destroyMatchRoom } from "../../discord/match-room.js";
import { CreateMatchRoomBodySchema } from "../../types.js";

export const matchRoomRouter = Router();

matchRoomRouter.post("/create", async (req, res): Promise<void> => {
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

  const parsed = CreateMatchRoomBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos." });
    return;
  }

  try {
    const result = await createMatchRoom(
      guild,
      parsed.data.customName,
      parsed.data.userDiscordIds
    );
    res.status(200).json(result);
  } catch (err) {
    console.error("[match-room/create] Erro:", (err as Error).message);
    res.status(500).json({ error: "Erro ao criar sala de partida." });
  }
});

matchRoomRouter.delete("/:channelId", async (req, res): Promise<void> => {
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

  const { channelId } = req.params;

  if (!channelId || !/^\d{17,20}$/.test(channelId)) {
    res.status(400).json({ error: "channelId inválido." });
    return;
  }

  try {
    const deleted = await destroyMatchRoom(guild, channelId);
    res.status(200).json({ deleted });
  } catch (err) {
    console.error("[match-room/delete] Erro:", (err as Error).message);
    res.status(500).json({ error: "Erro ao apagar sala de partida." });
  }
});
