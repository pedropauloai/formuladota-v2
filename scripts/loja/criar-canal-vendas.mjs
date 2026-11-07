// Cria (ou reaproveita) o canal oculto 💰丨vendas na categoria 🛠丨ADMIN do Discord e o webhook
// "Loja FORMULADOTA", e grava a URL do webhook no arquivo de ambiente indicado, sem imprimir.
// Usa só a API REST do Discord com o token do bot: funciona com o bot fora do ar.
//
// Uso: node scripts/loja/criar-canal-vendas.mjs .env.local

import { readFileSync, writeFileSync } from "node:fs";

const envPath = process.argv[2] ?? ".env.local";
const raw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);
const token = env.DISCORD_BOT_TOKEN;
const guildId = env.DISCORD_GUILD_ID;
if (!token || !guildId) throw new Error("DISCORD_BOT_TOKEN e DISCORD_GUILD_ID precisam estar no arquivo de ambiente.");

const CATEGORY = "🛠丨ADMIN";
const CHANNEL = "💰丨vendas";
const HOOK = "Loja FORMULADOTA";
const VIEW_CHANNEL = String(1 << 10);

async function discord(path, init = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Discord ${init.method ?? "GET"} ${path.replace(/\d{6,}/g, ":id")}: HTTP ${response.status} ${body?.message ?? ""}`);
  return body;
}

const channels = await discord(`/guilds/${guildId}/channels`);
const category = channels.find((c) => c.type === 4 && c.name === CATEGORY);
if (!category) throw new Error(`Categoria ${CATEGORY} não existe: rode o setup-channels do bot antes.`);

let channel = channels.find((c) => c.type === 0 && c.name === CHANNEL);
let channelState = "existente";
if (!channel) {
  channel = await discord(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name: CHANNEL,
      type: 0,
      parent_id: category.id,
      topic: "Aviso de cada venda da loja do site. Só o admin vê.",
      // Oculto para @everyone (o ID do cargo @everyone é o do servidor).
      permission_overwrites: [{ id: guildId, type: 0, deny: VIEW_CHANNEL }],
    }),
  });
  channelState = "criado";
}

const hooks = await discord(`/channels/${channel.id}/webhooks`);
let hook = hooks.find((h) => h.name === HOOK && h.token);
let hookState = "existente";
if (!hook) {
  hook = await discord(`/channels/${channel.id}/webhooks`, { method: "POST", body: JSON.stringify({ name: HOOK }) });
  hookState = "criado";
}

const url = `https://discord.com/api/webhooks/${hook.id}/${hook.token}`;
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const line = `SALES_DISCORD_WEBHOOK_URL=${url}`;
const next = /^SALES_DISCORD_WEBHOOK_URL=.*$/m.test(raw)
  ? raw.replace(/^SALES_DISCORD_WEBHOOK_URL=.*$/m, line)
  : `${raw.replace(/\s*$/, "")}${eol}${line}${eol}`;
writeFileSync(envPath, next);

console.log(`canal ${CHANNEL}: ${channelState}; webhook: ${hookState}; URL gravada em ${envPath} (não impressa).`);
