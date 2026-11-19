// Ponta a ponta da enquete da Liga (flag enquete_liga, migration 180) num servidor local de pé:
// vota como visitante (troca a resposta e recarrega), entra logado no mesmo aparelho (o voto do
// aparelho passa para a conta), vê como admin e confere cada passo no banco. Apaga os votos e o
// usuário de teste no fim, mesmo se falhar. Sai com código 1 na primeira checagem que falhar.
// Rodar: ENQUETE_BASE=http://localhost:3105 node scripts/enquete/e2e.mjs [pasta das capturas]

import { readFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const BASE = process.env.ENQUETE_BASE ?? "http://localhost:3105";
const SHOTS = process.argv[2] ?? null;
const POLL = "liga_formuladota";
const COOKIE = "fd_aparelho";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) throw new Error(`falhou: ${name}`);
}

async function waitFor(fn, ms = 15_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(400);
  }
  return null;
}

async function counts() {
  const one = async (answer) => {
    const { count, error } = await db.from("poll_votes").select("voter_key", { count: "exact", head: true }).eq("poll_key", POLL).eq("answer", answer);
    if (error) throw new Error(`contar ${answer}: ${error.message}`);
    return count ?? 0;
  };
  const [sim, talvez, nao] = await Promise.all([one("sim"), one("talvez"), one("nao")]);
  return { sim, talvez, nao };
}

async function rowsFor(keys) {
  const { data, error } = await db.from("poll_votes").select("voter_key, user_id, answer").eq("poll_key", POLL).in("voter_key", keys);
  if (error) throw new Error(`ler votos: ${error.message}`);
  return data ?? [];
}

