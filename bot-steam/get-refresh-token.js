"use strict";
/**
 * Gera um REFRESH TOKEN da conta-bot pro login HEADLESS (Railway, sem teclado).
 * ============================================================================
 * Rode LOCAL uma vez:  npm run token   (ou: node get-refresh-token.js)
 * Ele loga de forma interativa (pede o código do Steam Guard) e imprime o token.
 * Cole o token no Railway como STEAM_REFRESH_TOKEN. NUNCA commitar.
 *
 * O token vale meses; quando expirar (ou se trocar a senha do bot), rode de novo.
 */
require("dotenv").config();
const readline = require("readline");
const { LoginSession, EAuthTokenPlatformType } = require("steam-session");

const USERNAME = process.env.STEAM_BOT_USERNAME;
const PASSWORD = process.env.STEAM_BOT_PASSWORD;
if (!USERNAME || !PASSWORD) {
  console.error("[TOKEN] Preencha STEAM_BOT_USERNAME e STEAM_BOT_PASSWORD no .env.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

(async () => {
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);

  session.on("authenticated", () => {
    console.log("\n=========== STEAM_REFRESH_TOKEN (copie a linha abaixo) ===========");
    console.log(session.refreshToken);
    console.log("==================================================================");
    console.log("Cole no Railway como STEAM_REFRESH_TOKEN. NÃO commitar, NÃO compartilhar.");
    rl.close();
    process.exit(0);
  });

  session.on("error", (e) => {
    console.error("[TOKEN] Erro na sessão:", e.message);
    process.exit(1);
  });

  console.log(`[TOKEN] Logando como ${USERNAME}...`);
  const result = await session.startWithCredentials({ accountName: USERNAME, password: PASSWORD });

  if (result.actionRequired) {
    console.log("[TOKEN] Steam Guard necessário.");
    const code = await ask("Digite o código do Steam Guard (app do celular ou e-mail): ");
    await session.submitSteamGuardCode(code);
  }
})().catch((e) => {
  console.error("[TOKEN] Falha:", e.message);
  process.exit(1);
});
