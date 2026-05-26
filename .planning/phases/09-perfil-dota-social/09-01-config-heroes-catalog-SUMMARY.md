---
phase: "09-perfil-dota-social"
plan: "01"
subsystem: "data/config"
tags: ["heroes", "dota2", "catalog", "next-config", "static-data", "phase9"]
dependency_graph:
  requires: []
  provides:
    - "next.config.ts whitelist Valve CDN (cdn.cloudflare.steamstatic.com + cdn.akamai.steamstatic.com)"
    - "src/data/dota-heroes.json — 127 heróis, schema D-24, 10 campos"
    - "src/lib/queries/heroes.ts — helpers getHeroBySlug, getHeroById, getAllHeroes, searchHeroes, isValidHeroSlug"
    - "scripts/gen-heroes.ts — script regenerador OpenDota → JSON"
    - "package.json gen:heroes — npm script para regeneração"
  affects:
    - "Todos os componentes de hero portrait da Phase 9 (09-07, 09-08)"
    - "Server Actions de validação de slug (09-05a)"
    - "HeroPicker grid modal de edição"
tech_stack:
  added: []
  patterns:
    - "JSON estático importado via resolveJsonModule (D-23)"
    - "Map para lookup O(1) por slug e id"
    - "npx tsx para scripts de geração sem instalar tsx globalmente"
key_files:
  created:
    - "src/data/dota-heroes.json"
    - "src/lib/queries/heroes.ts"
    - "scripts/gen-heroes.ts"
  modified:
    - "next.config.ts"
    - "package.json"
decisions:
  - "D-23: Bundle JSON estático — sem fetch API live"
  - "D-24: Schema 10 campos incluindo complexity (hero_complexity da OpenDota /api/heroStats)"
  - "D-25: Script pnpm gen:heroes para regeneração quando Valve adicionar herói"
  - "Script usa npx tsx (não tsx direto) para compatibilidade com Windows/PATH do pnpm"
metrics:
  duration_seconds: 309
  completed_date: "2026-05-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 2
---

# Phase 9 Plan 01: Config Heroes Catalog Summary

**One-liner:** Fundação de dados da Phase 9 — whitelist Valve CDN no next.config.ts, catálogo JSON de 127 heróis com schema D-24 (10 campos incluindo complexity), e helpers tipados para lookup/busca de heróis.

---

## Tasks Completadas

| Task | Nome | Commit | Arquivos |
|------|------|--------|---------|
| 1 | Patch next.config.ts com remotePatterns Valve CDN | `f620e59` | next.config.ts |
| 2 | Gerar src/data/dota-heroes.json + script gen:heroes | `f47a2cc` | src/data/dota-heroes.json, scripts/gen-heroes.ts, package.json |
| 3 | Criar src/lib/queries/heroes.ts com helpers tipados | `da2bf03` | src/lib/queries/heroes.ts |
| fix | Fix gen:heroes script (npx tsx para Windows) | `c59d567` | package.json |

---

## Artifacts Gerados

### next.config.ts

Agora tem 4 remotePatterns:
- `cdn.discordapp.com` (existente, preservado)
- `*.supabase.co` (existente, preservado)
- `cdn.cloudflare.steamstatic.com` (Valve CDN principal — Phase 9)
- `cdn.akamai.steamstatic.com` (Valve CDN fallback — Phase 9)

### src/data/dota-heroes.json

- **127 heróis** gerados via OpenDota `/api/heroStats`
- **10 campos por herói** (schema D-24 completo): id, slug, name_pt, name_en, roles[], primary_attr, complexity, image_full, image_icon, portrait_url
- `complexity` mapeado do campo `hero_complexity` da OpenDota (fallback=1 quando ausente)
- `primary_attr` "all" convertido para "uni" (Universal)
- Ordenados por id ascendente para estabilidade de diff
- ~150KB conforme expectativa D-23

### src/lib/queries/heroes.ts

71 linhas, zero `any`, TypeScript strict:
- `interface HeroData` — schema completo exportado
- `getHeroBySlug(slug)` — lookup O(1) via Map
- `getHeroById(id)` — lookup O(1) via Map
- `getAllHeroes()` — retorna todos os 127 heróis
- `searchHeroes(query, limit)` — busca case-insensitive em name_pt, name_en, slug
- `isValidHeroSlug(slug)` — validação para Server Actions

### scripts/gen-heroes.ts

Script regenerador completo:
- Busca OpenDota `/api/heroStats` (endpoint que inclui hero_complexity)
- Mapeia para schema D-24 com todos os 10 campos
- Trata erros com `console.error` + `process.exit(1)`
- Ordena por id ascendente
- Escreve `src/data/dota-heroes.json` com formatação legível

---

## Verificações Executadas

- `pnpm typecheck` — 0 erros
- `pnpm lint` — 0 erros
- `node -e "console.log(Object.keys(...)[0]).length)"` → **10** (D-24 completo)
- `grep -E "cdn\.(cloudflare|akamai)\.steamstatic\.com" next.config.ts | wc -l` → **2**
- `pnpm gen:heroes` — executou sem erro, 127 heróis regenerados

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Script gen:heroes usava `tsx` sem `npx`**
- **Found during:** Verificação de `pnpm gen:heroes` após Task 2
- **Issue:** No Windows, `tsx` não está no PATH do shell do pnpm — "tsx não é reconhecido como comando interno"
- **Fix:** Alterado script de `"tsx scripts/gen-heroes.ts"` para `"npx tsx scripts/gen-heroes.ts"` no package.json
- **Files modified:** package.json
- **Commit:** `c59d567`

Demais tasks: plano executado exatamente como escrito.

---

## Known Stubs

Nenhum. Todos os dados são reais:
- JSON gerado com heróis reais da OpenDota API
- URLs Valve são URLs públicas funcionais
- Helpers são implementações reais (não mocks)

---

## Impact para Plans Subsequentes

- **09-07 (ProfileIdentity):** Pode usar `getHeroBySlug(profiles.hero_portrait_slug)` para renderizar hero portrait via `<Image src={hero.portrait_url}>`  sem erro de runtime (next.config.ts whitelist resolvido)
- **09-08 (HeroPicker):** Pode usar `getAllHeroes()` e `searchHeroes()` para grid pesquisável, e `hero.complexity` para indicador de dificuldade
- **09-05a (Server Actions):** Pode usar `isValidHeroSlug()` para validar slugs antes de UPDATE no Supabase

## Self-Check: PASSED

Arquivos verificados:
- FOUND: src/data/dota-heroes.json
- FOUND: src/lib/queries/heroes.ts
- FOUND: scripts/gen-heroes.ts
- FOUND: next.config.ts (modificado)
- FOUND: package.json (modificado com gen:heroes)

Commits verificados:
- FOUND: f620e59 (next.config.ts)
- FOUND: f47a2cc (dota-heroes.json + gen-heroes.ts + package.json)
- FOUND: da2bf03 (heroes.ts)
- FOUND: c59d567 (fix gen:heroes script)
