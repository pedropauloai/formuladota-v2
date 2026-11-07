// pnpm loja:e2e: compra de teste de ponta a ponta no localhost, contra o sandbox do Mercado Pago,
// o banco real (pedido marcado is_test) e o Discord real (aviso marcado [TESTE]).
// Critérios 6, 7, 8 e 12 do docs/definicao-de-pronto.md. Sai com código diferente de zero se
// qualquer verificação falhar. Nunca imprime credencial.
//
// Pré-requisito: .env.local com credencial de TESTE do Mercado Pago (TEST-...). O roteiro recusa
// rodar com credencial de produção.

import { readFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
if (!env.MP_ACCESS_TOKEN?.startsWith("TEST-")) throw new Error("Recusado: o e2e só roda com credencial de teste do Mercado Pago (TEST-).");

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const RUN = randomUUID().slice(0, 8);
const SLUG = "e2e-teste";
// Com credencial TEST- o Mercado Pago recusa comprador @testuser.com (erro 4390): e-mail comum passa.
const BUYER_EMAIL = `e2e.${RUN}@formuladota.com.br`;
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) throw new Error(`falhou: ${name}`);
}

async function waitFor(fn, ms, every = 1000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(every);
  }
  return null;
}

async function startServer() {
  const up = await fetch(BASE).then(() => true).catch(() => false);
  if (up) return null;
  const child = spawn(`pnpm exec next dev --turbopack --port ${PORT}`, {
    shell: true,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: BASE },
    stdio: "ignore",
  });
  const ready = await waitFor(() => fetch(`${BASE}/`).then((r) => r.status < 500).catch(() => false), 180_000, 2000);
  if (!ready) throw new Error("o servidor local não subiu em 3 minutos");
  return child;
}

async function setupProduct() {
  const { data: product, error } = await db
    .from("store_products")
    .upsert(
      {
        slug: SLUG,
        title: "Produto de teste",
        summary: "Produto usado só pelo teste de ponta a ponta.",
        delivery_md: "Teste de ponta a ponta: nada é entregue.",
        form_fields: ["discord", "observacoes"],
        // Só aparece com a credencial de teste: a vitrine de produção nunca mostra.
        is_test: true,
        // Quantidade e vaga do mês passam pelo mesmo caminho da mentoria e da vaga na party.
        max_quantity: 3,
        monthly_capacity: 1000,
        active: true,
        display_order: 999,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`produto de teste: ${error.message}`);
  const { error: vErr } = await db
    .from("store_product_variants")
    .upsert({ product_id: product.id, slug: "unico", label: "Opção única", price_cents: 100, active: true }, { onConflict: "product_id,slug" });
  if (vErr) throw new Error(`opção de teste: ${vErr.message}`);
  const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "loja").single();
  await db.from("feature_flags").update({ enabled: true }).eq("key", "loja");
  return { productId: product.id, flagWas: flag?.enabled === true };
}

async function cleanup(setup) {
  if (!setup) return;
  await db.from("store_products").update({ active: false }).eq("id", setup.productId);
  await db.from("feature_flags").update({ enabled: setup.flagWas }).eq("key", "loja");
}

async function fillCheckout(page, method, quantity = 1) {
  await page.goto(`${BASE}/loja/${SLUG}`);
  // Tudo dentro do formulário de compra: o cabeçalho do site tem o próprio botão de enviar (login).
  const form = page.locator("#loja-checkout");
  await form.locator('input[name="name"]').fill("APRO Teste");
  await form.locator('input[name="email"]').fill(BUYER_EMAIL);
  await form.locator('input[name="whatsapp"]').fill("(31) 99999-8888");
  await form.locator('input[name="discord"]').fill(`e2e_${RUN}`);
  await form.locator('textarea[name="observacoes"]').fill(`execução ${RUN}`);
  for (let i = 1; i < quantity; i += 1) await form.getByRole("button", { name: "Aumentar" }).click();
  if (method === "cartao") await form.getByRole("button", { name: /Cartão/ }).click();
  await form.locator('input[name="aceite"]').check();
  await form.locator('button[type="submit"]').click();
}

/** Espera sair da página do produto; se o formulário mostrar erro, falha com o texto dele. */
async function expectLeave(page, pattern) {
  const alert = page.locator('#loja-checkout [role="alert"]');
  const outcome = await Promise.race([
    page.waitForURL(pattern, { timeout: 90_000 }).then(() => null),
    alert.waitFor({ timeout: 90_000 }).then(async () => {
      const fields = await page.locator("#loja-checkout .text-error").allInnerTexts();
      return `${await alert.innerText()} ${fields.join(" | ")}`.trim();
    }),
  ]);
  if (outcome) throw new Error(`o formulário recusou o pedido: ${outcome}`);
}

async function sandboxCardPayment(orderId) {
  const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${env.MP_PUBLIC_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_number: "5031433215406351",
      expiration_month: 11,
      expiration_year: 2030,
      security_code: "123",
      cardholder: { name: "APRO", identification: { type: "CPF", number: "12345678909" } },
    }),
  });
  const token = await tokenRes.json();
  if (!token.id) throw new Error(`token de cartão de teste: HTTP ${tokenRes.status}`);
  const payRes = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      transaction_amount: 1,
      token: token.id,
      description: "Teste de ponta a ponta da loja",
      installments: 1,
      payment_method_id: "master",
      external_reference: `loja-${orderId}`,
      payer: { email: BUYER_EMAIL, identification: { type: "CPF", number: "12345678909" } },
    }),
  });
  return payRes.json();
}

