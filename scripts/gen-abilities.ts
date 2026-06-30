/**
 * Script de geração do catálogo estático de HABILIDADES Dota 2.
 * Fonte: OpenDota /constants/ability_ids (id→nome) + /constants/abilities (nome→meta).
 * Saída: src/data/dota-abilities.json — mapa { [id]: { name, dname, img } }.
 *
 * Uso: pnpm gen:abilities
 *
 * Usado pela aba Builds do placar (/partida/historico/[id]) pra renderizar a ordem
 * de skills a partir dos ids em match_players.raw_opendota.ability_upgrades_arr.
 * Talentos (special_bonus_*) podem não ter ícone → img fica null.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

interface AbilityMeta {
  dname?: string;
  img?: string;
}

type AbilityCatalog = Record<string, { name: string; dname: string; img: string | null }>;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} retornou ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function main(): Promise<void> {
  console.log("Buscando habilidades na OpenDota API...");

  let ids: Record<string, string>;
  let abilities: Record<string, AbilityMeta>;
  try {
    [ids, abilities] = await Promise.all([
      fetchJson<Record<string, string>>("https://api.opendota.com/api/constants/ability_ids"),
      fetchJson<Record<string, AbilityMeta>>("https://api.opendota.com/api/constants/abilities"),
    ]);
  } catch (err) {
    console.error("Erro ao buscar constants:", err);
    process.exit(1);
  }

  const catalog: AbilityCatalog = {};
  for (const [id, name] of Object.entries(ids)) {
    const a = abilities[name];
    if (!a) continue;
    catalog[id] = {
      name,
      dname: a.dname ?? name,
      img: a.img ?? null,
    };
  }

  const count = Object.keys(catalog).length;
  if (count < 1000) {
    console.error(`Aviso: apenas ${count} habilidades. Esperado >=1000. Verifique a API.`);
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outDir = resolve(__dirname, "../src/data");
  const outPath = resolve(outDir, "dota-abilities.json");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n", "utf-8");

  console.log(`Geradas ${count} habilidades em src/data/dota-abilities.json`);
}

main().catch((err) => {
  console.error("Erro inesperado em gen-abilities:", err);
  process.exit(1);
});
