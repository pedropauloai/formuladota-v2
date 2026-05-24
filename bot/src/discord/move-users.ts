// Helper: mover membros entre voice channels.
//
// Nota importante: só é possível mover um membro se ele já estiver em algum
// voice channel do servidor. Se o membro não estiver em voice, a operação
// é ignorada silenciosamente (não gera erro — é comportamento esperado).

import type { Guild } from "discord.js";

/**
 * Tenta mover um usuário para um voice channel específico.
 * Retorna true se moveu com sucesso, false se o usuário não estava em voice.
 */
export async function moveUser(
  guild: Guild,
  discordUserId: string,
  targetChannelId: string
): Promise<boolean> {
  try {
    // Fetch com cache: força buscar do Discord se não estiver em cache
    const member = await guild.members.fetch(discordUserId).catch(() => null);

    if (!member) {
      console.log(`[move-users] Membro ${discordUserId} não encontrado no servidor.`);
      return false;
    }

    // Usuário deve estar em algum voice channel para poder ser movido
    if (!member.voice.channel) {
      console.log(
        `[move-users] Usuário ${member.user.tag} não está em voice — ignorando.`
      );
      return false;
    }

    await member.voice.setChannel(targetChannelId);
    console.log(
      `[move-users] Moveu ${member.user.tag} → canal ${targetChannelId}.`
    );
    return true;
  } catch (err) {
    // Erros de permissão ou rate limit — logar e continuar
    console.error(
      `[move-users] Erro ao mover usuário ${discordUserId}:`,
      (err as Error).message
    );
    return false;
  }
}

/**
 * Tenta mover múltiplos usuários para um canal.
 * Retorna o número de usuários movidos com sucesso.
 */
export async function moveUsers(
  guild: Guild,
  discordUserIds: string[],
  targetChannelId: string
): Promise<number> {
  const results = await Promise.all(
    discordUserIds.map((id) => moveUser(guild, id, targetChannelId))
  );
  return results.filter(Boolean).length;
}
