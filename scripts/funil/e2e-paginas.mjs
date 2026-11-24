// Prova de ponta a ponta das páginas por sessão: a aba entra pela home, vai à fila da party e cada
// passagem fica gravada em site_pageviews (marcada como teste, porque roda no localhost). Apaga as
// linhas que criou. Sai com código diferente de zero se algo falhar.
//
//   node scripts/funil/e2e-paginas.mjs   (LOJA_E2E_PORT reaproveita um servidor de pé)

import { chromium } from "playwright-core";
import { BASE, USER_AGENT, checker, db, startServer, stopServer, waitFor } from "../loja/e2e-comum.mjs";

const { results, check } = checker();

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let sessionId = null;
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: "pt-BR", viewport: { width: 1920, height: 1080 } });
    await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" }]);
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    sessionId = await waitFor(() => page.evaluate(() => window.sessionStorage.getItem("fd_visita")), 15_000, 500);
    check("a aba ganhou um id de sessão", !!sessionId);
    // Navegação dentro do site (mesma aba): a sessão é a mesma.
    await page.goto(`${BASE}/party`, { waitUntil: "networkidle" });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

    const linhas = await waitFor(async () => {
      const { data } = await db.from("site_pageviews").select("path, is_test").eq("session_id", sessionId);
      return data && data.length >= 2 ? data : null;
    }, 30_000);
    const caminhos = (linhas ?? []).map((l) => l.path).sort();
    check("a home e a fila ficaram gravadas para a sessão", caminhos.join(",") === "/,/party", caminhos.join(","));
    check("a volta à home não duplicou a linha", (linhas ?? []).length === 2, String((linhas ?? []).length));
    check("no localhost a página fica marcada como teste", (linhas ?? []).every((l) => l.is_test === true));
    const { data: visita } = await db.from("site_visits").select("path, is_test").eq("session_id", sessionId).maybeSingle();
    check("a visita da sessão continua uma só, com a página de entrada", visita?.path === "/" && visita?.is_test === true, JSON.stringify(visita));
  } finally {
    if (sessionId) {
      await db.from("site_pageviews").delete().eq("session_id", sessionId);
      await db.from("site_visits").delete().eq("session_id", sessionId);
    }
    await browser.close();
    stopServer(server);
  }
  console.log(`\nPáginas por sessão: ${results.filter((r) => r.ok).length} de ${results.length} verificações passaram.`);
}

run().catch((err) => {
  console.error(`\nE2E DAS PÁGINAS FALHOU: ${err.message}`);
  process.exit(1);
});
