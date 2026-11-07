// Capturas da loja no localhost para a conferência visual: vitrine, produto e pedido com Pix,
// em 1920x1080, 3440x1440 e celular (390x844). Liga a flag e o produto de teste durante a
// captura e restaura no fim. Rode com o servidor local de pé: node scripts/loja/capturas.mjs
//
// Atenção: a flag "loja" mora no banco de produção. Com a loja já publicada, ligar a flag
// expõe a vitrine; use só antes do deploy ou com o catálogo real ativo.

import { readFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
if (!env.MP_ACCESS_TOKEN?.startsWith("TEST-")) throw new Error("Recusado: as capturas só rodam com credencial de teste.");

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "docs/loja/provas/capturas";
const SLUG = process.env.SLUG ?? "e2e-teste";
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SIZES = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "celular", width: 390, height: 844, mobile: true },
  { name: "3440", width: 3440, height: 1440 },
];

mkdirSync(OUT, { recursive: true });
const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "loja").single();
await db.from("feature_flags").update({ enabled: true }).eq("key", "loja");
if (SLUG === "e2e-teste") await db.from("store_products").update({ active: true }).eq("slug", SLUG);

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  let orderUrl = null;
  for (const size of SIZES) {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: size.width, height: size.height },
      isMobile: !!size.mobile,
      hasTouch: !!size.mobile,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/loja`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/vitrine-${size.name}.png`, fullPage: true });
    await page.goto(`${BASE}/loja/${SLUG}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/produto-${size.name}.png`, fullPage: true });
    if (!orderUrl) {
      const form = page.locator("#loja-checkout");
      await form.locator('input[name="name"]').fill("Ana Teste");
      await form.locator('input[name="email"]').fill("captura.loja@formuladota.com.br");
      await form.locator('input[name="whatsapp"]').fill("(31) 99999-8888");
      for (const field of ["discord"]) {
        const input = form.locator(`input[name="${field}"]`);
        if (await input.count()) await input.fill("ana_teste");
      }
      await form.locator('input[name="aceite"]').check();
      await form.locator('button[type="submit"]').click();
      await page.waitForURL(/\/loja\/pedido\//, { timeout: 90_000 });
      orderUrl = page.url();
    }
    await page.goto(orderUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/pedido-pix-${size.name}.png`, fullPage: true });
    await context.close();
    console.log(`capturas ${size.name} prontas`);
  }
} finally {
  await browser.close();
  if (SLUG === "e2e-teste") await db.from("store_products").update({ active: false }).eq("slug", SLUG);
  await db.from("feature_flags").update({ enabled: flag?.enabled === true }).eq("key", "loja");
  console.log("flag e produto de teste restaurados");
}
