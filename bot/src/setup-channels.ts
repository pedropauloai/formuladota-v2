/**
 * setup-channels.ts — Renova a estrutura de canais do servidor Discord FORMULADOTA.
 * =================================================================================
 * Roda UMA vez, na sua máquina (o token fica local):
 *     cd bot && npm install && npx tsx src/setup-channels.ts
 *
 * O que faz, em ordem:
 *  1. ARQUIVA os canais atuais: cria a categoria "🗄丨ARQUIVO" (oculta de @everyone) e move
 *     TODOS os canais existentes pra lá. Preserva o histórico — NADA é apagado.
 *  2. Cria a estrutura NOVA (categorias + canais de texto/voz) na ordem definida.
 *  3. Cria WEBHOOKS nos canais 🔎丨fila e 📊丨resultados e imprime as URLs (pra a plataforma postar).
 *  4. Cria um CONVITE permanente no 👋丨bem-vindo e imprime (pra corrigir o link da home).
 *
 * Pré-requisitos:
 *  - DISCORD_BOT_TOKEN e DISCORD_GUILD_ID no bot/.env
 *  - O bot precisa estar NO servidor com a permissão "Gerenciar Canais" (Manage Channels)
 *    e "Criar Convite Instantâneo". O mais simples: dê o cargo de Admin pro bot.
 *
 * Segurança: se a categoria "📥丨ENTRADA" já existir, o script ABORTA (pra não duplicar).
 */
import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD_ID) {
  console.error("[setup] Defina DISCORD_BOT_TOKEN e DISCORD_GUILD_ID no bot/.env.");
  process.exit(1);
}

// Estrutura nova. T = texto, V = voz.
type Ch = { name: string; type: "T" | "V" };
const STRUCTURE: { category: string; channels: Ch[] }[] = [
  {
    category: "📥丨ENTRADA",
    channels: [
      { name: "👋丨bem-vindo", type: "T" },
      { name: "📜丨doutrina", type: "T" },
      { name: "📢丨comunicados", type: "T" },
      { name: "🪪丨cargos", type: "T" },
      { name: "🆘丨suporte", type: "T" },
    ],
  },
  {
    category: "🎮丨JOGAR",
    channels: [
      { name: "💬丨bate-papo", type: "T" },
      { name: "🔎丨fila", type: "T" },
      { name: "📊丨resultados", type: "T" },
      { name: "🏆丨ranking-honor", type: "T" },
    ],
  },
  {
    category: "🔊丨PARTIDAS",
    channels: [
      { name: "🟢丨Iluminados 1", type: "V" },
      { name: "🔴丨Temidos 1", type: "V" },
      { name: "🟢丨Iluminados 2", type: "V" },
      { name: "🔴丨Temidos 2", type: "V" },
      { name: "🎥丨Gravando", type: "V" },
    ],
  },
  {
    category: "🔊丨COMUNIDADE",
    channels: [
      { name: "🌍丨Geral", type: "V" },
      { name: "🕹丨Modinho", type: "V" },
    ],
  },
  {
    category: "👑丨PRO / LIGA",
    channels: [
      { name: "🎓丨pro", type: "T" },
      { name: "🥇丨liga-mistico", type: "T" },
      { name: "🗓丨temporadas", type: "T" },
    ],
  },
  {
    category: "🛠丨ADMIN",
    channels: [
      { name: "🤖丨bot-logs", type: "T" },
      { name: "📝丨feedback", type: "T" },
      { name: "🔒丨admin", type: "T" },
    ],
  },
];

const WEBHOOK_CHANNELS = new Set(["🔎丨fila", "📊丨resultados"]);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    // Guard de idempotência.
    if (
      guild.channels.cache.some(
        (c) => c.type === ChannelType.GuildCategory && c.name === "📥丨ENTRADA"
      )
    ) {
      console.error("[setup] Já existe a categoria '📥丨ENTRADA' — parece que já rodou. Abortando.");
      await client.destroy();
      process.exit(1);
    }

    // 1) Arquiva os canais atuais (move pra uma categoria oculta — não apaga nada).
    const existing = [...guild.channels.cache.values()].filter(
      (c) => c.type !== ChannelType.GuildCategory
    );
    const archive = await guild.channels.create({
      name: "🗄丨ARQUIVO",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ],
    });
    for (const ch of existing) {
      try {
        await ch.setParent(archive.id, { lockPermissions: true });
        console.log(`[setup] arquivado: ${ch.name}`);
      } catch (e) {
        console.log(`[setup] não consegui arquivar ${ch.name}: ${(e as Error).message}`);
      }
    }

    // 2/3/4) Cria a estrutura nova + webhooks + convite.
    const webhookUrls: string[] = [];
    let welcomeId: string | null = null;

    let pos = 0;
    for (const block of STRUCTURE) {
      const cat = await guild.channels.create({
        name: block.category,
        type: ChannelType.GuildCategory,
        position: pos++,
      });
      for (const ch of block.channels) {
        const created = await guild.channels.create({
          name: ch.name,
          type: ch.type === "V" ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: cat.id,
        });
        console.log(`[setup] criado: ${block.category} / ${ch.name}`);

        if (ch.name === "👋丨bem-vindo") welcomeId = created.id;

        if (WEBHOOK_CHANNELS.has(ch.name) && created.type === ChannelType.GuildText) {
          const wh = await (created as TextChannel).createWebhook({ name: "FormulaDota" });
          webhookUrls.push(`${ch.name}: ${wh.url}`);
        }
      }
    }

    // Joga o ARQUIVO pro fim da lista.
    try {
      await archive.setPosition(STRUCTURE.length + 1);
    } catch {
      /* ordem é cosmética */
    }

    // Convite permanente no bem-vindo (pra corrigir o link da home).
    let inviteUrl = "(não gerado)";
    if (welcomeId) {
      const inv = await guild.invites.create(welcomeId, { maxAge: 0, maxUses: 0 });
      inviteUrl = `https://discord.gg/${inv.code}`;
    }

    console.log("\n=================================================================");
    console.log("[setup] ✅ PRONTO. Estrutura nova criada; canais antigos em '🗄丨ARQUIVO' (ocultos).");
    console.log("\n[setup] CONVITE PERMANENTE (use no link do Discord na home):");
    console.log("   " + inviteUrl);
    console.log("\n[setup] WEBHOOKS (são SEGREDOS — guarde pra a plataforma postar nesses canais):");
    for (const w of webhookUrls) console.log("   " + w);
    console.log("=================================================================\n");

    await client.destroy();
    process.exit(0);
  } catch (e) {
    console.error("[setup] Falha:", (e as Error).message);
    console.error("[setup] Confira se o bot está no servidor com permissão 'Gerenciar Canais'.");
    process.exit(1);
  }
});

client.login(TOKEN);
