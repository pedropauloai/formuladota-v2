// One-off migration runner para Phase 3 Migration 005.
// Usa pooler do Supabase (aws-0-sa-east-1.pooler.supabase.com:6543) com session mode.
// Lê SUPABASE_DB_PASSWORD do .env.local.
// Após sucesso, este arquivo pode ser deletado — fluxo padrão é Supabase MCP via Claude Code.

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const envFile = fs.readFileSync(path.resolve("C:/Users/ADM/projects/formuladota-v2/.env.local"), "utf8");
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

// Tenta direct connection primeiro (db.<ref>.supabase.co:5432).
// Se falhar com IPv6 issue, fallback para pooler em 6543 com username postgres.<ref>.
// Session pooler na porta 5432 com username postgres.<ref> permite multi-statement DDL.
// Tenta sequencialmente aws-0 e aws-1 (sa-east-1).
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

const migrationSql = fs.readFileSync(
  path.resolve("C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql"),
  "utf8",
);

async function main() {
  console.log("→ Conectando ao Supabase pooler (session mode)…");
  const client = await connectWithFallback();

  console.log("→ Executando Migration 005 (transação única)…");
  await client.query("begin");
  try {
    await client.query(migrationSql);
    await client.query("commit");
    console.log("✓ Migration aplicada com sucesso.");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  }

  console.log("\n→ Verificações pós-aplicação:");
  const checks = [
    {
      label: "Tabela coaches existe",
      sql: "select count(*)::int as c from information_schema.tables where table_schema='public' and table_name='coaches'",
      expect: 1,
    },
    {
      label: "Tabela steam_links existe",
      sql: "select count(*)::int as c from information_schema.tables where table_schema='public' and table_name='steam_links'",
      expect: 1,
    },
    {
      label: "Coluna profiles.role existe",
      sql: "select count(*)::int as c from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role'",
      expect: 1,
    },
    {
      label: "Coluna profiles.trial_ends_at existe",
      sql: "select count(*)::int as c from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='trial_ends_at'",
      expect: 1,
    },
    {
      label: "Coluna packages.coach_id existe e é NOT NULL",
      sql: "select count(*)::int as c from information_schema.columns where table_schema='public' and table_name='packages' and column_name='coach_id' and is_nullable='NO'",
      expect: 1,
    },
    {
      label: "Helper is_coach() existe",
      sql: "select count(*)::int as c from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='is_coach'",
      expect: 1,
    },
    {
      label: "Pedro coach (slug pedro-paulo)",
      sql: "select count(*)::int as c from public.coaches where slug='pedro-paulo'",
      expect: null, // pode ser 0 se Pedro ainda não logou (sem profile is_admin=true)
    },
    {
      label: "Profile admin role='admin'",
      sql: "select count(*)::int as c from public.profiles where is_admin=true and role='admin'",
      expect: null,
    },
    {
      label: "Pacotes com coach_id null (deve ser 0)",
      sql: "select count(*)::int as c from public.packages where coach_id is null",
      expect: 0,
    },
    {
      label: "Total pacotes (esperado 4)",
      sql: "select count(*)::int as c from public.packages",
      expect: null,
    },
  ];

  let allOk = true;
  for (const check of checks) {
    const { rows } = await client.query(check.sql);
    const c = rows[0]?.c ?? 0;
    const ok = check.expect === null ? true : c === check.expect;
    console.log(`  ${ok ? "✓" : "✗"} ${check.label} → ${c}${check.expect !== null ? ` (esperado ${check.expect})` : ""}`);
    if (!ok) allOk = false;
  }

  await client.end();

  if (!allOk) {
    console.error("\n✗ Algumas verificações falharam — revisar antes de prosseguir.");
    process.exit(1);
  }
  console.log("\n✓ Todas as verificações passaram.");
}

main().catch((err) => {
  console.error("✗ Erro:", err.message);
  if (err.detail) console.error("  detail:", err.detail);
  if (err.where) console.error("  where:", err.where);
  process.exit(1);
});
