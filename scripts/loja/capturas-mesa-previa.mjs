// Fotos da mesa da fila sem banco: a prévia de desenvolvimento (/party/mesa-previa, dados de exemplo)
// em todas as cenas, em 1920x1080 e 3440x1440, e os estados abertos (troca, menu, detalhe, cortesia,
// ajustes, partida terminou). Para revisar o desenho a cada mudança; com dados reais, use
// capturas-painel-fila.mjs. Rode com o servidor local de pé (pnpm dev):
// LOJA_E2E_PORT=3104 node scripts/loja/capturas-mesa-previa.mjs <pasta>

import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = `http://localhost:${process.env.LOJA_E2E_PORT ?? "3000"}`;
const OUT = process.argv[2] ?? "capturas-mesa-previa";
const SIZES = [
  [1920, 1080],
  [3440, 1440],
];
const SCENES = ["completar", "jogando", "sem-live", "vazia"];
/** Estado aberto: o que clicar na cena "jogando" antes da foto. */
const STATES = {
  trocar: (page) => page.locator("[data-fila-trocar]").first().click(),
  menu: (page) => page.locator("[data-fila-lugar='ocupado']").first().getByRole("button", { name: /Ações de/ }).click(),
  detalhe: (page) => page.locator("[data-fila-linha] > [role=button]").nth(1).click(),
  cortesia: (page) => page.locator("[data-fila-por-na-fila]").click(),
  ajustes: (page) => page.locator("[data-fila-ajustes]").click(),
  partida: (page) => page.locator("[data-fila-partida-terminou]").click(),
};

async function open(page, scene) {
  await page.goto(`${BASE}/party/mesa-previa?cena=${scene}`, { waitUntil: "networkidle", timeout: 180_000 });
  if (scene !== "estados") await page.locator("[data-fila-passo]").waitFor({ timeout: 60_000 });
  await page.waitForTimeout(600);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
try {
  for (const [width, height] of SIZES) {
    const context = await browser.newContext({ viewport: { width, height }, locale: "pt-BR" });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`));
    for (const scene of [...SCENES, "estados"]) {
      await open(page, scene);
      await page.screenshot({ path: `${OUT}/${scene}-${width}.png` });
    }
    for (const [name, act] of Object.entries(STATES)) {
      await open(page, "jogando");
      await act(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/jogando-${width}-${name}.png` });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`fotos em ${OUT}`);
if (errors.length) {
  console.error(`erros na página:\n${errors.join("\n")}`);
  process.exit(1);
}
