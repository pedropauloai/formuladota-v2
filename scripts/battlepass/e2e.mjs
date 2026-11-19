// Battlepass de ponta a ponta no localhost, contra o sandbox do Mercado Pago, o banco real (linhas
// is_test) e o canal de vendas do Discord (avisos [TESTE]). Falha alto no primeiro ponto errado.
// Rodar: pnpm battlepass:e2e  (sobe o servidor na 3102, ou reaproveita com BATTLEPASS_E2E_PORT)
//
// O que prova (docs/definicao-de-pronto.md, B4 a B6):
// - Pix de 30 dias: gera na página, o pagamento aprovado ativa por 30 dias, o segundo soma mais 30,
//   a notificação repetida não soma de novo, e a garantia encerra o acesso e avisa o Pedro.
// - Cartão: abre a assinatura de R$ 120 no Mercado Pago, o navegador chega ao checkout, a volta
//   espera a primeira cobrança, e a assinatura abandonada é cancelada no Mercado Pago.
// O sandbox só autoriza cartão com conta de comprador de teste do Mercado Pago: a primeira cobrança
// do cartão se prova com a primeira assinatura real (DoD, "o que o percentual não significa").

import { randomUUID } from "node:crypto";

process.env.LOJA_E2E_PORT ??= process.env.BATTLEPASS_E2E_PORT ?? "3102";
const comum = await import("../loja/e2e-comum.mjs");
const { env, db, BASE, checker, waitFor, startServer, stopServer, createTestBuyer, buyerContext, deleteTestUsers, sandboxRefund, discordContentWith, webhook, sleep } = comum;
const { chromium } = await import("playwright");

const run = randomUUID().slice(0, 8);
const { results, check } = checker();
const DAY = 24 * 60 * 60 * 1000;
const near = (iso, expectedMs, toleranceMs = 10 * 60_000) => Math.abs(Date.parse(iso) - expectedMs) <= toleranceMs;

/** Aprova no sandbox com cartão de teste, na referência do Pix (o Pix de teste não se aprova sozinho). */
async function sandboxApprove(reference, amount, email) {
  const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${env.MP_PUBLIC_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_number: "5031433215406351", expiration_month: 11, expiration_year: 2030, security_code: "123", cardholder: { name: "APRO", identification: { type: "CPF", number: "12345678909" } } }),
  });
  const token = await tokenRes.json();
  if (!token.id) throw new Error(`token de cartão de teste: HTTP ${tokenRes.status}`);
  const payRes = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({ transaction_amount: amount, token: token.id, description: "Teste de ponta a ponta do Battlepass", installments: 1, payment_method_id: "master", external_reference: reference, payer: { email, identification: { type: "CPF", number: "12345678909" } } }),
  });
  return payRes.json();
}

