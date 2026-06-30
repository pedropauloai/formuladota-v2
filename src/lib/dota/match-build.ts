// Extração da BUILD de um jogador (estilo STRATZ): ordem de skills + categorias de
// itens (botas, itens importantes com timing, item neutro). Resolve ícones via os
// catálogos estáticos.

import { itemImageByName, getItemByName, getItemById, isBoots } from "@/lib/queries/items";
import { getAbilityById } from "@/lib/queries/abilities";
import type { RawOD, BuildPurchase, BuildSkill } from "@/lib/dota/match-stats";

const CDN = "https://cdn.cloudflare.steamstatic.com";

// Custo mínimo (ouro) pra um item entrar na timeline de "importantes".
const IMPORTANT_COST = 1400;

interface RawPurchase {
  time: number;
  key: string;
}

function readPurchaseLog(raw: RawOD): RawPurchase[] {
  const log = raw["purchase_log"];
  if (!Array.isArray(log)) return [];
  const out: RawPurchase[] = [];
  for (const e of log) {
    const entry = e as { time?: unknown; key?: unknown };
    if (typeof entry.key === "string" && typeof entry.time === "number") {
      out.push({ time: entry.time, key: entry.key });
    }
  }
  return out;
}

function toPurchase(p: RawPurchase): BuildPurchase {
  const item = getItemByName(p.key);
  return { t: p.time, img: itemImageByName(p.key), dname: item?.dname ?? p.key };
}

/** Botas equipadas (último tier comprado), com o timing da PRIMEIRA bota. */
export function parseBoots(raw: RawOD): BuildPurchase | null {
  const log = readPurchaseLog(raw);
  const boots = log.filter((p) => isBoots(p.key));
  if (!boots.length) return null;
  // O último upgrade representa a bota final; mostramos com seu próprio timing.
  return toPurchase(boots[boots.length - 1]!);
}

/** Itens importantes (caros, não-consumíveis, não-botas), 1ª compra de cada. */
export function parseImportant(raw: RawOD): BuildPurchase[] {
  const log = readPurchaseLog(raw);
  const seen = new Set<string>();
  const out: BuildPurchase[] = [];
  for (const p of log) {
    if (seen.has(p.key) || isBoots(p.key)) continue;
    const item = getItemByName(p.key);
    if (!item || item.cost < IMPORTANT_COST) continue;
    seen.add(p.key);
    out.push(toPurchase(p));
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Item neutro equipado (pelo id no slot neutro do inventário). */
export function parseNeutral(neutralId: number | null | undefined): {
  img: string | null;
  dname: string;
} | null {
  const item = getItemById(neutralId);
  if (!item) return null;
  return { img: `${CDN}${item.img}`, dname: item.dname };
}

export function parseSkills(raw: RawOD): BuildSkill[] {
  const arr = raw["ability_upgrades_arr"];
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
