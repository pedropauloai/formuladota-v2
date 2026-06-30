/**
 * Script de geração do catálogo estático de ITENS Dota 2.
 * Fonte: OpenDota /api/constants/items (id, dname, img).
 * Saída: src/data/dota-items.json — mapa { [id]: { dname, img } }.
 *
 * Uso: pnpm gen:items
 * Regenerar quando Valve adicionar itens novos (mesma política dos heróis, D-25).
 *
 * Usado pelo placar pós-jogo (/partida/historico/[id]) pra renderizar os ícones
 * de inventário a partir dos IDs numéricos gravados em match_players.items.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Forma bruta de cada item em /constants/items (só o que precisamos).
interface OpenDotaItem {
  id?: number;
  dname?: string;
  img?: string; // path relativo no CDN Valve (ex "/apps/dota2/.../blink.png?t=...")
}

type ItemsConstants = Record<string, OpenDotaItem>;

// id → { name, dname, img } — chave string porque JSON não tem chave numérica.
// `name` = chave interna do item (ex "blink"); usado pra casar com purchase_log,
// que referencia itens por nome, não por id.
type ItemCatalog = Record<string, { name: string; dname: string; img: string }>;

async function fetchItems(): Promise<ItemsConstants> {
  const url = "https://api.opendota.com/api/constants/items";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenDota /constants/items retornou ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<ItemsConstants>;
}

async function main(): Promise<void> {
  console.log("Buscando itens na OpenDota API (/constants/items)...");

  let raw: ItemsConstants;
  try {
    raw = await fetchItems();
  } catch (err) {
    console.error("Erro ao buscar /constants/items:", err);
    process.exit(1);
  }

  const catalog: ItemCatalog = {};
  for (const [name, item] of Object.entries(raw)) {
    if (typeof item.id !== "number" || !item.img) continue;
    catalog[String(item.id)] = {
      name,
      dname: item.dname ?? "Item",
      img: item.img,
    };
  }

  const count = Object.keys(catalog).length;
  if (count < 200) {
    console.error(`Aviso: apenas ${count} itens encontrados. Esperado >=200. Verifique a API.`);
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outDir = resolve(__dirname, "../src/data");
  const outPath = resolve(outDir, "dota-items.json");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n", "utf-8");

  console.log(`Gerados ${count} itens em src/data/dota-items.json`);
}

main().catch((err) => {
  console.error("Erro inesperado em gen-items:", err);
  process.exit(1);
});
