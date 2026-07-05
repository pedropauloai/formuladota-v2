// Rota HTTP de presença em voz — usada pelo GATE DE FILA do site.
//
// POST /api/voice/presence
//   Body: { channelId: string, discordIds: string[] }
//   Resposta: { present: string[], missing: string[] }
//   Diz quais dos discordIds estão AGORA conectados no canal de voz informado
//   (tipicamente o 🎧丨Buscando Partida). Lê o voiceState cache (intent
//   GuildVoiceStates já ativo no client).

import { Router } from "express";
import { ChannelType, type VoiceChannel } from "discord.js";
import { discordClient } from "../../discord/client.js";

export const voiceRouter = Router();

voiceRouter.post("/presence", async (req, res): Promise<void> => {
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

  const body = (req.body ?? {}) as { channelId?: unknown; discordIds?: unknown };
  const channelId = body.channelId;
  if (typeof channelId !== "string" || !/^\d{17,20}$/.test(channelId)) {
    res.status(400).json({ error: "channelId inválido." });
    return;
  }
  if (!Array.isArray(body.discordIds)) {
    res.status(400).json({ error: "discordIds deve ser um array." });
    return;
  }
  const ids = body.discordIds.filter((x): x is string => typeof x === "string");

  const channel = guild.channels.cache.get(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    res.status(404).json({ error: "Canal de voz não encontrado." });
    return;
  }

  // .members de um VoiceChannel = quem está conectado AGORA (voice state cache).
  const connected = (channel as VoiceChannel).members;
  const present = ids.filter((id) => connected.has(id));
  const missing = ids.filter((id) => !connected.has(id));
  res.status(200).json({ present, missing });
});
