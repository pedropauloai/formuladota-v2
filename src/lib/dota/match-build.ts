// Extração da BUILD de um jogador a partir do raw_opendota:
//  - purchases: timeline de compra de itens (purchase_log → ícones por NOME)
//  - skills: ordem de evolução de habilidades (ability_upgrades_arr → ícones por ID)
// Resolve os ícones via os catálogos estáticos (itens/habilidades).

import { itemImageByName, getItemByName } from "@/lib/queries/items";
import { getAbilityById } from "@/lib/queries/abilities";
import type { RawOD, BuildPurchase, BuildSkill } from "@/lib/dota/match-stats";

const CDN = "https://cdn.cloudflare.steamstatic.com";

// Itens "consumíveis/triviais" que poluem a timeline — escondidos por padrão
// (mesma postura do OpenDota, que destaca a build de itens permanentes).
const TRIVIAL = new Set([
  "tango",
  "tango_single",
  "branches",
  "clarity",
  "flask",
  "enchanted_mango",
  "faerie_fire",
  "ward_observer",
  "ward_sentry",
  "ward_dispenser",
  "tpscroll",
  "bottle",
  "dust",
  "smoke_of_deceit",
]);

export function parsePurchases(r: RawOD, includeTrivial = false): BuildPurchase[] {
  const log = r["purchase_log"];
  if (!Array.isArray(log)) return [];
  const out: BuildPurchase[] = [];
  for (const e of log) {
    const entry = e as { time?: unknown; key?: unknown };
    if (typeof entry.key !== "string" || typeof entry.time !== "number") continue;
    if (!includeTrivial && TRIVIAL.has(entry.key)) continue;
    const item = getItemByName(entry.key);
    out.push({
      t: entry.time,
      img: itemImageByName(entry.key),
      dname: item?.dname ?? entry.key,
    });
  }
  return out;
}

export function parseSkills(r: RawOD): BuildSkill[] {
  const arr = r["ability_upgrades_arr"];
  if (!Array.isArray(arr)) return [];
  const out: BuildSkill[] = [];
  for (const id of arr) {
    if (typeof id !== "number") continue;
    const a = getAbilityById(id);
    out.push({
      img: a?.img ? `${CDN}${a.img}` : null,
      dname: a?.dname ?? `Skill ${id}`,
      talent: a ? a.name.startsWith("special_bonus") : false,
    });
  }
  return out;
}
