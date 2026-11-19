// Battlepass no ar: um jogador de teste entra no site real, toca em "Assinar no cartão" e o servidor
// de produção abre a assinatura no Mercado Pago com a credencial real. Confere valor, nome e
// referência, cancela a assinatura (ninguém paga nada) e apaga o jogador de teste.
// Rodar no WSL, na cópia de deploy, com o ambiente de produção carregado:
//   set -a; . ./.env.producao; set +a; node scripts/battlepass/verificar-producao.mjs
// Sai com o número de falhas (0 = tudo certo). Nunca imprime credencial.

import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright-core";

const SITE = process.env.BATTLEPASS_SITE ?? "https://www.formuladota.com.br";
const need = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "MP_ACCESS_TOKEN"];
for (const key of need) if (!process.env[key]) throw new Error(`falta ${key} no ambiente`);
if (!process.env.MP_ACCESS_TOKEN.startsWith("APP_USR-")) throw new Error("Recusado: a verificação de produção usa a credencial real (APP_USR-).");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const mp = async (path, init = {}) => {
  const response = await fetch(`https://api.mercadopago.com${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" } });
  return response.json();
};

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
  return ok;
};

async function http(path) {
  const response = await fetch(`${SITE}${path}`, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 verificador-battlepass" } });
  return { status: response.status, location: response.headers.get("location") ?? "" };
}

async function sessionCookies(email, password) {
  const jar = new Map();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar.values()], setAll: (list) => list.forEach((c) => jar.set(c.name, { name: c.name, value: c.value })) },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login do jogador de teste: ${error.message}`);
  const domain = new URL(SITE).hostname;
  return [...jar.values()].filter((c) => c.value).map((c) => ({ ...c, domain, path: "/", sameSite: "Lax", secure: true }));
}

const planos = await http("/planos");
check("visitante abre /planos", planos.status === 200, String(planos.status));
const short = await http("/battlepass");
check("/battlepass leva para /planos", short.status >= 300 && short.status < 400 && short.location.includes("/planos"), `${short.status} ${short.location}`);

const run = randomUUID().slice(0, 8);
const email = `bp-prod-${run}@formuladota.com.br`;
const password = randomBytes(18).toString("base64url");
const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Verificador BP ${run}` } });
if (error) throw new Error(`jogador de teste: ${error.message}`);
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
try {
  const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1920, height: 1080 } });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: new URL(SITE).hostname, path: "/" }, ...(await sessionCookies(email, password))]);
  const page = await context.newPage();
  await page.goto(`${SITE}/planos`, { waitUntil: "networkidle" });
  check("logado, o painel mostra que não tem Battlepass", (await page.locator("[data-bp-estado]").first().getAttribute("data-bp-estado")) === "nenhum");
  await Promise.all([page.waitForURL(/mercadopago\.com/, { timeout: 60_000 }), page.locator("[data-bp-assinar-cartao]").first().click()]);
  check("o navegador chega ao checkout do Mercado Pago", /mercadopago\.com/.test(page.url()), new URL(page.url()).host);
  const { data: rows } = await db.from("subscriptions").select("id, status, provider, tier, is_test, mp_preapproval_id").eq("user_id", userId);
  const sub = rows?.[0];
  check("a assinatura nasce pendente, de produção, com o ID do Mercado Pago", sub?.status === "pending" && sub.provider === "mp" && sub.tier === "battlepass" && sub.is_test === false && !!sub.mp_preapproval_id);
  if (sub?.mp_preapproval_id) {
    const preapproval = await mp(`/preapproval/${sub.mp_preapproval_id}`);
    check("R$ 120 por mês, nome Battlepass FORMULADOTA", preapproval.auto_recurring?.transaction_amount === 120 && preapproval.reason === "Battlepass FORMULADOTA" && preapproval.auto_recurring?.frequency_type === "months");
    check("a referência aponta para a assinatura", preapproval.external_reference === `battlepass-${sub.id}`);
    const cancelled = await mp(`/preapproval/${sub.mp_preapproval_id}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    check("a assinatura de verificação foi cancelada no Mercado Pago", cancelled.status === "cancelled", cancelled.status);
  }
  await context.close();
} finally {
  await browser.close();
  const { error: deleteError } = await db.auth.admin.deleteUser(userId);
  check("jogador de teste apagado", !deleteError, deleteError?.message ?? "");
  const { count } = await db.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  check("nenhuma assinatura de verificação ficou no banco", !count, String(count ?? 0));
}
console.log(`\nverificar-producao do Battlepass: falhas: ${failures}`);
process.exit(failures);
