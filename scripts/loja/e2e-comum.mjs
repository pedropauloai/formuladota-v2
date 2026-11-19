// Peças comuns dos roteiros de ponta a ponta da loja (e2e.mjs e e2e-fila.mjs): credenciais de
// teste, servidor local, pagamento no sandbox do Mercado Pago, notificação assinada e o aviso no
// Discord. Nunca imprime credencial.

import { readFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
if (!env.MP_ACCESS_TOKEN?.startsWith("TEST-")) throw new Error("Recusado: o e2e só roda com credencial de teste do Mercado Pago (TEST-).");

// LOJA_E2E_PORT deixa reaproveitar um servidor que já está de pé (o padrão sobe um na 3100).
export const PORT = Number(process.env.LOJA_E2E_PORT ?? 3100);
export const BASE = `http://localhost:${PORT}`;
export const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// O filtro de robô da /api/visita barra "HeadlessChrome": o teste se apresenta como navegador comum.
export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function checker() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASSOU" : "FALHOU"}  ${name}${detail ? `  (${detail})` : ""}`);
    if (!ok) throw new Error(`falhou: ${name}`);
  };
  return { results, check };
}

export async function waitFor(fn, ms, every = 1000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(every);
  }
  return null;
}

export async function startServer() {
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

export function stopServer(server) {
  if (!server) return;
  // No Windows o kill() mata só o shell: o taskkill derruba a árvore inteira do servidor.
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // O servidor já tinha saído.
    }
  } else server.kill();
}

/** Paga no sandbox com cartão de teste aprovado, com a mesma referência do pedido (o que o Checkout Pro gera). */
export async function sandboxCardPayment(orderId, amount, email) {
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
      transaction_amount: amount,
      token: token.id,
      description: "Teste de ponta a ponta da loja",
      installments: 1,
      payment_method_id: "master",
      external_reference: `loja-${orderId}`,
      payer: { email, identification: { type: "CPF", number: "12345678909" } },
    }),
  });
  return payRes.json();
}

/** Notificação do Mercado Pago assinada como o painel dele assina (x-signature). */
export async function webhook(paymentId, secret) {
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

export async function discordMessageFor(orderId) {
  const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` };
  const channels = await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/channels`, { headers }).then((r) => r.json());
  const channel = channels.find((c) => c.type === 0 && c.name === "💰丨vendas");
  if (!channel) return null;
  return waitFor(async () => {
    const messages = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?limit=10`, { headers }).then((r) => r.json());
    return messages.find((m) => m.content.includes("[TESTE]") && m.embeds?.[0]?.footer?.text?.includes(orderId)) ?? null;
  }, 30_000, 2000);
}

export async function orderRow(id) {
  const { data } = await db.from("store_orders").select("*").eq("id", id).single();
  return data;
}

/** Liga a flag da loja para o teste e devolve como estava, para a limpeza restaurar. */
export async function openStoreFlag() {
  const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "loja").single();
  await db.from("feature_flags").update({ enabled: true }).eq("key", "loja");
  return flag?.enabled === true;
}

export async function restoreStoreFlag(wasOn) {
  await db.from("feature_flags").update({ enabled: wasOn }).eq("key", "loja");
}
