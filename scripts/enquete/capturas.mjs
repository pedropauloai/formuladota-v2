// Capturas da enquete da Liga na coluna direita, como visitante, antes e depois do voto, em
// 1920x1080, 3440x1440 e celular (390x844, onde a coluna direita não aparece e a página não pode
// quebrar). Os votos de cada aparelho de captura são apagados no fim.
// Rodar com o servidor de pé: ENQUETE_BASE=http://localhost:3105 node scripts/enquete/capturas.mjs <pasta> [pt|en|es]

import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const BASE = process.env.ENQUETE_BASE ?? "http://localhost:3105";
const OUT = process.argv[2] ?? "capturas-enquete";
const LOCALE = process.argv[3] ?? "pt";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SIZES = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "3440", width: 3440, height: 1440 },
  { name: "celular", width: 390, height: 844, mobile: true },
];
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const voterKeys = [];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const size of SIZES) {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      isMobile: size.mobile === true,
      hasTouch: size.mobile === true,
      locale: { pt: "pt-BR", en: "en-US", es: "es-419" }[LOCALE] ?? "pt-BR",
    });
    await context.addCookies([{ name: "NEXT_LOCALE", value: LOCALE, domain: "localhost", path: "/" }]);
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const card = page.locator('[data-enquete="liga"]');
    const visible = await card.isVisible();
    const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`${size.name}: card ${visible ? "visível" : "fora da tela"}, rolagem lateral ${scrollX} px`);
    await page.screenshot({ path: `${OUT}/${size.name}-${LOCALE}-antes.png` });
    if (visible) {
      await card.screenshot({ path: `${OUT}/${size.name}-${LOCALE}-antes-card.png` });
      const done = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers(), { timeout: 30_000 });
      await card.locator('button[data-resposta="sim"]').click();
      await done;
      await card.locator("[data-enquete-sim]").waitFor({ timeout: 15_000 });
      await page.waitForTimeout(600);
      const device = (await context.cookies()).find((c) => c.name === "fd_aparelho");
      if (device) voterKeys.push(`d:${device.value}`);
      await page.screenshot({ path: `${OUT}/${size.name}-${LOCALE}-depois.png` });
      await card.screenshot({ path: `${OUT}/${size.name}-${LOCALE}-depois-card.png` });
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (voterKeys.length > 0) {
    const { error } = await db.from("poll_votes").delete().eq("poll_key", "liga_formuladota").in("voter_key", voterKeys);
    console.log(error ? `apagar votos das capturas falhou: ${error.message}` : `votos das capturas apagados: ${voterKeys.length}`);
  }
}
