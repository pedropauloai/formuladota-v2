---
phase: 09-perfil-dota-social
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - next.config.ts
  - src/data/dota-heroes.json
  - src/lib/queries/heroes.ts
  - scripts/gen-heroes.ts
  - package.json
autonomous: true
requirements:
  - D-09
  - D-23
  - D-24
  - D-25
  - C14
must_haves:
  truths:
    - "next/image consegue carregar URLs https://cdn.cloudflare.steamstatic.com/... sem erro de runtime"
    - "src/data/dota-heroes.json existe com >=127 entries, schema {id, slug, name_pt, name_en, roles[], primary_attr, complexity, image_full, image_icon, portrait_url} (10 chaves — D-24 mandatório)"
    - "src/lib/queries/heroes.ts exporta getHeroBySlug, searchHeroes, getAllHeroes, isValidHeroSlug e interface HeroData (com complexity: number)"
    - "pnpm gen:heroes regenera dota-heroes.json a partir da OpenDota API"
  artifacts:
    - path: "next.config.ts"
      provides: "remotePatterns whitelist com Valve CDNs"
      contains: "cdn.cloudflare.steamstatic.com"
    - path: "src/data/dota-heroes.json"
      provides: "Catálogo estático 127 heróis com schema expandido D-24 (10 campos)"
      min_lines: 100
    - path: "src/lib/queries/heroes.ts"
      provides: "Helpers tipados de lookup/busca de heróis"
      exports: ["getHeroBySlug", "searchHeroes", "getAllHeroes", "isValidHeroSlug", "HeroData"]
    - path: "scripts/gen-heroes.ts"
      provides: "Script regenerador OpenDota → JSON"
  key_links:
    - from: "src/lib/queries/heroes.ts"
      to: "src/data/dota-heroes.json"
      via: "import direto do JSON estático"
      pattern: "import.*dota-heroes.json"
    - from: "package.json"
      to: "scripts/gen-heroes.ts"
      via: "script npm gen:heroes"
      pattern: "\"gen:heroes\""
---

<objective>
Criar a fundação de dados/configuração que todos os componentes de hero portrait + picker da Phase 9 dependem.

Purpose: Sem `cdn.cloudflare.steamstatic.com` no whitelist do `next.config.ts`, qualquer `<Image>` de hero portrait quebra em runtime (pitfall 4 do RESEARCH.md). E sem o JSON expandido com `portrait_url` + `roles[]` + `complexity`, o HeroPicker e o hero portrait background do /me não conseguem renderizar nem indicar dificuldade.

Output: `next.config.ts` patcheado, `src/data/dota-heroes.json` gerado com 127 heróis no schema expandido D-24 (10 campos), helpers tipados em `src/lib/queries/heroes.ts`, script `scripts/gen-heroes.ts` + npm script `gen:heroes` pra Pedro regenerar quando Valve adicionar herói novo.

Endereça decisões: D-09 (hero portrait via slug), D-23 (bundle JSON estático), **D-24 (schema OpenDota COMPLETO — 10 campos incluindo `complexity`)**, D-25 (script de regeneração), C14 (sem hex hardcoded em código novo).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@.planning/phases/09-perfil-dota-social/09-UI-SPEC.md
@next.config.ts
@src/constants/dota-heroes.ts

<interfaces>
<!-- Schema do JSON gerado — D-24 obrigatório com 10 campos. Executor implementa contra este shape. -->

```typescript
// src/lib/queries/heroes.ts — interface PÚBLICA (exportada)
export interface HeroData {
  id: number;                    // ex: 1
  slug: string;                  // ex: "antimage" (sem prefixo "npc_dota_hero_")
  name_pt: string;               // ex: "Anti-Mage" (fallback EN quando PT não disponível)
  name_en: string;               // ex: "Anti-Mage" (de localized_name OpenDota)
  roles: string[];               // ex: ["Carry", "Escape", "Nuker"]
  primary_attr: "str" | "agi" | "int" | "uni";
  complexity: number;            // 1|2|3 — dificuldade Valve (1=fácil, 3=hard). Indicado em HeroPicker (V2)
  image_full: string;            // URL horizontal Valve
  image_icon: string;            // URL ícone Valve
  portrait_url: string;          // URL portrait vertical Valve (background do /me)
}

export function getHeroBySlug(slug: string): HeroData | null;
export function searchHeroes(query: string, limit?: number): HeroData[];
export function getAllHeroes(): HeroData[];
export function isValidHeroSlug(slug: string): boolean;
```

