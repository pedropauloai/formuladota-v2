// pnpm loja:e2e: compra de teste de ponta a ponta no localhost, contra o sandbox do Mercado Pago,
// o banco real (pedido marcado is_test) e o Discord real (aviso marcado [TESTE]).
// Critérios 6, 7, 8 e 12 do docs/definicao-de-pronto.md. Sai com código diferente de zero se
// qualquer verificação falhar. Nunca imprime credencial.
//
// Pré-requisito: .env.local com credencial de TESTE do Mercado Pago (TEST-...). O roteiro recusa
// rodar com credencial de produção.

import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, USER_AGENT, checker, db, discordMessageFor, env, orderRow, startServer, stopServer, waitFor, webhook,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const SLUG = "e2e-teste";
// Com credencial TEST- o Mercado Pago recusa comprador @testuser.com (erro 4390): e-mail comum passa.
const BUYER_EMAIL = `e2e.${RUN}@formuladota.com.br`;
const { results, check } = checker();

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
        // Agenda: cada partida ocupa 30 minutos; o teste escolhe o primeiro horário livre.
        booking_mode: "agenda",
        session_minutes: 30,
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
  // Horário de teste nunca fica ocupando a agenda de teste das próximas execuções.
  await db.from("store_bookings").update({ status: "cancelado" }).eq("product_id", setup.productId).eq("is_test", true).in("status", ["reservado", "confirmado"]);
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
  // Primeiro horário livre do primeiro dia da agenda.
  await form.locator('[role="radiogroup"] [role="radio"]').first().click();
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

/**
 * Paga pelo formulário do Mercado Pago dentro do site, com o cartão de teste publicado por ele;
 * o titular "APRO" faz o sandbox aprovar. Cada iframe traz os cinco campos e mostra só o de mesmo id.
 */
async function payWithCardForm(page) {
  const field = (name) => page.frameLocator(`iframe[name="${name}"] >> nth=-1`).locator(`input#${name}`);
  await field("cardNumber").pressSequentially("5031433215406351", { delay: 20 });
  await field("expirationDate").pressSequentially("1130", { delay: 20 });
  await field("securityCode").pressSequentially("123", { delay: 20 });
  await page.locator('input[placeholder*="Maria"]').last().fill("APRO");
  await page.locator('input[placeholder*="999.999.999-99"]').last().fill("12345678909");
  // Valor baixo tem uma parcela só, e aí o formulário não mostra a escolha.
  const installments = page.locator("select").filter({ hasText: "Selecione uma opção" }).last();
  if (await installments.waitFor({ timeout: 8_000 }).then(() => true).catch(() => false)) await installments.selectOption("1");
  await page.getByRole("button", { name: /Pagar/ }).last().click();
  const approved = page.locator('[data-cartao="aprovado"]').waitFor({ timeout: 60_000 }).then(() => null);
  // Só o aviso do formulário de cartão: o anunciador de rotas do Next também tem role="alert".
  const refused = page.locator('[data-cartao] [role="alert"]').waitFor({ timeout: 60_000 }).then(async () => page.locator('[data-cartao] [role="alert"]').innerText());
  return Promise.race([approved, refused]).catch((err) => `sem resposta: ${err.message.slice(0, 120)}`);
}

async function run() {
  const server = await startServer();
  let setup = null;
  let browser = null;
  try {
    setup = await setupProduct();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({ userAgent: USER_AGENT });
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
    const { data: pixBooking } = await db.from("store_bookings").select("status, is_test, hold_until, starts_at, ends_at").eq("order_id", pixOrderId).single();
    check("horário segurado enquanto o Pix não cai", pixBooking?.status === "reservado" && pixBooking?.is_test && !!pixBooking?.hold_until);
    check("duas partidas seguram 60 minutos", Date.parse(pixBooking?.ends_at) - Date.parse(pixBooking?.starts_at) === 60 * 60_000);

    await fillCheckout(page, "cartao");
    await expectLeave(page, /\/loja\/pedido\/[0-9a-f-]{36}/);
    check("cartão fica no site, na página do pedido (critério 8)", /\/loja\/pedido\//.test(page.url()) && !/mercadopago\.com/.test(page.url()));
    // Campo seguro do número do cartão: só existe quando o formulário do Mercado Pago montou de fato.
    const brick = await waitFor(async () => ((await page.locator('iframe[name="cardNumber"][src*="secure-fields.mercadopago.com"]').count()) > 0 ? true : null), 30_000);
    check("formulário de cartão do Mercado Pago aberto na página", !!brick);
    const { data: cardOrder } = await db.from("store_orders").select("id, status, mp_preference_id").eq("payment_method", "cartao").contains("details", { discord: `e2e_${RUN}` }).single();
    check("pedido de cartão pendente, sem Checkout Pro", cardOrder?.status === "pendente" && !cardOrder.mp_preference_id);

    const refusal = await payWithCardForm(page);
    check("cartão de teste aprovado no formulário do site", refusal === null, refusal ?? "");
    const paid = await waitFor(async () => {
      const row = await orderRow(cardOrder.id);
      return row?.status === "pago" ? row : null;
    }, 20_000);
    check("pedido pago no banco com o valor certo (critério 6)", paid?.paid_amount_cents === 100 && !!paid?.mp_payment_id);
    const refreshed = await page.getByText("Pagamento confirmado").waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
    check("página do pedido se atualiza sozinha depois do cartão", refreshed);

    const paymentId = paid?.mp_payment_id ?? "0";
    check("webhook com assinatura errada é recusado (critério 7)", (await webhook(paymentId, "segredo-errado")) === 401);
    check("webhook com assinatura certa é aceito (critério 7)", (await webhook(paymentId, env.MP_WEBHOOK_SECRET)) === 200);
    const notified = await waitFor(async () => (await orderRow(cardOrder.id))?.notified_at, 30_000);
    check("aviso de venda marcado como entregue", !!notified);
    check("mensagem [TESTE] no canal de teste do Discord (critério 6)", !!(await discordMessageFor(cardOrder.id)));

    const { data: cardBooking } = await db.from("store_bookings").select("status, hold_until").eq("order_id", cardOrder.id).single();
    check("pagamento aprovado confirma o horário", cardBooking?.status === "confirmado" && cardBooking?.hold_until === null);

    await page.goto(`${BASE}/loja/pedido/${cardOrder.id}`);
    check("página do pedido mostra o pagamento confirmado", await page.getByText("Pagamento confirmado").isVisible());
    check("página do pedido mostra o horário confirmado", await page.getByText("Confirmado", { exact: true }).isVisible());
    const ics = await fetch(`${BASE}/loja/pedido/${cardOrder.id}/agenda`);
    const icsText = await ics.text();
    check("arquivo de agenda (.ics) com o horário", ics.status === 200 && (ics.headers.get("content-type") ?? "").includes("text/calendar") && icsText.includes("BEGIN:VEVENT"));
  } finally {
    await browser?.close().catch(() => undefined);
    await cleanup(setup).catch((err) => console.error("limpeza falhou:", err.message));
    stopServer(server);
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
