// Gerencia salas temporárias de partida.
//
// Quando PRO inicia partida: cria canal temp + move 5 players pra lá.
// Quando PRO finaliza partida: move players de volta pra sala geral + apaga canal.
//
// Cada match tem seu próprio canal temporário identificado pelo channelId
// (salvo no DB como voice_channel_id_discord).

import { ChannelType, type Guild, type VoiceChannel } from "discord.js";
import { ensureGeneralRoom } from "./general-room.js";
import { moveUsers } from "./move-users.js";

/**
 * Cria um voice channel temporário para a partida.
 * Move os usuários informados para o canal criado.
 * Retorna channelId + número de usuários movidos.
 */
export async function createMatchRoom(
  guild: Guild,
  customName: string,
  userDiscordIds: string[]
): Promise<{ channelId: string; movedCount: number }> {
  const categoryId = process.env.DISCORD_VOICE_CATEGORY_ID ?? null;

  // userLimit: PRO + 4 alunos = 5
  const channel = await guild.channels.create({
    name: customName,
    type: ChannelType.GuildVoice,
    userLimit: 5,
    parent: categoryId ?? undefined,
  });

  console.log(`[match-room] Sala criada: "${customName}" (${channel.id})`);

  // Tenta mover todos os usuários pra sala nova
  const movedCount = await moveUsers(guild, userDiscordIds, channel.id);

  console.log(
    `[match-room] ${movedCount}/${userDiscordIds.length} usuários movidos.`
  );

  return { channelId: channel.id, movedCount };
}

/**
 * Destrói um voice channel temporário de partida.
 * Antes de apagar: move usuários que ainda estiverem lá de volta pra sala geral.
 * Retorna true se apagou o canal, false se não encontrou.
 */
export async function destroyMatchRoom(
  guild: Guild,
  channelId: string
): Promise<boolean> {
  const channel = guild.channels.cache.get(channelId) as
    | VoiceChannel
    | undefined;

  if (!channel) {
    console.log(`[match-room] Canal ${channelId} não encontrado — pode já ter sido apagado.`);
    return false;
  }

  // Move usuários que ainda estiverem no canal de volta pra sala geral
  const usersInChannel = [...channel.members.values()];
  if (usersInChannel.length > 0) {
    // Garante que sala geral existe antes de mover
    const { channelId: generalId } = await ensureGeneralRoom(guild);

    const moveResults = await Promise.all(
      usersInChannel.map((member) =>
        member.voice.setChannel(generalId).catch((err: unknown) => {
          console.error(
            `[match-room] Erro ao mover ${member.user.tag} pra sala geral:`,
            (err as Error).message
          );
        })
      )
    );

    console.log(
      `[match-room] ${moveResults.length} usuários movidos de volta pra sala geral.`
    );
  }

  await channel.delete("Partida finalizada — sala temp removida.");
  console.log(`[match-room] Canal ${channelId} apagado.`);
  return true;
}
