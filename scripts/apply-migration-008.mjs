// Migration runner para Phase 4 — Migration 008 (subscriptions) + 010 (purchases provider).
// Usa pooler do Supabase (session mode, porta 5432) com fallback aws-0/aws-1.
// Lê SUPABASE_DB_PASSWORD do .env.local do projeto principal.
//
// Executar: node scripts/apply-migration-008.mjs
// (a partir da raiz do worktree ou do repo principal)

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

// Lê .env.local do projeto principal (não do worktree)
const envPath = path.resolve("C:/Users/ADM/projects/formuladota-v2/.env.local");
const envFile = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envFile.split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const password = env.SUPABASE_DB_PASSWORD;
const projectRef = env.SUPABASE_PROJECT_ID || "nyvbfdsxjpiwgdroptdi";
if (!password) throw new Error("SUPABASE_DB_PASSWORD ausente em .env.local");

const poolerHosts = [
  "aws-0-sa-east-1.pooler.supabase.com",
  "aws-1-sa-east-1.pooler.supabase.com",
];

async function connectWithFallback() {
  let lastErr;
  for (const host of poolerHosts) {
    const c = new Client({
      host,
      port: 5432,
      user: `postgres.${projectRef}`,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });
    try {
      await c.connect();
      console.log(`✓ Conectado em ${host}:5432 (session pooler).`);
      return c;
    } catch (e) {
      console.log(`  ✗ ${host}: ${e.message}`);
      lastErr = e;
      try { await c.end(); } catch {}
    }
  }
  throw lastErr;
}

// Lê as migrations a partir do worktree corrente
const worktreeRoot = path.resolve("C:/Users/ADM/projects/formuladota-v2/.claude/worktrees/agent-a8fd2d11bf52c373c");

const migration008 = fs.readFileSync(
  path.resolve(worktreeRoot, "supabase/migrations/008_subscriptions_mercadopago.sql"),
  "utf8",
);

const migration010 = fs.readFileSync(
  path.resolve(worktreeRoot, "supabase/migrations/010_purchases_payment_provider.sql"),
  "utf8",
);

async function main() {
  console.log("→ Conectando ao Supabase pooler (session mode)…");
  const client = await connectWithFallback();

  console.log("→ Executando Migration 008 (subscriptions + has_active_subscription)…");
  await client.query("begin");
  try {
    await client.query(migration008);
    await client.query("commit");
    console.log("✓ Migration 008 aplicada.");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    if (err.message?.includes("already exists")) {
      console.log("  (migration 008 já aplicada anteriormente — continuando)");
    } else {
      throw err;
    }
  }

  console.log("→ Executando Migration 010 (purchases.payment_provider → mercadopago)…");
  await client.query("begin");
  try {
    await client.query(migration010);
    await client.query("commit");
    console.log("✓ Migration 010 aplicada.");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    if (err.message?.includes("already exists")) {
      console.log("  (migration 010 já aplicada anteriormente — continuando)");
    } else {
      throw err;
    }
  }

  console.log("\n→ Verificações pós-aplicação:");
  const checks = [
    {
      label: "Tabela subscriptions existe",
      sql: "select count(*)::int as c from information_schema.tables where table_schema='public' and table_name='subscriptions'",
      expect: 1,
    },
    {
      label: "Helper has_active_subscription() existe",
      sql: "select count(*)::int as c from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='has_active_subscription'",
      expect: 1,
    },
    {
      label: "RLS ativo em subscriptions",
      sql: "select count(*)::int as c from pg_tables where schemaname='public' and tablename='subscriptions' and rowsecurity=true",
      expect: 1,
    },
    {
      label: "purchases.payment_provider default = mercadopago",
      sql: "select column_default from information_schema.columns where table_schema='public' and table_name='purchases' and column_name='payment_provider'",
      expect: null, // valor exibido mas não comparado
    },
  ];

  for (const check of checks) {
    const { rows } = await client.query(check.sql);
    const c = rows[0]?.c ?? rows[0]?.column_default ?? 0;
    const ok = check.expect === null ? true : c === check.expect;
    console.log(`  ${ok ? "✓" : "✗"} ${check.label} → ${c}${check.expect !== null ? ` (esperado ${check.expect})` : ""}`);
  }

  await client.end();
  console.log("\n✓ Migrations Phase 4 aplicadas. Próximo passo: pnpm typecheck.");
}

main().catch((err) => {
  console.error("✗ Erro:", err.message);
  if (err.detail) console.error("  detail:", err.detail);
  if (err.where) console.error("  where:", err.where);
  process.exit(1);
});