<!-- URLs Valve verificadas no RESEARCH.md seção "Padrão 6": -->
<!-- image_full:   https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{slug}.png -->
<!-- image_icon:   https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/icons/{slug}.png -->
<!-- portrait_url: https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/renders/{slug}.png -->

<!-- OpenDota API: GET https://api.opendota.com/api/heroes -->
<!-- Resposta: array de { id, name: "npc_dota_hero_<slug>", localized_name, primary_attr: "str|agi|int|all", attack_type, roles[], legs } -->
<!-- Nota 1: OpenDota usa "all" pra Universal — converter pra "uni" no nosso schema -->
<!-- Nota 2: complexity NÃO vem do /api/heroes — vem de https://api.opendota.com/api/heroStats no campo `hero_complexity` OU pode ser derivado da entry hero_unit_data. Se indisponível, fallback 1 com TODO inline. -->
```

</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Patch next.config.ts com remotePatterns Valve CDN</name>
  <files>next.config.ts</files>
  <read_first>
    - next.config.ts (entender shape atual)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Pitfall 4: next/image bloqueando Valve CDN"
  </read_first>
  <action>
    Adicionar 2 entries ao array `images.remotePatterns` em `next.config.ts`:

    ```typescript
    { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
    { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
    ```

    Manter as 2 entries existentes (`cdn.discordapp.com`, `*.supabase.co`). Resultado final = 4 entries no array.

    NÃO mudar outras propriedades (`reactStrictMode` permanece true). NÃO alterar tipo `NextConfig` import.

    Comentário inline em PT-BR (CLAUDE.md): `// Valve CDN — portraits de heróis Dota 2 (Phase 9)`
  </action>
  <verify>
    <automated>grep -c "cdn.cloudflare.steamstatic.com" next.config.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep "cdn.cloudflare.steamstatic.com" next.config.ts` retorna 1 match
    - `grep "cdn.akamai.steamstatic.com" next.config.ts` retorna 1 match
    - `grep "cdn.discordapp.com" next.config.ts` retorna 1 match (preservado)
    - `grep "supabase.co" next.config.ts` retorna 1 match (preservado)
    - `pnpm typecheck` retorna 0 erros
  </acceptance_criteria>
  <done>next.config.ts whitelist os 4 hostnames (Discord + Supabase + 2 Valve CDNs), tipo NextConfig preservado, sem regressão.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Gerar src/data/dota-heroes.json + script gen:heroes</name>
  <files>
    src/data/dota-heroes.json,
    scripts/gen-heroes.ts,
    package.json
  </files>
  <read_first>
    - src/constants/dota-heroes.ts (entender catálogo existente de 127 heróis e função searchHeroes/getHeroById como referência de API)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 6: Catálogo de Heróis — JSON Estático"
    - package.json (entender scripts existentes e tsx/ts-node disponível)
  </read_first>
  <action>
    1. Criar `scripts/gen-heroes.ts` que:
       - Faz `fetch("https://api.opendota.com/api/heroStats")` (endpoint que inclui `hero_complexity`; fallback `/api/heroes` se 404)
       - Mapeia cada entry pro schema D-24 (10 campos):
         ```typescript
         {
           id: hero.id,
           slug: hero.name.replace(/^npc_dota_hero_/, ""), // remove prefixo
           name_pt: hero.localized_name, // fallback EN — OpenDota não tem PT nativo
           name_en: hero.localized_name,
           roles: hero.roles,
           primary_attr: hero.primary_attr === "all" ? "uni" : hero.primary_attr,
           complexity: typeof hero.hero_complexity === "number" ? hero.hero_complexity : 1, // fallback 1 quando ausente
           image_full: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`,
           image_icon: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/icons/${slug}.png`,
           portrait_url: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/renders/${slug}.png`,
         }
         ```
       - Ordena por `id` ascendente (estabilidade do diff)
       - Escreve `src/data/dota-heroes.json` com `JSON.stringify(arr, null, 2)`
       - Loga `console.log(\`✓ Geradas ${arr.length} heroes em src/data/dota-heroes.json\`)`
       - Trata erro de fetch com `console.error` + `process.exit(1)`

    2. Executar `pnpm tsx scripts/gen-heroes.ts` (ou `npx tsx`) UMA VEZ pra gerar o arquivo.
       Se `tsx` não disponível, fallback: rodar `pnpm dlx tsx scripts/gen-heroes.ts`.
       Se ainda assim falhar, criar o JSON manualmente convertendo `src/constants/dota-heroes.ts` (127 entries) com URLs Valve construídas a partir do `name` existente. NÃO inventar `roles[]` ou `complexity` — usar `[]` e `1` como fallback se OpenDota indisponível e adicionar TODO inline no JSON.

    3. Adicionar script ao `package.json`:
       ```json
       "scripts": {
         ...,
         "gen:heroes": "tsx scripts/gen-heroes.ts"
       }
       ```

    4. NÃO deletar `src/constants/dota-heroes.ts` ainda — outros componentes podem referenciar. Migração de uso é responsabilidade de plans posteriores.
  </action>
  <verify>
    <automated>node -e "const h = require('./src/data/dota-heroes.json'); if (!Array.isArray(h)) throw 'not array'; if (h.length < 120) throw 'too few heroes: ' + h.length; const sample = h[0]; ['id','slug','name_pt','name_en','roles','primary_attr','complexity','image_full','image_icon','portrait_url'].forEach(k => { if (!(k in sample)) throw 'missing key: ' + k; }); if (Object.keys(sample).length !== 10) throw 'expected 10 keys, got ' + Object.keys(sample).length; console.log('OK:', h.length, 'heroes,', Object.keys(sample).length, 'keys');"</automated>
  </verify>
  <acceptance_criteria>
    - `src/data/dota-heroes.json` existe e é JSON válido
    - `node -e "console.log(require('./src/data/dota-heroes.json').length)"` >= 120
    - Primeiro hero tem TODAS as **10 chaves D-24**: id, slug, name_pt, name_en, roles, primary_attr, **complexity**, image_full, image_icon, portrait_url
    - `node -e "console.log(Object.keys(require('./src/data/dota-heroes.json')[0]).length)"` retorna `10`
    - `grep "\"complexity\":" src/data/dota-heroes.json` retorna >=120 matches (uma por hero)
    - `grep "antimage" src/data/dota-heroes.json` retorna >=1 match (slug Anti-Mage)
    - `grep "renders/antimage.png" src/data/dota-heroes.json` retorna 1 match (portrait_url construída)
    - `grep "\"gen:heroes\"" package.json` retorna 1 match
    - `scripts/gen-heroes.ts` existe e contém `cdn.cloudflare.steamstatic.com`
    - `grep "complexity" scripts/gen-heroes.ts` retorna >=1 match (mapeamento explícito)
  </acceptance_criteria>
  <done>JSON estático gerado com 127+ heróis no schema D-24 COMPLETO (10 campos incluindo complexity), script `gen:heroes` registrado no package.json e funcional via `pnpm gen:heroes`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Criar src/lib/queries/heroes.ts com helpers tipados</name>
  <files>src/lib/queries/heroes.ts</files>
  <read_first>
    - src/constants/dota-heroes.ts (API de referência: searchHeroes, getHeroById)
    - src/data/dota-heroes.json (criado em Task 2 — schema)
  </read_first>
  <action>
    Criar `src/lib/queries/heroes.ts` (Server-safe — sem "use client", sem fetch):

    ```typescript
    // Helpers tipados de lookup/busca do catálogo estático de heróis Dota.
    // Bundle JSON em src/data/dota-heroes.json — gerado via `pnpm gen:heroes` (D-25).
    // Per decisão D-23, sem fetch API live — tudo estático.

    import heroesData from "@/data/dota-heroes.json";

    export interface HeroData {
      id: number;
      slug: string;
      name_pt: string;
      name_en: string;
      roles: string[];
      primary_attr: "str" | "agi" | "int" | "uni";
      complexity: number; // 1|2|3 — dificuldade Valve (D-24 mandatório)
      image_full: string;
      image_icon: string;
      portrait_url: string;
    }

    // Type-cast do import JSON (TS infere as string[] mas roles é narrow demais)
    const HEROES = heroesData as HeroData[];

    // Index pra lookup O(1) por slug — construído uma vez no module load
    const BY_SLUG = new Map<string, HeroData>(HEROES.map((h) => [h.slug, h]));
    const BY_ID = new Map<number, HeroData>(HEROES.map((h) => [h.id, h]));

    export function getHeroBySlug(slug: string): HeroData | null {
      return BY_SLUG.get(slug) ?? null;
    }

    export function getHeroById(id: number): HeroData | null {
      return BY_ID.get(id) ?? null;
    }

    export function getAllHeroes(): HeroData[] {
      return HEROES;
    }

    /**
     * Busca substring case-insensitive em name_pt, name_en ou slug.
     * Usado pelo HeroPicker no modal de edição (Phase 9).
     */
    export function searchHeroes(query: string, limit = 24): HeroData[] {
      const q = query.trim().toLowerCase();
      if (!q) return HEROES.slice(0, limit);
      return HEROES.filter(
        (h) =>
          h.name_pt.toLowerCase().includes(q) ||
          h.name_en.toLowerCase().includes(q) ||
          h.slug.toLowerCase().includes(q)
      ).slice(0, limit);
    }

    /**
     * Valida que slug existe no catálogo — usado em Server Actions
     * (updateHeroPortrait, updateFavoriteHeroes) pra rejeitar slugs inválidos.
     */
    export function isValidHeroSlug(slug: string): boolean {
      return BY_SLUG.has(slug);
    }
    ```

    Garantir que TypeScript aceita o import JSON: `tsconfig.json` precisa ter `"resolveJsonModule": true` (geralmente já tem por padrão em Next.js — verificar). Se não, adicionar.
  </action>
  <verify>
    <automated>pnpm typecheck 2>&1 | grep -E "(heroes\.ts|dota-heroes)" | head -5; pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/queries/heroes.ts` existe
    - `grep "export function getHeroBySlug" src/lib/queries/heroes.ts` retorna 1 match
    - `grep "export function searchHeroes" src/lib/queries/heroes.ts` retorna 1 match
    - `grep "export function getAllHeroes" src/lib/queries/heroes.ts` retorna 1 match
    - `grep "export function isValidHeroSlug" src/lib/queries/heroes.ts` retorna 1 match
    - `grep "export interface HeroData" src/lib/queries/heroes.ts` retorna 1 match
    - `grep "complexity: number" src/lib/queries/heroes.ts` retorna 1 match (D-24)
    - `grep "@/data/dota-heroes.json" src/lib/queries/heroes.ts` retorna 1 match
    - `pnpm typecheck` retorna 0 erros (zero `any`, C1)
    - Arquivo tem <300 linhas (CLAUDE.md C2)
  </acceptance_criteria>
  <done>Helpers tipados disponíveis pra consumo em HeroPicker, ProfileIdentity (hero portrait background), Server Actions de validação de slug, e qualquer componente futuro que precise de catálogo.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` retorna 0 erros
- `pnpm lint` retorna 0 erros
- `node -e "console.log(Object.keys(require('./src/data/dota-heroes.json')[0]).length)"` retorna **10** (D-24 completo)
- `grep -E "cdn\.(cloudflare|akamai)\.steamstatic\.com" next.config.ts | wc -l` retorna 2
- `pnpm gen:heroes` executa sem erro (regeneração funciona)
</verification>

<success_criteria>
- Wave 0 / pré-requisito Phase 9 desbloqueado: qualquer plano subsequente pode usar `<Image src={hero.portrait_url}>` sem erro de runtime
- HeroPicker (plan 09-08) tem helpers prontos (`searchHeroes`, `getAllHeroes`) e pode exibir indicador de complexity
- ProfileIdentity (plan 09-07) tem `getHeroBySlug` pra renderizar hero portrait do `profiles.hero_portrait_slug`
- Server Actions (plan 09-05a) podem usar `isValidHeroSlug` pra validar input antes de UPDATE
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-01-SUMMARY.md` com:
- Lista exata de arquivos criados/modificados
- Contagem real de heróis no JSON gerado
- Confirmação de que script `gen:heroes` rodou ou plano B (manual conversion)
- Confirmação que cada hero tem 10 chaves (incluindo complexity)
- Quaisquer warnings de typecheck/lint (se houver)
</output>
</content>
</invoke>