// Discord client singleton.
// Intents mínimos necessários:
//   Guilds: ver canais do servidor
//   GuildVoiceStates: ler/escrever estado de voz dos membros (mover users)
//   GuildMembers: fetch de member por ID (necessário pra guild.members.fetch)

import { Client, GatewayIntentBits } from "discord.js";

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

/**
 * Faz login do bot e aguarda o evento 'ready'.
 * Lança erro se DISCORD_BOT_TOKEN não estiver definido.
 */
export async function loginBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("[bot] DISCORD_BOT_TOKEN não definido.");
  }

  await new Promise<void>((resolve, reject) => {
    discordClient.once("ready", () => {
      console.log(`[bot] Discord conectado como: ${discordClient.user?.tag}`);
      resolve();
    });

    discordClient.once("error", (err) => {
      reject(err);
    });

    discordClient.login(token).catch(reject);
  });
}