async function mp(path, init = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, { ...init, headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  return response.json();
}

const subOf = async (userId) => (await db.from("subscriptions").select("*").eq("user_id", userId).eq("is_test", true).order("created_at", { ascending: false })).data ?? [];
const paymentsOf = async (userId) => (await db.from("subscription_payments").select("*").eq("user_id", userId).order("created_at", { ascending: true })).data ?? [];
const panelState = (page) => page.locator("[data-bp-estado]").first().getAttribute("data-bp-estado");

async function pixFlow(browser, buyer) {
  const context = await buyerContext(browser, buyer, { desktop: true });
  const page = await context.newPage();
  await page.goto(`${BASE}/planos`, { waitUntil: "networkidle" });
  check("pix: página abre logado sem Battlepass", (await panelState(page)) === "nenhum");

  await page.locator("[data-bp-pagar-pix]").first().click();
  const copia = await page.locator("[data-bp-pix-copia]").first().textContent({ timeout: 30_000 });
  check("pix: código copia e cola na página", /^000201/.test((copia ?? "").trim()), (copia ?? "").trim().slice(0, 12));
  const [first] = (await paymentsOf(buyer.id)).filter((p) => p.status === "pendente");
  const [sub] = await subOf(buyer.id);
  check("pix: pagamento pendente de R$ 120 no livro", first?.amount_cents === 12000 && first.method === "pix" && first.is_test === true);
  check("pix: assinatura do Pix pendente, sem acesso", sub?.provider === "pix" && sub.tier === "battlepass" && sub.status === "pending");

  // Tocar de novo devolve o mesmo Pix: um pendente por pessoa.
  await page.reload({ waitUntil: "networkidle" });
  const again = await page.locator("[data-bp-pix-copia]").first().textContent({ timeout: 15_000 }).catch(() => null);
  check("pix: recarregar mostra o mesmo Pix", (again ?? "").trim() === (copia ?? "").trim());

  const paid = await sandboxApprove(`battlepass-pix-${first.id}`, 120, buyer.email);
  check("pix: pagamento aprovado no sandbox", paid.status === "approved", paid.status);
  const activated = await waitFor(async () => ((await panelState(page)) === "ativo" ? true : null), 60_000, 2000);
  check("pix: a página vira ativa sozinha (conferência com o Mercado Pago)", activated === true);
  const until1 = await page.locator("[data-bp-estado]").first().getAttribute("data-bp-ate");
  check("pix: vale 30 dias", !!until1 && near(until1, Date.now() + 30 * DAY), until1 ?? "");
  check("pix: não renova sozinho", (await page.locator("[data-bp-estado]").first().getAttribute("data-bp-renova")) === "false");
  const after1 = (await paymentsOf(buyer.id)).find((p) => p.id === first.id);
  check("pix: livro marca pago com o período", after1?.status === "pago" && !!after1.period_end);
  const notice = await discordContentWith("pagou 30 dias de Battlepass no Pix");
  check("pix: aviso ao Pedro no canal de vendas", !!notice);

  // Notificação repetida do mesmo pagamento: 200 e nada soma.
  const status = await webhook(paid.id, env.MP_WEBHOOK_SECRET);
  const [subAfterHook] = await subOf(buyer.id);
  check("pix: webhook repetido responde 200 e não soma", status === 200 && near(subAfterHook.next_payment_date, Date.parse(until1), 60_000), String(status));

  // Segundo Pix soma 30 dias a partir do fim do primeiro.
  await page.locator("[data-bp-pagar-pix]").first().click();
  await page.locator("[data-bp-pix-copia]").first().waitFor({ timeout: 30_000 });
  const second = (await paymentsOf(buyer.id)).find((p) => p.status === "pendente");
  const paid2 = await sandboxApprove(`battlepass-pix-${second.id}`, 120, buyer.email);
  check("pix: segundo pagamento aprovado", paid2.status === "approved", paid2.status);
  const extended = await waitFor(async () => {
    const [row] = await subOf(buyer.id);
    return row && near(row.next_payment_date, Date.parse(until1) + 30 * DAY, 60_000) ? row : null;
  }, 60_000, 2000);
  check("pix: segundo Pix soma 30 dias ao fim do primeiro", !!extended);

  // Garantia: devolve os dois pagamentos e encerra o acesso na hora.
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-bp-reembolso]").first().click();
  await page.locator("[data-bp-reembolso-confirmar]").first().click();
  const ended = await waitFor(async () => {
    const state = await panelState(page).catch(() => null);
    return state === "encerrado" || state === "nenhum" ? state : null;
  }, 30_000, 1000);
  check("garantia: a página encerra o acesso", !!ended, ended ?? "");
  const refunded = (await paymentsOf(buyer.id)).filter((p) => p.status === "reembolso_pedido");
  check("garantia: os dois pagamentos marcados para devolver", refunded.length === 2);
  const refundNotice = await discordContentWith("R$ 240,00");
  check("garantia: aviso ao Pedro com o valor a devolver", !!refundNotice && refundNotice.content.includes("garantia"));

  // O Pedro devolve no Mercado Pago: o webhook marca devolvido.
  for (const p of [paid, paid2]) {
    await sandboxRefund(p.id);
    await webhook(p.id, env.MP_WEBHOOK_SECRET);
  }
  const marked = await waitFor(async () => ((await paymentsOf(buyer.id)).filter((p) => p.status === "reembolsado").length === 2 ? true : null), 30_000, 2000);
  check("garantia: reembolso feito no Mercado Pago aparece no livro", marked === true);
  await context.close();
}

