// Catálogo completo de heróis Dota 2 (atualizado 2026-05).
// hero.name = nome interno OpenDota (usado no CDN de ícones)
// hero.display = nome em PT/EN amigável
// hero.id = ID oficial Valve
//
// Ícone: https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{name}.png

export interface DotaHero {
  id: number;
  name: string;
  display: string;
  primary: "str" | "agi" | "int" | "uni";
}

export const DOTA_HEROES: DotaHero[] = [
  { id: 1, name: "antimage", display: "Anti-Mage", primary: "agi" },
  { id: 2, name: "axe", display: "Axe", primary: "str" },
  { id: 3, name: "bane", display: "Bane", primary: "int" },
  { id: 4, name: "bloodseeker", display: "Bloodseeker", primary: "agi" },
  { id: 5, name: "crystal_maiden", display: "Crystal Maiden", primary: "int" },
  { id: 6, name: "drow_ranger", display: "Drow Ranger", primary: "agi" },
  { id: 7, name: "earthshaker", display: "Earthshaker", primary: "str" },
  { id: 8, name: "juggernaut", display: "Juggernaut", primary: "agi" },
  { id: 9, name: "mirana", display: "Mirana", primary: "agi" },
  { id: 10, name: "morphling", display: "Morphling", primary: "agi" },
  { id: 11, name: "nevermore", display: "Shadow Fiend", primary: "agi" },
  { id: 12, name: "phantom_lancer", display: "Phantom Lancer", primary: "agi" },
  { id: 13, name: "puck", display: "Puck", primary: "uni" },
  { id: 14, name: "pudge", display: "Pudge", primary: "str" },
  { id: 15, name: "razor", display: "Razor", primary: "agi" },
  { id: 16, name: "sand_king", display: "Sand King", primary: "str" },
  { id: 17, name: "storm_spirit", display: "Storm Spirit", primary: "uni" },
  { id: 18, name: "sven", display: "Sven", primary: "str" },
  { id: 19, name: "tiny", display: "Tiny", primary: "str" },
  { id: 20, name: "vengefulspirit", display: "Vengeful Spirit", primary: "agi" },
  { id: 21, name: "windrunner", display: "Windranger", primary: "int" },
  { id: 22, name: "zuus", display: "Zeus", primary: "int" },
  { id: 23, name: "kunkka", display: "Kunkka", primary: "str" },
  { id: 25, name: "lina", display: "Lina", primary: "uni" },
  { id: 26, name: "lion", display: "Lion", primary: "int" },
  { id: 27, name: "shadow_shaman", display: "Shadow Shaman", primary: "int" },
  { id: 28, name: "slardar", display: "Slardar", primary: "str" },
  { id: 29, name: "tidehunter", display: "Tidehunter", primary: "str" },
  { id: 30, name: "witch_doctor", display: "Witch Doctor", primary: "int" },
  { id: 31, name: "lich", display: "Lich", primary: "int" },
  { id: 32, name: "riki", display: "Riki", primary: "agi" },
  { id: 33, name: "enigma", display: "Enigma", primary: "int" },
  { id: 34, name: "tinker", display: "Tinker", primary: "int" },
  { id: 35, name: "sniper", display: "Sniper", primary: "agi" },
  { id: 36, name: "necrolyte", display: "Necrophos", primary: "int" },
  { id: 37, name: "warlock", display: "Warlock", primary: "int" },
  { id: 38, name: "beastmaster", display: "Beastmaster", primary: "str" },
  { id: 39, name: "queenofpain", display: "Queen of Pain", primary: "uni" },
  { id: 40, name: "venomancer", display: "Venomancer", primary: "agi" },
  { id: 41, name: "faceless_void", display: "Faceless Void", primary: "agi" },
  { id: 42, name: "skeleton_king", display: "Wraith King", primary: "str" },
  { id: 43, name: "death_prophet", display: "Death Prophet", primary: "int" },
  { id: 44, name: "phantom_assassin", display: "Phantom Assassin", primary: "agi" },
  { id: 45, name: "pugna", display: "Pugna", primary: "int" },
  { id: 46, name: "templar_assassin", display: "Templar Assassin", primary: "agi" },
  { id: 47, name: "viper", display: "Viper", primary: "agi" },
  { id: 48, name: "luna", display: "Luna", primary: "agi" },
  { id: 49, name: "dragon_knight", display: "Dragon Knight", primary: "str" },
  { id: 50, name: "dazzle", display: "Dazzle", primary: "int" },
  { id: 51, name: "rattletrap", display: "Clockwerk", primary: "str" },
  { id: 52, name: "leshrac", display: "Leshrac", primary: "uni" },
  { id: 53, name: "furion", display: "Nature's Prophet", primary: "int" },
  { id: 54, name: "life_stealer", display: "Lifestealer", primary: "str" },
  { id: 55, name: "dark_seer", display: "Dark Seer", primary: "int" },
  { id: 56, name: "clinkz", display: "Clinkz", primary: "agi" },
  { id: 57, name: "omniknight", display: "Omniknight", primary: "str" },
  { id: 58, name: "enchantress", display: "Enchantress", primary: "int" },
  { id: 59, name: "huskar", display: "Huskar", primary: "str" },
  { id: 60, name: "night_stalker", display: "Night Stalker", primary: "str" },
  { id: 61, name: "broodmother", display: "Broodmother", primary: "agi" },
  { id: 62, name: "bounty_hunter", display: "Bounty Hunter", primary: "agi" },
  { id: 63, name: "weaver", display: "Weaver", primary: "agi" },
  { id: 64, name: "jakiro", display: "Jakiro", primary: "int" },
  { id: 65, name: "batrider", display: "Batrider", primary: "uni" },
  { id: 66, name: "chen", display: "Chen", primary: "int" },
  { id: 67, name: "spectre", display: "Spectre", primary: "agi" },
  { id: 68, name: "ancient_apparition", display: "Ancient Apparition", primary: "int" },
  { id: 69, name: "doom_bringer", display: "Doom", primary: "str" },
  { id: 70, name: "ursa", display: "Ursa", primary: "agi" },
  { id: 71, name: "spirit_breaker", display: "Spirit Breaker", primary: "str" },
  { id: 72, name: "gyrocopter", display: "Gyrocopter", primary: "agi" },
  { id: 73, name: "alchemist", display: "Alchemist", primary: "str" },
  { id: 74, name: "invoker", display: "Invoker", primary: "uni" },
  { id: 75, name: "silencer", display: "Silencer", primary: "uni" },
  { id: 76, name: "obsidian_destroyer", display: "Outworld Destroyer", primary: "uni" },
  { id: 77, name: "lycan", display: "Lycan", primary: "uni" },
  { id: 78, name: "brewmaster", display: "Brewmaster", primary: "uni" },
  { id: 79, name: "shadow_demon", display: "Shadow Demon", primary: "int" },
  { id: 80, name: "lone_druid", display: "Lone Druid", primary: "agi" },
  { id: 81, name: "chaos_knight", display: "Chaos Knight", primary: "str" },
  { id: 82, name: "meepo", display: "Meepo", primary: "uni" },
  { id: 83, name: "treant", display: "Treant Protector", primary: "str" },
  { id: 84, name: "ogre_magi", display: "Ogre Magi", primary: "uni" },
  { id: 85, name: "undying", display: "Undying", primary: "str" },
  { id: 86, name: "rubick", display: "Rubick", primary: "uni" },
  { id: 87, name: "disruptor", display: "Disruptor", primary: "int" },
  { id: 88, name: "nyx_assassin", display: "Nyx Assassin", primary: "agi" },
  { id: 89, name: "naga_siren", display: "Naga Siren", primary: "agi" },
  { id: 90, name: "keeper_of_the_light", display: "Keeper of the Light", primary: "int" },
  { id: 91, name: "wisp", display: "Io", primary: "uni" },
  { id: 92, name: "visage", display: "Visage", primary: "int" },
  { id: 93, name: "slark", display: "Slark", primary: "agi" },
  { id: 94, name: "medusa", display: "Medusa", primary: "agi" },
  { id: 95, name: "troll_warlord", display: "Troll Warlord", primary: "agi" },
  { id: 96, name: "centaur", display: "Centaur Warrunner", primary: "str" },
  { id: 97, name: "magnataur", display: "Magnus", primary: "uni" },
  { id: 98, name: "shredder", display: "Timbersaw", primary: "uni" },
  { id: 99, name: "bristleback", display: "Bristleback", primary: "str" },
  { id: 100, name: "tusk", display: "Tusk", primary: "str" },
  { id: 101, name: "skywrath_mage", display: "Skywrath Mage", primary: "int" },
  { id: 102, name: "abaddon", display: "Abaddon", primary: "uni" },
  { id: 103, name: "elder_titan", display: "Elder Titan", primary: "uni" },
  { id: 104, name: "legion_commander", display: "Legion Commander", primary: "uni" },
  { id: 105, name: "techies", display: "Techies", primary: "int" },
  { id: 106, name: "ember_spirit", display: "Ember Spirit", primary: "uni" },
  { id: 107, name: "earth_spirit", display: "Earth Spirit", primary: "uni" },
  { id: 108, name: "abyssal_underlord", display: "Underlord", primary: "str" },
  { id: 109, name: "terrorblade", display: "Terrorblade", primary: "agi" },
  { id: 110, name: "phoenix", display: "Phoenix", primary: "uni" },
  { id: 111, name: "oracle", display: "Oracle", primary: "int" },
  { id: 112, name: "winter_wyvern", display: "Winter Wyvern", primary: "int" },
  { id: 113, name: "arc_warden", display: "Arc Warden", primary: "agi" },
  { id: 114, name: "monkey_king", display: "Monkey King", primary: "agi" },
  { id: 119, name: "dark_willow", display: "Dark Willow", primary: "uni" },
  { id: 120, name: "pangolier", display: "Pangolier", primary: "uni" },
  { id: 121, name: "grimstroke", display: "Grimstroke", primary: "int" },
  { id: 123, name: "hoodwink", display: "Hoodwink", primary: "agi" },
  { id: 126, name: "void_spirit", display: "Void Spirit", primary: "uni" },
  { id: 128, name: "snapfire", display: "Snapfire", primary: "uni" },
  { id: 129, name: "mars", display: "Mars", primary: "str" },
  { id: 131, name: "ringmaster", display: "Ringmaster", primary: "int" },
  { id: 135, name: "dawnbreaker", display: "Dawnbreaker", primary: "str" },
  { id: 136, name: "marci", display: "Marci", primary: "uni" },
  { id: 137, name: "primal_beast", display: "Primal Beast", primary: "str" },
  { id: 138, name: "muerta", display: "Muerta", primary: "int" },
  { id: 145, name: "kez", display: "Kez", primary: "agi" },
];

const HERO_BY_ID = new Map(DOTA_HEROES.map((h) => [h.id, h]));

export function getHeroById(id: number): DotaHero | null {
  return HERO_BY_ID.get(id) ?? null;
}

export function getHeroIconUrl(name: string): string {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${name}.png`;
}

/**
 * Busca substring case-insensitive em display ou name.
 * Usado pra filtro de busca de heróis no UI.
 */
export function searchHeroes(query: string, limit = 12): DotaHero[] {
  const q = query.trim().toLowerCase();
  if (!q) return DOTA_HEROES.slice(0, limit);
  return DOTA_HEROES.filter(
    (h) =>
      h.display.toLowerCase().includes(q) ||
      h.name.toLowerCase().includes(q)
  ).slice(0, limit);
}
