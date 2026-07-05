/**
 * setup-channels.ts — Estrutura ENXUTA do servidor Discord FORMULADOTA (v2, 2026-07-05).
 * ==================================================================================
 * Roda na SUA máquina (o token fica local), quantas vezes quiser (é re-executável):
 *     cd bot && pnpm install && pnpm exec tsx src/setup-channels.ts
 *   (o bot usa pnpm — NÃO rode `npm install` aqui, corrompe o node_modules pnpm)
 *
 * O que faz (RECONCILIA — não aborta se já existe):
 *  1. Garante cada categoria + canal da estrutura NOVA (cria o que falta, reaproveita
 *     o que já existe) e aplica as PERMISSÕES de cada um (read-only, aberto, oculto).
 *  2. Cria/reaproveita WEBHOOKS em 🔎丨fila, 📊丨resultados e 🆕丨atualizacoes e imprime as URLs.
 *  3. Cria/reaproveita um CONVITE permanente no 👋丨bem-vindo e imprime.
 *  4. Semeia conteúdo em 👋丨bem-vindo e 📜丨doutrina — SÓ se o canal estiver vazio.
 *  5. Imprime o ID do canal de voz 🎧丨Buscando Partida (use no gate de fila do site/bot).
 *  6. ARQUIVA (não apaga) qualquer canal fora da estrutura, movendo pra 🗄丨ARQUIVO oculto.
 *     Você pode apagar a categoria 🗄丨ARQUIVO manualmente no Discord depois de conferir.
 *
 * Pré-requisitos: DISCORD_BOT_TOKEN + DISCORD_GUILD_ID no bot/.env, e o bot no servidor
 * com permissão de Administrador (mais simples) ou "Gerenciar Canais" + "Criar Convite".
 */
import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
  type GuildChannel,
  type TextChannel,
  type Guild,
} from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD_ID) {
  console.error("[setup] Defina DISCORD_BOT_TOKEN e DISCORD_GUILD_ID no bot/.env.");
  process.exit(1);
}

// Modo de acesso de cada canal:
//  readonly = @everyone LÊ mas não escreve (avisos/feeds). Webhooks postam mesmo assim.
//  open     = @everyone lê e escreve (bate-papo).
//  hidden   = @everyone NÃO vê (só admin/bot com Administrador).
//  voice    = canal de voz, todos conectam.
type Access = "readonly" | "open" | "hidden" | "voice";
type Ch = { name: string; access: Access; webhook?: boolean };

const STRUCTURE: { category: string; channels: Ch[] }[] = [
  {
    category: "📥丨ENTRADA",
    channels: [
      { name: "👋丨bem-vindo", access: "readonly" },
      { name: "📜丨doutrina", access: "readonly" },
      { name: "📢丨avisos", access: "readonly" },
      { name: "🆕丨atualizacoes", access: "readonly", webhook: true },
    ],
  },
  {
    category: "🎮丨JOGAR",
    channels: [
      { name: "💬丨bate-papo", access: "open" },
      { name: "🔎丨fila", access: "readonly", webhook: true },
      { name: "📊丨resultados", access: "readonly", webhook: true },
    ],
  },
  {
    category: "🔊丨VOZ",
    channels: [
      { name: "🎧丨Buscando Partida", access: "voice" },
      { name: "🌍丨Geral", access: "voice" },
    ],
  },
  {
    category: "🛠丨ADMIN",
    channels: [{ name: "🤖丨bot-logs", access: "hidden" }],
  },
];

const BUSCANDO_PARTIDA = "🎧丨Buscando Partida";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

/** Overwrites de permissão pro @everyone conforme o modo de acesso. */
function overwritesFor(guild: Guild, access: Access) {
  const everyone = guild.roles.everyone.id;
  switch (access) {
    case "readonly":
      return [{ id: everyone, deny: [PermissionFlagsBits.SendMessages] }];
    case "hidden":
      return [{ id: everyone, deny: [PermissionFlagsBits.ViewChannel] }];
    case "open":
    case "voice":
      // Mantém o default do servidor (todos veem/escrevem/conectam).
      return [];
  }
}

/** Acha um canal por nome exato e tipo; senão cria. Reaplica parent + permissões. */
async function ensureChannel(
  guild: Guild,
  ch: Ch,
  parent: CategoryChannel,
): Promise<GuildChannel> {
  const wantVoice = ch.access === "voice";
  const wantType = wantVoice ? ChannelType.GuildVoice : ChannelType.GuildText;
  const overwrites = overwritesFor(guild, ch.access);

  const existing = guild.channels.cache.find(
    (c) => c.name === ch.name && c.type === wantType,
  ) as GuildChannel | undefined;

  if (!existing) {
    const created = await guild.channels.create({
      name: ch.name,
      type: wantType,
      parent: parent.id,
      permissionOverwrites: overwrites,
    });
    console.log(`[setup] criado: ${parent.name} / ${ch.name}`);
    return created;
  }

  // Já existe — garante que está na categoria certa e com as permissões certas.
  if (existing.parentId !== parent.id) {
    await existing.setParent(parent.id, { lockPermissions: false });
  }
  await existing.permissionOverwrites.set(overwrites);
  console.log(`[setup] ok (reaproveitado): ${parent.name} / ${ch.name}`);
  return existing;
}

