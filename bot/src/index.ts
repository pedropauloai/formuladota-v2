// Bot Discord FORMULADOTA — Phase 5
// Coordena voice channels enquanto PRO e alunos jogam ranked Valve oficial.
//
// Modelo:
//   1. Plataforma chama bot via HTTP (autenticado com INTERNAL_API_KEY)
//   2. Bot cria/apaga salas de voz no servidor Discord
//   3. Bot move usuários entre salas conforme fluxo de fila/partida
//
// Sem Steam GC, sem lobby Dota custom — apenas coordenação de voice channels.
// Deploy: Railway Hobby (~$3/mês) na pasta bot/ deste repo.

import "dotenv/config";
import { loginBot } from "./discord/client.js";
import { startHttpServer } from "./api/server.js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`[bot] Variável de ambiente ausente: ${key}`);
    process.exit(1);
  }
  return v;
}

async function main(): Promise<void> {
  // Validação de env vars críticas na inicialização
  requireEnv("DISCORD_BOT_TOKEN");
  requireEnv("DISCORD_GUILD_ID");
  requireEnv("INTERNAL_API_KEY");

  console.log("[bot] Iniciando FORMULADOTA Discord Bot...");

  // Conecta ao Discord e aguarda evento 'ready'
  await loginBot();

  // Inicia servidor HTTP para receber comandos da plataforma
  startHttpServer();

  console.log("[bot] Pronto para coordenar voice channels.");
}

main().catch((err: unknown) => {
  console.error("[bot] Erro fatal:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[bot] SIGTERM recebido — encerrando...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[bot] SIGINT recebido — encerrando...");
  process.exit(0);
});
