/**
 * Script de geração do catálogo estático de heróis Dota 2.
 * Fonte: OpenDota API /api/heroStats (inclui hero_complexity)
 * Saída: src/data/dota-heroes.json com schema D-24 (10 campos)
 *
 * Uso: pnpm gen:heroes
 * Regenerar quando Valve adicionar herói novo (D-25).
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Schema de saída — espelha HeroData em src/lib/queries/heroes.ts
interface HeroOutput {
  id: number;
  slug: string;
  name_pt: string;
  name_en: string;
  roles: string[];
  primary_attr: "str" | "agi" | "int" | "uni";
  complexity: number;
  image_full: string;
  image_icon: string;
  portrait_url: string;
}

// Tipo bruto retornado por /api/heroStats
interface OpenDotaHeroStats {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  roles: string[];
  hero_complexity?: number;
}

const CDN_BASE = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

function buildUrls(slug: string) {
  return {
    image_full: `${CDN_BASE}/${slug}.png`,
    image_icon: `${CDN_BASE}/icons/${slug}.png`,
    // /crops/ = retrato vertical oficial. O antigo /renders/ retorna 404 na CDN
    // da Valve (validado em 2026-06-29 contra os 127 heróis).
    portrait_url: `${CDN_BASE}/crops/${slug}.png`,
  };
}

function mapAttr(attr: string): "str" | "agi" | "int" | "uni" {
  // OpenDota usa "all" para Universal — converter para "uni" conforme schema D-24
  if (attr === "all") return "uni";
  if (attr === "str" || attr === "agi" || attr === "int") return attr;
  return "str"; // fallback seguro
}

async function fetchHeroStats(): Promise<OpenDotaHeroStats[]> {
  const url = "https://api.opendota.com/api/heroStats";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenDota /api/heroStats retornou ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<OpenDotaHeroStats[]>;
}

async function main(): Promise<void> {
  console.log("Buscando heróis na OpenDota API (/api/heroStats)...");

  let rawHeroes: OpenDotaHeroStats[];
  try {
    rawHeroes = await fetchHeroStats();
  } catch (err) {
    console.error("Erro ao buscar /api/heroStats:", err);
    process.exit(1);
  }

  // Mapeia para schema D-24 (10 campos obrigatórios)
  const heroes: HeroOutput[] = rawHeroes
    .filter((h) => h.id && h.name && h.localized_name)
    .map((h) => {
      const slug = h.name.replace(/^npc_dota_hero_/, "");
      const complexity =
        typeof h.hero_complexity === "number" && h.hero_complexity >= 1
          ? h.hero_complexity
          : 1; // fallback 1 (fácil) quando ausente no endpoint

      return {
        id: h.id,
        slug,
        name_pt: h.localized_name, // OpenDota não tem PT nativo — fallback EN
        name_en: h.localized_name,
        roles: h.roles ?? [],
        primary_attr: mapAttr(h.primary_attr),
        complexity,
        ...buildUrls(slug),
      };
    })
    .sort((a, b) => a.id - b.id); // Estabilidade de diff — ordenar por id crescente

  if (heroes.length < 120) {
    console.error(`Aviso: apenas ${heroes.length} heróis encontrados. Esperado >=120. Verifique a API.`);
    process.exit(1);
  }

  // Garante que src/data/ existe
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outDir = resolve(__dirname, "../src/data");
  const outPath = resolve(outDir, "dota-heroes.json");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(heroes, null, 2) + "\n", "utf-8");

  console.log(`Geradas ${heroes.length} heroes em src/data/dota-heroes.json`);
  console.log(`Primeiro herói (amostra): ${JSON.stringify(heroes[0], null, 2)}`);
}

main().catch((err) => {
  console.error("Erro inesperado em gen-heroes:", err);
  process.exit(1);
});
