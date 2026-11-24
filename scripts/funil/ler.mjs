// Leitura do funil da home (só leitura): das sessões do Brasil que entraram pela home, quantas
// chegaram à fila da party, e quantas vagas foram pagas pelo site no período. Sessões de teste e de
// fora do Brasil aparecem à parte. Como usar e o critério do teste: docs/funil-da-home.md.
//
//   node scripts/funil/ler.mjs                     últimos 14 dias
//   node scripts/funil/ler.mjs --desde 2026-11-24  a partir de uma data (Brasília)
//   node scripts/funil/ler.mjs --desde 2026-11-24 --ate 2026-12-08
//
// Precisa do .env.local com a chave de serviço do Supabase. Nunca imprime credencial.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
// Datas em Brasília (UTC-3, sem horário de verão).
const dia = (iso) => new Date(`${iso}T00:00:00-03:00`);
const desde = arg("--desde") ? dia(arg("--desde")) : new Date(Date.now() - 14 * 86_400_000);
const ate = arg("--ate") ? new Date(dia(arg("--ate")).getTime() + 86_400_000) : new Date();

// Mesma regra de src/lib/funil/paginas.ts (isQueuePath): a fila é a /party, e a /grupo em espanhol.
const QUEUE_PATHS = new Set(["/party", "/grupo"]);
const PARTY_SLUG = "vaga-na-party";

async function todas(tabela, colunas, filtro) {
  let linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtro(db.from(tabela).select(colunas)).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas = linhas.concat(data);
    if (data.length < 1000) return linhas;
  }
}

const periodo = (q) => q.gte("created_at", desde.toISOString()).lt("created_at", ate.toISOString());
const visitas = await todas("site_visits", "session_id, path, country, is_test, created_at", periodo);
const ids = visitas.map((v) => v.session_id);
const paginas = [];
for (let i = 0; i < ids.length; i += 200) {
  paginas.push(...(await todas("site_pageviews", "session_id, path, created_at", (q) => q.in("session_id", ids.slice(i, i + 200)))));
}
const porSessao = new Map();
for (const p of paginas) porSessao.set(p.session_id, (porSessao.get(p.session_id) ?? new Set()).add(p.path));

const { data: primeira } = await db.from("site_pageviews").select("created_at").eq("is_test", false).order("created_at").limit(1);
const { data: produto } = await db.from("store_products").select("id").eq("slug", PARTY_SLUG).maybeSingle();
const { data: pagos } = await periodo(db.from("store_orders").select("id, status, product_id, created_at"))
  .eq("is_test", false)
  .eq("status", "pago")
  .eq("product_id", produto?.id ?? "00000000-0000-0000-0000-000000000000");

function contar(grupo) {
  const daHome = grupo.filter((v) => v.path === "/");
  const chegou = (v) => QUEUE_PATHS.has(v.path) || [...(porSessao.get(v.session_id) ?? [])].some((p) => QUEUE_PATHS.has(p));
  const homeNaFila = daHome.filter(chegou).length;
  return {
    sessoes: grupo.length,
    entraramPelaHome: daHome.length,
    homeChegouNaFila: homeNaFila,
    taxa: daHome.length ? `${((100 * homeNaFila) / daHome.length).toFixed(1)}%` : "sem sessões",
    entraramPelaFila: grupo.filter((v) => QUEUE_PATHS.has(v.path)).length,
    comPaginasGravadas: grupo.filter((v) => porSessao.has(v.session_id)).length,
  };
}

const reais = visitas.filter((v) => !v.is_test);
const fmt = (d) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
console.log(`Período: ${fmt(desde)} até ${fmt(ate)} (Brasília)`);
console.log(`Páginas por sessão gravadas desde: ${primeira?.[0] ? fmt(new Date(primeira[0].created_at)) : "ainda nenhuma"}`);
console.log("Brasil (conta para o teste):", JSON.stringify(contar(reais.filter((v) => v.country === "BR"))));
console.log("Fora do Brasil ou sem país (à parte):", JSON.stringify(contar(reais.filter((v) => v.country !== "BR"))));
console.log("Sessões de teste (à parte):", visitas.length - reais.length);
console.log("Vagas na party pagas pelo site:", pagos?.length ?? 0);
