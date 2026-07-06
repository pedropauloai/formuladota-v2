// Gerencia salas temporárias de partida.
//
// Quando PRO inicia partida: cria canal temp + move 5 players pra lá.
// Quando PRO finaliza partida: move players de volta pra sala geral + apaga canal.
//
// Cada match tem seu próprio canal temporário identificado pelo channelId
// (salvo no DB como voice_channel_id_discord).

import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type OverwriteResolvable,
  type VoiceChannel,
} from "discord.js";
import { ensureGeneralRoom } from "./general-room.js";
import { moveUsers } from "./move-users.js";

/**
 * Permissões pra deixar a sala de voz PRIVADA do time: @everyone NÃO conecta,
 * só os discord_id dos jogadores daquele time. Evita que estranhos entrem e
 * atrapalhem a partida (Pedro 2026-07-06). Por overwrite (não por cargo): some
 * junto com o canal no teardown — zero cargo órfão pra limpar. IDs de quem não
 * está no servidor são ignorados pelo Discord (sem erro).
 */
function privateVoiceOverwrites(guild: Guild, memberIds: string[]): OverwriteResolvable[] {
  const uniq = [...new Set(memberIds)];
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
    ...uniq.map((id) => ({ id, allow: [PermissionFlagsBits.Connect] })),
  ];
}

/** Acha a categoria 🔊丨VOZ (ou a do env DISCORD_VOICE_CATEGORY_ID) pra criar as salas de time. */
function vozCategoryId(guild: Guild): string | undefined {
  const fromEnv = process.env.DISCORD_VOICE_CATEGORY_ID;
  if (fromEnv) return fromEnv;
  const cat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.includes("VOZ"),
  );
  return cat?.id;
}

/** Acha o canal de voz 🌍丨Geral (destino ao apagar as salas de time). */
function geralVoiceId(guild: Guild): string | null {
  const ch = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildVoice && c.name.includes("Geral"),
  );
  return ch?.id ?? null;
}

/**
 * Cria as DUAS salas de voz da partida (Iluminados/Temidos), move cada time pra
 * sua sala (best-effort — só quem já está em voz) e devolve os IDs.
 */
export async function createTeamRooms(
  guild: Guild,
  matchId: string,
  radiantDiscordIds: string[],
  direDiscordIds: string[],
): Promise<{ iluminadosId: string; temidosId: string }> {
  const parent = vozCategoryId(guild);
  const tag = matchId.slice(-4);

  const iluminados = await guild.channels.create({
    name: `🟢丨Iluminados #${tag}`,
    type: ChannelType.GuildVoice,
    userLimit: 5,
    parent,
    permissionOverwrites: privateVoiceOverwrites(guild, radiantDiscordIds),
  });
  const temidos = await guild.channels.create({
    name: `🔴丨Temidos #${tag}`,
    type: ChannelType.GuildVoice,
    userLimit: 5,
    parent,
    permissionOverwrites: privateVoiceOverwrites(guild, direDiscordIds),
  });
  console.log(`[team-rooms] criadas Iluminados(${iluminados.id}) + Temidos(${temidos.id}) p/ ${matchId}`);

  const [mv1, mv2] = await Promise.all([
    moveUsers(guild, radiantDiscordIds, iluminados.id),
    moveUsers(guild, direDiscordIds, temidos.id),
  ]);
  console.log(`[team-rooms] movidos ${mv1}+${mv2} jogadores.`);

  return { iluminadosId: iluminados.id, temidosId: temidos.id };
}

/**
 * Apaga as salas de time: move quem ainda estiver nelas pro 🌍丨Geral e deleta.
 * Retorna quantas foram apagadas. Idempotente (ignora canal inexistente).
 */
export async function destroyTeamRooms(guild: Guild, channelIds: string[]): Promise<number> {
  const geral = geralVoiceId(guild);
  let deleted = 0;
  for (const id of channelIds) {
    const ch = guild.channels.cache.get(id) as VoiceChannel | undefined;
    if (!ch) continue;
    const members = [...ch.members.values()];
    if (members.length > 0 && geral) {
      await Promise.all(
        members.map((m) =>
          m.voice.setChannel(geral).catch((e: unknown) =>
            console.error(`[team-rooms] mover ${m.user.tag}→Geral:`, (e as Error).message),
          ),
        ),
      );
    }
    await ch.delete("Partida finalizada — sala de time removida.").catch(() => {});
    deleted++;
  }
  return deleted;
}

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
