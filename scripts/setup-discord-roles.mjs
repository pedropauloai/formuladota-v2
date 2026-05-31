// scripts/setup-discord-roles.mjs
//
// Cria os cargos e o canal #bot-logs no servidor FORMULADOTA via Discord REST API,
// e grava os IDs em .env.local e bot/.env.
//
// Idempotente: pode rodar várias vezes — cargos/canais já existentes são apenas
// detectados (não duplicados). Útil pra re-sincronizar IDs depois de zerar server.
//
// Uso (no Windows PowerShell ou Git Bash, raiz do projeto):
//   node scripts/setup-discord-roles.mjs
//
// Pré-requisitos:
//   - bot/.env com DISCORD_BOT_TOKEN + DISCORD_GUILD_ID preenchidos
//   - Bot já adicionado ao servidor com permissão Administrator
//   - Node.js 18+ (fetch nativo)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BOT_ENV = join(ROOT, "bot", ".env");
const APP_ENV = join(ROOT, ".env.local");

// ============================================================================
// Helpers
// ============================================================================

function parseEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function discord(token, method, path, body) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${method} ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

function color(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

// ============================================================================
// Spec — cargos a criar/sincronizar
// ============================================================================

const ROLES_SPEC = [
  // Hierárquicos
  { envKey: "PEDRO_FOUNDER", name: "Pedro Founder", color: color("#C42121"), skipCreate: true },
  { envKey: "PRO_ATIVO", name: "PRO Ativo", color: color("#F59E0B") },
  { envKey: "PRO_PAUSADO", name: "PRO Pausado", color: color("#71717A") },
  { envKey: "IMORTAL_FORMULA", name: "Imortal da Fórmula", color: color("#C42121") },
  { envKey: "LENDARIO", name: "Lendário", color: color("#A855F7") },
  { envKey: "MESTRE", name: "Mestre", color: color("#0099EC") },
  { envKey: "HONRADO", name: "Honrado", color: color("#00C466") },
  { envKey: "ALUNO_ATIVO", name: "Aluno Ativo", color: color("#5CE69D") },
  { envKey: "CALIBRANDO", name: "Calibrando", color: color("#B3B3B3") },
  { envKey: "VISITANTE", name: "Visitante", color: color("#71717A") },
  // Temporais (perpétuos)
  { envKey: "FUNDADOR", name: "Fundador (primeiros 50)", color: color("#F59E0B") },
  // Temporais (apagam ao final)
  { envKey: "EM_MATCH", name: "Em Match", color: color("#0099EC") },
  { envKey: "EM_FILA", name: "Em Fila", color: color("#5CE69D") },
];

// Cargos parametrizados (Champion Season X, Top 10 Season X, Liga Ativa S{N})
// NÃO são criados aqui — bot cria dinamicamente no início de cada season.

// ============================================================================
// Env file writer (upsert)
// ============================================================================

function upsertEnv(path, updates, sectionHeader) {
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";

  // Adiciona section header se ainda não existe
  if (sectionHeader && !content.includes(sectionHeader)) {
    if (!content.endsWith("\n")) content += "\n";
    content += "\n" + sectionHeader + "\n";
  }

  for (const [key, val] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${val}`;
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      if (!content.endsWith("\n")) content += "\n";
      content += line + "\n";
    }
  }
  writeFileSync(path, content);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const env = parseEnv(BOT_ENV);
  const token = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;

  if (!token || token.includes("__COLE")) {
    throw new Error("DISCORD_BOT_TOKEN não configurado em bot/.env");
  }
  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID não configurado em bot/.env");
  }

  console.log(`[setup] Conectando ao Discord (guild ${guildId})...`);

  // Verifica que bot está no servidor
  const guild = await discord(token, "GET", `/guilds/${guildId}`);
  console.log(`[setup] Conectado a "${guild.name}"`);

  // ----- Cargos -----
  console.log("\n[setup] Sincronizando cargos...");
  const existing = await discord(token, "GET", `/guilds/${guildId}/roles`);
  const byName = Object.fromEntries(existing.map((r) => [r.name, r]));

  const roleIds = {};
  for (const spec of ROLES_SPEC) {
    const found = byName[spec.name];
    if (found) {
      console.log(`  [ok]      "${spec.name}" → ${found.id}`);
      roleIds[spec.envKey] = found.id;
    } else if (spec.skipCreate) {
      console.log(`  [pular]   "${spec.name}" (criação manual — crie no Discord e rode de novo)`);
      roleIds[spec.envKey] = "";
    } else {
      const created = await discord(token, "POST", `/guilds/${guildId}/roles`, {
        name: spec.name,
        color: spec.color,
        mentionable: false,
        hoist: false,
      });
      console.log(`  [criado]  "${spec.name}" → ${created.id}`);
      roleIds[spec.envKey] = created.id;
    }
  }

  // ----- Canal #bot-logs -----
  console.log("\n[setup] Verificando canal #bot-logs...");
  const channels = await discord(token, "GET", `/guilds/${guildId}/channels`);
  let botLogsChannel = channels.find((c) => c.name === "bot-logs" && c.type === 0);

  if (botLogsChannel) {
    console.log(`  [ok]      #bot-logs → ${botLogsChannel.id}`);
  } else {
    // Permissões: nega @everyone, libera Pedro Founder (se existir)
    const overwrites = [
      { id: guildId, type: 0, deny: "1024" }, // VIEW_CHANNEL
    ];
    if (roleIds.PEDRO_FOUNDER) {
      overwrites.push({ id: roleIds.PEDRO_FOUNDER, type: 0, allow: "1024" });
    }
    botLogsChannel = await discord(token, "POST", `/guilds/${guildId}/channels`, {
      name: "bot-logs",
      type: 0,
      topic: "Auditoria de ações do FORMULADOTA Bot (cargos, salas voice, sync).",
      permission_overwrites: overwrites,
    });
    console.log(`  [criado]  #bot-logs → ${botLogsChannel.id}`);
  }

  // ----- Escreve nos env files -----
  const updates = {
    DISCORD_CHANNEL_BOT_LOGS_ID: botLogsChannel.id,
  };
  for (const [key, id] of Object.entries(roleIds)) {
    updates[`DISCORD_ROLE_${key}`] = id;
  }

  const sectionHeader =
    "# ============================================================================\n" +
    "# Discord — IDs de cargos e canais (gerenciados via setup-discord-roles.mjs)\n" +
    "# ============================================================================";

  upsertEnv(APP_ENV, updates, sectionHeader);
  upsertEnv(BOT_ENV, updates, sectionHeader);

  console.log("\n[setup] OK — IDs gravados em .env.local e bot/.env\n");
  console.log("Resumo:");
  for (const [key, val] of Object.entries(updates)) {
    console.log(`  ${key}=${val || "(vazio)"}`);
  }

  // ----- Avisos finais -----
  if (!roleIds.PEDRO_FOUNDER) {
    console.log(
      '\n⚠️  Pedro Founder não existe. Crie no Discord (Server Settings → Roles → Create Role, nome exato: "Pedro Founder", cor #C42121), depois rode este script de novo.'
    );
  }

  console.log(
    "\n⚠️  IMPORTANTE — hierarquia: vá em Server Settings → Roles e ARRASTE o cargo do bot (FORMULADOTA_BOTv2.0) pra POSIÇÃO ACIMA dos cargos que ele gerencia. Sem isso, o bot não consegue atribuir/remover cargos mesmo com Administrator."
  );
}

main().catch((err) => {
  console.error("[setup] FALHOU:", err.message);
  process.exit(1);
});