/** Acha a categoria por nome; senão cria. */
async function ensureCategory(guild: Guild, name: string, position: number): Promise<CategoryChannel> {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name,
  ) as CategoryChannel | undefined;
  if (existing) {
    try {
      await existing.setPosition(position);
    } catch {
      /* ordem é cosmética */
    }
    return existing;
  }
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    position,
  });
}

/** Cria webhook "FormulaDota" se ainda não houver um no canal. Devolve a URL. */
async function ensureWebhook(channel: TextChannel): Promise<string> {
  const hooks = await channel.fetchWebhooks();
  const mine = hooks.find((h) => h.name === "FormulaDota");
  if (mine) return mine.url;
  const wh = await channel.createWebhook({ name: "FormulaDota" });
  return wh.url;
}

/** Semeia mensagens SÓ se o canal estiver vazio (não floodar em re-runs). */
async function seedIfEmpty(channel: TextChannel, messages: string[]): Promise<void> {
  const recent = await channel.messages.fetch({ limit: 1 });
  if (recent.size > 0) {
    console.log(`[setup] ${channel.name}: já tem conteúdo, não semeio.`);
    return;
  }
  for (const m of messages) await channel.send(m);
  console.log(`[setup] ${channel.name}: conteúdo semeado.`);
}

const WELCOME_CONTENT = [
  [
    "# 👋 Bem-vindo ao FORMULADOTA",
    "",
    "Aqui a **cultura é o produto** — o Dota é o terreno. Uma comunidade competitiva de gente comprometida em evoluir de verdade, sem smurf, sem anonimato, sem culpar o outro.",
    "",
    "**Comece por aqui:**",
    "- 📜丨doutrina — os princípios que regem tudo por aqui. Leia antes de jogar.",
    "- 🆕丨atualizacoes — tudo que muda no app aparece aqui, no estilo das notas de patch do Dota.",
    "- 🎧丨Buscando Partida — entre nesse canal de voz pra procurar partida. **Sem anonimato: joga quem dá a cara.**",
    "",
    "🌐 App: https://formuladota.com",
  ].join("\n"),
];