async function sessionCookies(email, password) {
  const jar = new Map();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (list) => list.forEach((cookie) => jar.set(cookie.name, cookie)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login de teste: ${error.message}`);
  return [...jar.values()].filter((c) => c.value).map((c) => ({ name: c.name, value: c.value, domain: "localhost", path: "/", sameSite: "Lax" }));
}

async function openHome(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-enquete="liga"]').waitFor({ state: "visible", timeout: 60_000 });
}

const card = (page) => page.locator('[data-enquete="liga"]');
const shownSim = async (page) => Number(await card(page).locator("[data-enquete-sim]").getAttribute("data-enquete-sim"));

async function vote(page, answer) {
  // A resposta da server action troca o número otimista pelo do banco: espera ela voltar.
  const done = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers(), { timeout: 30_000 });
  await card(page).locator(`button[data-resposta="${answer}"]`).click();
  await card(page).locator(`button[data-resposta="${answer}"][aria-pressed="true"]`).waitFor({ timeout: 10_000 });
  await done;
  await card(page).locator('div[aria-busy="false"]').waitFor({ timeout: 15_000 });
}

async function shot(page, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await card(page).screenshot({ path: `${SHOTS}/${name}-card.png` });
  console.log("captura:", `${SHOTS}/${name}.png`);
}

const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "enquete_liga").maybeSingle();
if (flag?.enabled !== true) throw new Error("A flag enquete_liga está desligada no banco: ligue no painel antes do teste.");
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const RUN = Date.now().toString(36);
const email = `e2e.enquete.${RUN}@formuladota.com.br`;
const password = randomBytes(18).toString("base64url");
const voterKeys = [];
let userId = null;
let browser = null;
const before = await counts();
console.log("contagem antes:", JSON.stringify(before));

try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: "pt-BR", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" }]);
  const page = await context.newPage();

  // ---------- Visitante: um clique vota, sem login ----------
  await openHome(page);
  check("o card da enquete aparece no lugar do Top do ranking", (await page.getByText("Top do ranking").count()) === 0);
  check("antes do voto não aparece resultado", (await card(page).locator("[data-enquete-sim]").count()) === 0);
  const boxes = await Promise.all(["sim", "talvez", "nao"].map((a) => card(page).locator(`button[data-resposta="${a}"]`).boundingBox()));
  const cardBox = await card(page).boundingBox();
  check("os três botões cabem numa linha", boxes.every((b) => b && Math.abs(b.y - boxes[0].y) < 1) && boxes[2].x + boxes[2].width <= cardBox.x + cardBox.width, `card de ${Math.round(cardBox.width)} px`);
  await shot(page, "1920-visitante-antes");

  await vote(page, "sim");
  const device = (await context.cookies()).find((c) => c.name === COOKIE);
  check("o voto do visitante cria o cookie do aparelho, httpOnly", Boolean(device?.httpOnly) && /^[0-9a-f-]{36}$/.test(device?.value ?? ""));
  const yearS = (device.expires - Date.now() / 1000) / 86400;
  check("o cookie do aparelho vale um ano", yearS > 364 && yearS < 366, `${yearS.toFixed(1)} dias`);
  const deviceKey = `d:${device.value}`;
  voterKeys.push(deviceKey);
  const visitorRow = await waitFor(async () => (await rowsFor([deviceKey])).find((r) => r.answer === "sim"));
  check("o banco grava o Sim do visitante pelo aparelho, sem user_id", Boolean(visitorRow) && visitorRow.user_id === null);
  check("o número na tela é o do banco", (await shownSim(page)) === (await counts()).sim, `${await shownSim(page)} Sim`);
  check("quem não é admin não vê Talvez e Não", (await card(page).locator("[data-enquete-admin]").count()) === 0);
  const bar = card(page).locator('[role="progressbar"]');
  check("a barra vai até 50", (await bar.getAttribute("aria-valuemax")) === "50");
  check("o texto diz que a liga volta com 50 interessados", (await card(page).innerText()).includes("A liga volta com 50 interessados."));
  await shot(page, "1920-visitante-votou");

  await vote(page, "talvez");
  const switched = await waitFor(async () => {
    const rows = await rowsFor([deviceKey]);
    return rows.length === 1 && rows[0].answer === "talvez" ? rows : null;
  });
  check("trocar a resposta atualiza o mesmo voto (uma linha só)", Boolean(switched));
  check("o Sim volta ao que era antes", (await shownSim(page)) === before.sim, `${await shownSim(page)} Sim`);

  await openHome(page);
  check("recarregada, a página lembra o voto do aparelho", (await card(page).locator('button[data-resposta="talvez"]').getAttribute("aria-pressed")) === "true");

  // ---------- Logado no mesmo aparelho: o voto do aparelho passa para a conta ----------
  const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Teste Enquete ${RUN}` } });
  if (createError) throw new Error(`usuário de teste: ${createError.message}`);
  userId = created.user.id;
  const userKey = `u:${userId}`;
  voterKeys.push(userKey);
  await context.addCookies(await sessionCookies(email, password));
  await openHome(page);
  check("logado, o card mostra o voto que o aparelho deu antes de entrar", (await card(page).locator('button[data-resposta="talvez"]').getAttribute("aria-pressed")) === "true");

  await vote(page, "sim");
  const merged = await waitFor(async () => {
    const rows = await rowsFor([deviceKey, userKey]);
    return rows.length === 1 && rows[0].voter_key === userKey ? rows[0] : null;
  });
  check("o voto logado fica na conta e o do aparelho sai (a pessoa conta uma vez)", Boolean(merged) && merged.user_id === userId && merged.answer === "sim");
  check("o número na tela é o do banco depois do voto logado", (await shownSim(page)) === (await counts()).sim && (await shownSim(page)) === before.sim + 1);
  check("logado sem admin, Talvez e Não continuam escondidos", (await card(page).locator("[data-enquete-admin]").count()) === 0);
  await shot(page, "1920-logado-votou");

  // ---------- Admin: vê também Talvez e Não ----------
  await db.from("profiles").update({ is_admin: true }).eq("id", userId);
  await openHome(page);
  const now = await counts();
  const adminLine = (await card(page).locator("[data-enquete-admin]").innerText().catch(() => "")).trim();
  check("o admin vê os totais de Talvez e Não do banco", adminLine === `Só o admin vê: Talvez ${now.talvez} · Não ${now.nao}`, adminLine);
  await vote(page, "nao");
  const adminAfter = await counts();
  const adminLine2 = (await card(page).locator("[data-enquete-admin]").innerText()).trim();
  check("o voto do admin muda os totais na hora", adminLine2 === `Só o admin vê: Talvez ${adminAfter.talvez} · Não ${adminAfter.nao}` && adminAfter.nao === before.nao + 1, adminLine2);
  await shot(page, "1920-admin");
  await context.close();
} finally {
  if (voterKeys.length > 0) {
    const { error } = await db.from("poll_votes").delete().eq("poll_key", POLL).in("voter_key", voterKeys);
    if (error) console.error("apagar votos de teste falhou:", error.message);
  }
  if (userId) {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) console.error("apagar usuário de teste falhou:", error.message);
  }
  await browser?.close();
}

const after = await counts();
check("limpeza: a contagem volta à de antes do teste", JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after));
const { data: leftover } = await db.from("poll_votes").select("voter_key").eq("poll_key", POLL).in("voter_key", voterKeys);
check("limpeza: nenhum voto de teste ficou no banco", (leftover ?? []).length === 0);