async function webhook(paymentId, secret) {
  const ts = String(Math.floor(Date.now() / 1000));
  const requestId = randomUUID();
  const v1 = createHmac("sha256", secret).update(`id:${paymentId};request-id:${requestId};ts:${ts};`).digest("hex");
  const response = await fetch(`${BASE}/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${v1}` },
    body: JSON.stringify({ id: Date.now(), type: "payment", action: "payment.updated", data: { id: String(paymentId) }, live_mode: false }),
  });
  return response.status;
}

async function discordMessageFor(orderId) {
  const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` };
  const channels = await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/channels`, { headers }).then((r) => r.json());
  const channel = channels.find((c) => c.type === 0 && c.name === "💰丨vendas");
  if (!channel) return null;
  return waitFor(async () => {
    const messages = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?limit=10`, { headers }).then((r) => r.json());
    return messages.find((m) => m.content.includes("[TESTE]") && m.embeds?.[0]?.footer?.text?.includes(orderId)) ?? null;
  }, 30_000, 2000);
}

async function orderRow(id) {
  const { data } = await db.from("store_orders").select("*").eq("id", id).single();
  return data;
}

async function run() {
  const server = await startServer();
  let setup = null;
  let browser = null;
  try {
    setup = await setupProduct();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    // O filtro de robô da /api/visita barra "HeadlessChrome": o teste se apresenta como navegador comum.
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const campaign = `e2e-${RUN}`;
    const beacon = page.waitForResponse((r) => r.url().includes("/api/visita"), { timeout: 60_000 });
    await page.goto(`${BASE}/loja?utm_source=instagram&utm_medium=bio&utm_campaign=${campaign}`);
    const beaconResponse = await beacon;
    check("beacon de visita gravou", beaconResponse.headers()["x-visita"] === "gravada", beaconResponse.headers()["x-visita"]);
    const visit = await waitFor(async () => (await db.from("site_visits").select("id, is_test").eq("utm_campaign", campaign).maybeSingle()).data, 15_000);
    check("visita com UTM gravada em site_visits (critério 12)", !!visit);
    check("visita do localhost marcada como teste (fora da conta do painel)", visit?.is_test === true);

    await fillCheckout(page, "pix", 2);
    await expectLeave(page, /\/loja\/pedido\/[0-9a-f-]{36}/);
    const pixOrderId = page.url().split("/").pop();
    check("Pix gerado na página do pedido (critério 6)", await page.getByText("Copiar código Pix").isVisible());
    const pixOrder = await orderRow(pixOrderId);
    check("pedido Pix pendente com o pagamento do Mercado Pago", pixOrder?.status === "pendente" && !!pixOrder.mp_payment_id && pixOrder.is_test);
    check("pedido herdou a origem da visita", pixOrder?.utm_source === "instagram" && pixOrder?.utm_campaign === campaign);
    check("quantidade 2 cobra o dobro no pedido", pixOrder?.quantity === 2 && pixOrder?.amount_cents === 200, `${pixOrder?.quantity} x, ${pixOrder?.amount_cents} centavos`);

    await fillCheckout(page, "cartao");
    await expectLeave(page, /mercadopago\.com/);
    check("cartão abriu o Checkout Pro do Mercado Pago (critério 8)", /mercadopago\.com/.test(page.url()));
    const { data: cardOrder } = await db.from("store_orders").select("id, status, mp_preference_id").eq("payment_method", "cartao").contains("details", { discord: `e2e_${RUN}` }).single();
    check("pedido de cartão pendente com a preferência", cardOrder?.status === "pendente" && !!cardOrder.mp_preference_id);

    const payment = await sandboxCardPayment(cardOrder.id);
    check("pagamento de teste aprovado no sandbox", payment.status === "approved", `status ${payment.status}`);

    check("webhook com assinatura errada é recusado (critério 7)", (await webhook(payment.id, "segredo-errado")) === 401);
    check("webhook com assinatura certa é aceito (critério 7)", (await webhook(payment.id, env.MP_WEBHOOK_SECRET)) === 200);

    const paid = await waitFor(async () => {
      const row = await orderRow(cardOrder.id);
      return row?.status === "pago" ? row : null;
    }, 20_000);
    check("pedido pago no banco com o valor certo (critério 6)", paid?.paid_amount_cents === 100 && paid?.mp_payment_id === String(payment.id));
    const notified = await waitFor(async () => (await orderRow(cardOrder.id))?.notified_at, 30_000);
    check("aviso de venda marcado como entregue", !!notified);
    check("mensagem [TESTE] no canal de vendas do Discord (critério 6)", !!(await discordMessageFor(cardOrder.id)));

    await page.goto(`${BASE}/loja/pedido/${cardOrder.id}`);
    check("página do pedido mostra o pagamento confirmado", await page.getByText("Pagamento confirmado").isVisible());
  } finally {
    await browser?.close().catch(() => undefined);
    await cleanup(setup).catch((err) => console.error("limpeza falhou:", err.message));
    // No Windows o kill() mata só o shell: o taskkill derruba a árvore inteira do servidor.
    if (server) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
        } catch {
          // O servidor já tinha saído.
        }
      } else server.kill();
    }
  }
}

run()
  .then(() => {
    console.log(`\n${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nE2E FALHOU: ${err.message}`);
    process.exit(1);
  });