const DOUTRINA_CONTENT = [
  [
    "# 📜 A Doutrina",
    "",
    "O FORMULADOTA é uma máquina de mentalidade. Você não vem aqui só jogar — vem **desaprender os vícios** que te seguram e adotar o padrão de quem sobe de verdade.",
  ].join("\n"),
  [
    "## A primeira regra",
    "> A culpa **nunca** é do outro. A responsabilidade é sempre sua, **100% das vezes**.",
    "",
    "Não existe evolução com o dedo apontado pro time. Todo erro é um dado sobre o **seu** jogo.",
  ].join("\n"),
  [
    "## Os 4 Pilares",
    "A doutrina se organiza em 4 pilares, destrinchados no quiz de doutrina do app (nível 6 = **doutrinado**):",
    "- **Mentalidade** — responsabilidade radical, controle emocional, foco no que dá pra controlar.",
    "- **Fundamentos** — o que ganha jogo de verdade (mapa, timing, objetivos) acima de mecânica bonita.",
    "- **Consistência** — vitória é hábito, não sorte. Processo repetível > lampejo de gênio.",
    "- **Identidade** — nome público, reputação atrelada. Aqui todo mundo dá a cara.",
    "",
    "📖 Leia o Código de Conduta completo: https://formuladota.com/codigo-de-conduta",
  ].join("\n"),
];

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    const managedIds = new Set<string>();
    const webhookUrls: string[] = [];
    let welcomeChannel: TextChannel | null = null;
    let doutrinaChannel: TextChannel | null = null;
    let buscandoPartidaId: string | null = null;

    // 1) Reconcilia a estrutura (categorias + canais + permissões).
    let pos = 0;
    for (const block of STRUCTURE) {
      const cat = await ensureCategory(guild, block.category, pos++);
      managedIds.add(cat.id);
      for (const ch of block.channels) {
        const created = await ensureChannel(guild, ch, cat);
        managedIds.add(created.id);

        if (ch.name === "👋丨bem-vindo") welcomeChannel = created as TextChannel;
        if (ch.name === "📜丨doutrina") doutrinaChannel = created as TextChannel;
        if (ch.name === BUSCANDO_PARTIDA) buscandoPartidaId = created.id;

        // 2) Webhooks (fila / resultados / atualizacoes).
        if (ch.webhook && created.type === ChannelType.GuildText) {
          const url = await ensureWebhook(created as TextChannel);
          webhookUrls.push(`${ch.name}: ${url}`);
        }
      }
    }

    // 3) Convite permanente no bem-vindo.
    let inviteUrl = "(não gerado)";
    if (welcomeChannel) {
      const inv = await guild.invites.create(welcomeChannel.id, { maxAge: 0, maxUses: 0 });
      inviteUrl = `https://discord.gg/${inv.code}`;
    }

    // 4) Semeadura (só se vazio).
    if (welcomeChannel) await seedIfEmpty(welcomeChannel, WELCOME_CONTENT);
    if (doutrinaChannel) await seedIfEmpty(doutrinaChannel, DOUTRINA_CONTENT);

    // 6) Trata o que sobrou (fora da estrutura).
    //   Default: ARQUIVA (não apaga) — mas o Discord limita 50 canais por categoria,
    //   então espalha em 🗄丨ARQUIVO, 🗄丨ARQUIVO 2, ... conforme enche.
    //   Modo SETUP_PRUNE=true: APAGA de vez (use só depois de conferir o arquivo!).
    const PRUNE = process.env.SETUP_PRUNE === "true";
    const CATEGORY_MAX = 50;
    const leftovers = [...guild.channels.cache.values()].filter(
      (c) => c.type !== ChannelType.GuildCategory && !managedIds.has(c.id),
    );

    if (leftovers.length > 0 && PRUNE) {
      for (const ch of leftovers) {
        try {
          await (ch as GuildChannel).delete("setup-channels PRUNE — fora da estrutura");
          console.log(`[setup] APAGADO: ${ch.name}`);
        } catch (e) {
          console.log(`[setup] não consegui apagar ${ch.name}: ${(e as Error).message}`);
        }
      }
    } else if (leftovers.length > 0) {
      let archiveIdx = 0;
      let archive: CategoryChannel | null = null;
      let countInArchive = 0;

      const nextArchive = async (): Promise<CategoryChannel> => {
        archiveIdx++;
        const name = archiveIdx === 1 ? "🗄丨ARQUIVO" : `🗄丨ARQUIVO ${archiveIdx}`;
        const existing = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildCategory && c.name === name,
        ) as CategoryChannel | undefined;
        const cat =
          existing ??
          (await guild.channels.create({
            name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            ],
          }));
        // Quantos filhos já tem (importa em re-runs / categoria pré-existente).
        countInArchive = guild.channels.cache.filter((c) => c.parentId === cat.id).size;
        return cat;
      };

      archive = await nextArchive();
      for (const ch of leftovers) {
        if (countInArchive >= CATEGORY_MAX) archive = await nextArchive();
        try {
          await (ch as GuildChannel).setParent(archive.id, { lockPermissions: true });
          countInArchive++;
          console.log(`[setup] arquivado: ${ch.name}`);
        } catch (e) {
          const msg = (e as Error).message;
          // Encheu inesperadamente → abre a próxima categoria e tenta 1x.
          if (msg.includes("CHANNEL_PARENT_MAX_CHANNELS")) {
            archive = await nextArchive();
            try {
              await (ch as GuildChannel).setParent(archive.id, { lockPermissions: true });
              countInArchive++;
              console.log(`[setup] arquivado: ${ch.name}`);
            } catch (e2) {
              console.log(`[setup] não consegui arquivar ${ch.name}: ${(e2 as Error).message}`);
            }
          } else {
            console.log(`[setup] não consegui arquivar ${ch.name}: ${msg}`);
          }
        }
      }
    }

    console.log("\n=================================================================");
    console.log("[setup] ✅ PRONTO. Estrutura enxuta reconciliada.");
    console.log("\n[setup] CONVITE PERMANENTE (link do Discord na home):");
    console.log("   " + inviteUrl);
    console.log("\n[setup] ID do canal de voz 🎧丨Buscando Partida (gate de fila):");
    console.log("   DISCORD_QUEUE_VOICE_CHANNEL_ID=" + (buscandoPartidaId ?? "(não encontrado)"));
    console.log("\n[setup] WEBHOOKS (SEGREDOS — guarde nas envs):");
    for (const w of webhookUrls) console.log("   " + w);
    console.log(
      "\n   → 🆕丨atualizacoes é o webhook do changelog: coloque em CHANGELOG_DISCORD_WEBHOOK_URL (Vercel).",
    );
    console.log(
      "\n[setup] Confira as categorias 🗄丨ARQUIVO (ocultas) — arraste de volta o que quiser MANTER.",
    );
    console.log(
      "[setup] Pra APAGAR de vez tudo que sobrou: rode com  SETUP_PRUNE=true  (destrutivo!).",
    );
    console.log("=================================================================\n");

    await client.destroy();
    process.exit(0);
  } catch (e) {
    console.error("[setup] Falha:", (e as Error).message);
    console.error("[setup] Confira se o bot está no servidor com permissão de Administrador.");
    process.exit(1);
  }
});

client.login(TOKEN);