async function cardFlow(browser, buyer) {
  const context = await buyerContext(browser, buyer, { desktop: true });
  const page = await context.newPage();
  await page.goto(`${BASE}/planos`, { waitUntil: "networkidle" });
  await Promise.all([page.waitForURL(/mercadopago\.com/, { timeout: 60_000 }), page.locator("[data-bp-assinar-cartao]").first().click()]);
  check("cartão: o navegador chega ao checkout do Mercado Pago", /mercadopago\.com/.test(page.url()), new URL(page.url()).host);
  const [sub] = await subOf(buyer.id);
  check("cartão: assinatura pendente com o ID do Mercado Pago", sub?.provider === "mp" && sub.status === "pending" && !!sub.mp_preapproval_id);
  const preapproval = await mp(`/preapproval/${sub.mp_preapproval_id}`);
  check("cartão: R$ 120 por mês com o nome Battlepass FORMULADOTA", preapproval.auto_recurring?.transaction_amount === 120 && preapproval.reason === "Battlepass FORMULADOTA" && preapproval.auto_recurring?.frequency_type === "months");
  check("cartão: referência aponta para a assinatura", preapproval.external_reference === `battlepass-${sub.id}`);

  // Voltou do checkout sem pagar: a página espera a primeira cobrança e não libera o acesso.
  await page.goto(`${BASE}/planos?assinatura=${sub.id}`, { waitUntil: "networkidle" });
  check("cartão: na volta, espera a cobrança", (await panelState(page)) === "aguardando_cartao");
  const { data: active } = await db.rpc("battlepass_ativo", { p_user_id: buyer.id, p_is_test: true });
  check("cartão: sem cobrança aprovada, sem acesso", active === false);

  // Desistiu e foi para o Pix: a assinatura abandonada é cancelada no Mercado Pago.
  await page.locator("[data-bp-pagar-pix]").first().click();
  await page.locator("[data-bp-pix-copia]").first().waitFor({ timeout: 30_000 });
  const closed = await mp(`/preapproval/${sub.mp_preapproval_id}`);
  const rows = await subOf(buyer.id);
  check("cartão: abandonada vira cancelada no Mercado Pago e no banco", closed.status === "cancelled" && rows.find((r) => r.id === sub.id)?.status === "cancelled");
  await context.close();
}

async function cleanup(ids) {
  // Assinatura e pagamentos saem junto com o perfil (on delete cascade); a assinatura de teste que
  // sobrar no Mercado Pago é cancelada antes.
  for (const id of ids) {
    for (const row of await subOf(id)) {
      if (row.mp_preapproval_id && row.status !== "cancelled") await mp(`/preapproval/${row.mp_preapproval_id}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    }
  }
  await deleteTestUsers(ids);
  const { count } = await db.from("subscriptions").select("id", { count: "exact", head: true }).in("user_id", ids);
  if (count) console.error(`sobrou ${count} assinatura de teste`);
}

const server = await startServer();
const browser = await chromium.launch();
const created = [];
let failed = null;
try {
  const pixBuyer = await createTestBuyer(`bp-pix-${run}@formuladota.com.br`, `Teste BP Pix ${run}`);
  created.push(pixBuyer.id);
  const cardBuyer = await createTestBuyer(`bp-cartao-${run}@formuladota.com.br`, `Teste BP Cartao ${run}`);
  created.push(cardBuyer.id);
  await pixFlow(browser, pixBuyer);
  await cardFlow(browser, cardBuyer);
} catch (err) {
  failed = err;
} finally {
  await browser.close();
  await cleanup(created).catch((err) => console.error("limpeza falhou:", err.message));
  stopServer(server);
}
await sleep(100);
const passed = results.filter((r) => r.ok).length;
console.log(`\nBattlepass e2e: ${passed} de ${results.length} verificações${failed ? `, parou em: ${failed.message}` : ""}`);
process.exit(failed ? 1 : 0);
