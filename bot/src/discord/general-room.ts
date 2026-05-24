// Gerencia a sala geral de voice (on-demand).
//
// A sala geral é criada quando o primeiro aluno entra em fila e destruída
// quando a fila fica vazia e não há matches ativas. Ela serve como ponto
// de encontro pré-partida entre PRO e alunos.
//
// Nome fixo da sala: "FORMULADOTA — Fila"
// Apenas um canal geral por vez no servidor.

import { ChannelType, type Guild, type VoiceChannel } from "discord.js";

const GENERAL_ROOM_NAME = "FORMULADOTA — Fila";

/**
 * Busca o canal geral pelo nome fixo.
 * Retorna o VoiceChannel se encontrado, null caso contrário.
 */
function findGeneralRoom(guild: Guild): VoiceChannel | null {
  const channel = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildVoice &&
      c.name === GENERAL_ROOM_NAME
  );
  return (channel as VoiceChannel) ?? null;
}

/**
 * Garante que a sala geral existe.
 * Cria se não existir. Retorna channelId + flags de existência/criação.
 */
export async function ensureGeneralRoom(guild: Guild): Promise<{
  channelId: string;
  existed: boolean;
  created: boolean;
}> {
  // Verifica se já existe antes de criar
  const existing = findGeneralRoom(guild);
  if (existing) {
    return { channelId: existing.id, existed: true, created: false };
  }

  // Obtém categoria opcional via env
  const categoryId = process.env.DISCORD_VOICE_CATEGORY_ID ?? null;

  const channel = await guild.channels.create({
    name: GENERAL_ROOM_NAME,
    type: ChannelType.GuildVoice,
    parent: categoryId ?? undefined,
  });

  console.log(`[general-room] Sala geral criada: ${channel.id}`);
  return { channelId: channel.id, existed: false, created: true };
}

/**
 * Apaga a sala geral se existir.
 * Retorna true se apagou, false se não havia sala.
 */
export async function destroyGeneralRoom(guild: Guild): Promise<boolean> {
  const channel = findGeneralRoom(guild);
  if (!channel) {
    return false;
  }

  await channel.delete("Fila vazia — sala geral removida.");
  console.log(`[general-room] Sala geral apagada.`);
  return true;
}
