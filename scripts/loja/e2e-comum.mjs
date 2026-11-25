// Peças comuns dos roteiros de ponta a ponta da loja (e2e.mjs e e2e-fila.mjs): credenciais de
// teste, servidor local, pagamento no sandbox do Mercado Pago, notificação assinada e o aviso no
// Discord. Nunca imprime credencial.

import { readFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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
  const channel = channels.find((c) => c.type === 0 && c.name === "🧪丨vendas-teste");
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

// ---------- Fila da party: compradores, sessão e live de teste ----------

export const STEAM_BASE = 76561197960265728n;

/** Comprador de teste com Steam vinculada (ID de amigo perto do teto de 32 bits: acima de qualquer conta real). */
export async function createTestBuyer(email, name) {
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw new Error(`usuário de teste ${name}: ${error.message}`);
  const steamId = String(STEAM_BASE + 4294000000n + BigInt(Math.floor(Math.random() * 900000)));
  const { error: steamError } = await db.from("steam_links").insert({ user_id: data.user.id, steam_id_64: steamId, persona: name });
  if (steamError) throw new Error(`Steam de teste ${name}: ${steamError.message}`);
  return { id: data.user.id, email, name, password, steamId, dotaId: String(BigInt(steamId) - STEAM_BASE) };
}

/** Cookies de sessão no formato do site (@supabase/ssr), para o navegador de teste entrar logado. */
export async function sessionCookiesFor(buyer) {
  const jar = new Map();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (list) => list.forEach((cookie) => jar.set(cookie.name, cookie)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: buyer.email, password: buyer.password });
  if (error) throw new Error(`login de teste ${buyer.name}: ${error.message}`);
  return [...jar.values()].filter((c) => c.value).map((c) => ({ name: c.name, value: c.value, domain: "localhost", path: "/", sameSite: "Lax" }));
}

/** Contexto de navegador logado (celular por padrão), em português. */
export async function buyerContext(browser, buyer, options = {}) {
  const phone = options.desktop !== true;
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "pt-BR",
    viewport: phone ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    isMobile: phone,
    hasTouch: phone,
    ...(options.recordVideoDir ? { recordVideo: { dir: options.recordVideoDir, size: phone ? { width: 390, height: 844 } : { width: 1920, height: 1080 } } } : {}),
  });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" }, ...(buyer ? await sessionCookiesFor(buyer) : [])]);
  return context;
}

/** Fila de teste limpa: reservas de teste fora da fila e nenhuma live de teste no ar. */
export async function resetTestQueue() {
  await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
  // Pix de teste abandonado segura a vaga por 10 minutos, e a fila aberta conta essa reserva: vence agora.
  const now = new Date().toISOString();
  await db.from("store_bookings").update({ hold_until: now }).eq("is_test", true).eq("kind", "live").eq("status", "reservado").gt("hold_until", now);
  const { data: open } = await db.from("store_live_sessions").select("id").eq("is_test", true).eq("status", "ao_vivo");
  for (const live of open ?? []) await db.rpc("party_fila_encerrar_live", { p_live_id: live.id });
}

/** Abre uma live de teste (o site de produção nunca mostra) e devolve o id. */
export async function openTestLive(queueSize, seatsPerMatch) {
  const { data, error } = await db.rpc("party_fila_abrir_live", { p_is_test: true, p_party_seats: queueSize, p_seats_per_match: seatsPerMatch, p_youtube_video_id: null });
  if (error || !data) throw new Error(`abrir a live de teste: ${error?.message}`);
  return data;
}

export async function deleteTestUsers(ids) {
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) console.error("apagar usuário de teste falhou:", error.message);
  }
}

/** Reembolso no sandbox, como o Pedro faria no painel do Mercado Pago. */
export async function sandboxRefund(paymentId) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": randomUUID() },
    body: "{}",
  });
  return response.json();
}

/** Mensagem [TESTE] do canal de teste com o trecho dado (avisos sem embed, como a saída da fila). */
export async function discordContentWith(fragment) {
  const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` };
  const channels = await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/channels`, { headers }).then((r) => r.json());
  const channel = channels.find((c) => c.type === 0 && c.name === "🧪丨vendas-teste");
  if (!channel) return null;
  return waitFor(async () => {
    const messages = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages?limit=15`, { headers }).then((r) => r.json());
    return messages.find((m) => m.content.includes("[TESTE]") && m.content.includes(fragment)) ?? null;
  }, 30_000, 2000);
}

// ---------- Trava entre execuções de teste da fila ----------
// Só existe uma live de teste no ar por vez no banco: duas execuções ao mesmo tempo (duas sessões,
// dois terminais) fechariam a live uma da outra. A trava é uma linha de live de teste cancelada,
// que nenhuma tela lê; quem chega depois espera. Expira sozinha em 15 minutos (execução que caiu).
const LOCK_ID = "00000000-0000-4000-8000-00000000e2e0";
const LOCK_TTL_MS = 15 * 60_000;

export async function acquireTestLock(runId, maxWaitMs = LOCK_TTL_MS) {
  await db
    .from("store_live_sessions")
    .upsert(
      { id: LOCK_ID, starts_at: "2026-01-01T00:00:00Z", ends_at: "2026-01-01T00:01:00Z", status: "cancelada", notes: "livre", is_test: true },
      { onConflict: "id", ignoreDuplicates: true }
    );
  const end = Date.now() + maxWaitMs;
  let warned = false;
  while (Date.now() < end) {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("store_live_sessions")
      .update({ notes: `e2e ${runId}`, ends_at: new Date(Date.now() + LOCK_TTL_MS).toISOString() })
      .eq("id", LOCK_ID)
      .or(`notes.eq.livre,ends_at.lt."${now}"`)
      .select("id");
    if (error) throw new Error(`trava da live de teste: ${error.message}`);
    if (data?.length) return;
    if (!warned) console.log("Outra execução de teste da fila está usando a live de teste; esperando a vez...");
    warned = true;
    await sleep(5000);
  }
  throw new Error("a live de teste ficou ocupada por mais de 15 minutos");
}

export async function releaseTestLock(runId) {
  await db.from("store_live_sessions").update({ notes: "livre" }).eq("id", LOCK_ID).eq("notes", `e2e ${runId}`);
}
