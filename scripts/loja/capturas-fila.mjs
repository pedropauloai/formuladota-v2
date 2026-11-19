// Capturas da fila da party no localhost para a conferência visual: a página /party e a barra
// inferior da /loja, em 1920x1080, celular (390x844) e 3440x1440. Rode com o servidor local de pé
// e uma live de teste aberta: BASE=http://localhost:3101 node scripts/loja/capturas-fila.mjs <pasta>
// Com COOKIES=<arquivo json> (cookies de sessão do roteiro e2e), captura também logado.

import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "capturas-fila";
const LOCALE = process.env.LOCALE ?? "pt";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SIZES = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "celular", width: 390, height: 844, mobile: true },
  { name: "3440", width: 3440, height: 1440 },
];
const PAGES = (process.env.PAGES ?? "/party,/loja").split(",");
const sessionCookies = process.env.COOKIES ? JSON.parse(readFileSync(process.env.COOKIES, "utf8")) : [];

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
    await context.addCookies([{ name: "NEXT_LOCALE", value: LOCALE, domain: "localhost", path: "/" }, ...sessionCookies]);
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const name = `${OUT}/${path.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "home"}-${LOCALE}-${size.name}.png`;
      await page.screenshot({ path: name, fullPage: false });
      console.log("captura:", name);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
