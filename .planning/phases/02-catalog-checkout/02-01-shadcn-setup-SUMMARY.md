---
phase: 02-catalog-checkout
plan: "01"
subsystem: ui
tags: [shadcn, tailwind-v4, base-ui, sonner, cyberpunk, design-system]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: globals.css com tokens cyberpunk @theme, tsconfig paths @/*, layout.tsx base

provides:
  - components.json (shadcn config com aliases corretos)
  - src/lib/utils.ts com cn() helper
  - Button, Card, Badge, Skeleton, Sonner em src/components/ui/
  - Toaster global montado no layout root
  - Tokens shadcn mapeados para paleta cyberpunk no :root

affects:
  - 02-02-catalog-page
  - 02-03-checkout-flow
  - 02-04-webhook-handler
  - 02-05-matches-page
  - todos os plans Wave 2 que usam componentes shadcn

# Tech tracking
tech-stack:
  added:
    - "@base-ui/react ^1.4.1 (Base UI — moderna alternativa ao Radix, mesma equipe)"
    - "shadcn ^4.6.0 (CLI como dep de produção, gerado pelo canary)"
    - "tw-animate-css ^1.4.0 (substituto de tailwindcss-animate para Tailwind v4)"
    - "sonner ^2.0.7 (toasts/notificações)"
  patterns:
    - "Componentes shadcn gerados em src/components/ui/ via CLI canary"
    - "Tokens shadcn (:root CSS vars) mapeados para paleta cyberpunk no globals.css"
    - "Dark-only theme — sem toggle, sem next-themes"
    - "Toaster global no body do layout root para toast() em qualquer Client Component"

key-files:
  created:
    - components.json
    - src/components/ui/card.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/sonner.tsx
  modified:
    - src/styles/globals.css (adicionado :root cyberpunk, removido oklch light/dark padrão)
    - src/app/layout.tsx (Toaster importado e renderizado no body)
    - src/lib/utils.ts (cn() — já existia, CLI confirmou sem mudança)
    - package.json (sonner, @base-ui/react, tw-animate-css adicionados)

key-decisions:
  - "Base UI (@base-ui/react) em vez de Radix — CLI canary usa base-nova por padrão, mais moderno para React 19"
  - "Dark-only: next-themes removido, sonner.tsx usa theme='dark' hardcoded"
  - "Tokens shadcn mapeados para cyberpunk: --primary=#00f0ff (cyan), --secondary=#a855f7 (purple), --background=#050505"
  - "tw-animate-css em vez de tailwindcss-animate (incompatível com Tailwind v4)"

patterns-established:
  - "Para adicionar novos componentes shadcn: pnpm dlx shadcn@canary add [component] --yes"
  - "Componentes gerados usam @base-ui/react/* para primitivos (Button usa ButtonPrimitive, Badge usa useRender)"
  - "Cores sempre via var(--color-*) do @theme cyberpunk, não hardcoded"

requirements-completed: [C5, C6, C7]

# Metrics
duration: 25min
completed: "2026-05-01"
---

# Phase 2 Plan 01: shadcn/ui Setup Summary

**shadcn/ui canary inicializado com preset base-nova (Base UI + Tailwind v4), 5 componentes instalados e tokens cyberpunk mapeados — fundação visual para todas as pages da Phase 2**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-01T18:51:21Z
- **Completed:** 2026-05-01T19:16:00Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- shadcn/ui inicializado via `pnpm dlx shadcn@canary init --defaults` com preset `base-nova` (Base UI, Lucide, RSC, aliases @/components e @/lib/utils)
- 5 componentes instalados: Button, Card (+ CardHeader/CardTitle/CardDescription/CardContent/CardFooter/CardAction), Badge, Skeleton, Sonner
- Tokens shadcn (`:root --primary`, `--secondary`, `--background`, etc.) mapeados para paleta cyberpunk (#00f0ff, #a855f7, #050505, #0a0a1a) em vez dos valores oklch padrão do CLI
- Toaster global montado no layout root — qualquer Client Component pode chamar `toast()` de `sonner` imediatamente

## Task Commits

Cada task foi committed atomicamente:

1. **Task 1: Inicializar shadcn/ui via CLI canary** - `45b210c` (chore)
2. **Task 2: Adicionar componentes Button, Card, Badge, Skeleton, Sonner** - `f9e8cf2` (feat)
3. **Task 3: Montar Toaster global no layout root** - `f673d5e` (feat)

## Files Created/Modified

- `components.json` — shadcn config: style=base-nova, rsc=true, iconLibrary=lucide, aliases corretos
- `src/styles/globals.css` — :root cyberpunk substituindo oklch padrão; @theme inline e @theme cyberpunk intactos
- `src/lib/utils.ts` — cn() helper (já existia, confirmado pelo CLI)
- `src/components/ui/button.tsx` — Button + buttonVariants com variants default/outline/secondary/ghost/destructive/link
- `src/components/ui/card.tsx` — Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter + CardAction
- `src/components/ui/badge.tsx` — Badge + badgeVariants
- `src/components/ui/skeleton.tsx` — Skeleton com animate-pulse
- `src/components/ui/sonner.tsx` — Toaster reescrito sem next-themes, cores cyberpunk, theme="dark" fixo
- `src/app/layout.tsx` — Toaster importado e renderizado após {children} no body
- `package.json` — @base-ui/react, shadcn, tw-animate-css, sonner adicionados; next-themes removido

## Decisions Made

- **Base UI em vez de Radix:** O CLI canary `--defaults` usa preset `base-nova` com `@base-ui/react`. É a evolução moderna do Radix (mesma equipe, mais otimizado para React 19). Mantido ao invés de reconfigurar para Radix.
- **Dark-only sem next-themes:** Projeto não tem toggle de tema. `sonner.tsx` gerado com `useTheme` da next-themes foi reescrito com `theme="dark"` fixo. `next-themes` foi removido do package.json.
- **Tokens cyberpunk sobrescritos:** O CLI gerou valores oklch genéricos no `:root`. Foram substituídos por hex exatos da paleta cyberpunk (cyan #00f0ff, purple #a855f7, background #050505, card #0a0a1a, border #27272a).
- **tw-animate-css mantido:** Instalado automaticamente pelo CLI canary, compatível com Tailwind v4. Correto.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CLI canary gerou preset base-nova (Base UI) em vez de Radix**
- **Found during:** Task 1 (shadcn init)
- **Issue:** O plano esperava Radix (`@radix-ui/react-slot` no button.tsx). O CLI canary `--defaults` usa `base-nova` com `@base-ui/react`.
- **Fix:** Mantido Base UI — é superior para React 19, mesma equipe do Radix, API similar. Não foi reconfigurado.
- **Files modified:** components.json (style=base-nova), src/components/ui/button.tsx (usa ButtonPrimitive do @base-ui/react)
- **Verification:** pnpm typecheck e pnpm lint passam; componentes funcionam corretamente
- **Committed in:** 45b210c (Task 1) e f9e8cf2 (Task 2)

**2. [Rule 1 - Bug] CLI adicionou fonte Geist e modificou layout.tsx**
- **Found during:** Task 3 (ao ler layout.tsx antes de editar)
- **Issue:** O CLI init adicionou `import Geist` e `cn()` no layout, font não especificada no projeto
- **Fix:** Restaurado para Space Grotesk + JetBrains Mono conforme CLAUDE.md, adicionado Toaster
- **Files modified:** src/app/layout.tsx
- **Verification:** typecheck + lint passam
- **Committed in:** f673d5e (Task 3)

**3. [Rule 2 - Missing Critical] CLI instalou next-themes como dep**
- **Found during:** Task 2 (verificação de package.json pós-add componentes)
- **Issue:** CLI instalou next-themes como dep, mas projeto é dark-only (violaria critério de aceitação)
- **Fix:** `pnpm remove next-themes` + reescrita manual do sonner.tsx com theme="dark" fixo
- **Files modified:** src/components/ui/sonner.tsx, package.json, pnpm-lock.yaml
- **Verification:** grep confirma ausência de next-themes em package.json e sonner.tsx
- **Committed in:** f9e8cf2 (Task 2)

---

**Total deviations:** 3 auto-fixed (1 bug/preset, 1 bug/layout, 1 missing critical/dep)
**Impact on plan:** Todos os auto-fixes necessários para conformidade com CLAUDE.md. Sem scope creep.

## Issues Encountered

- CLI canary usa interface interativa diferente do esperado (`--yes` não bypassa todos os prompts). Solução: `--defaults` flag bypassa todos os prompts com `base-nova` preset.

## User Setup Required

Nenhum — sem configuração de serviço externo necessária neste plano.

## Next Phase Readiness

- Fundacao visual pronta: `Button`, `Card`, `Badge`, `Skeleton`, `Sonner` disponíveis via `@/components/ui/*`
- `cn()` disponível em `@/lib/utils`
- `toast()` funciona em qualquer Client Component (Toaster montado globalmente)
- Plans Wave 2 (02-02-catalog-page, 02-03-checkout-flow, 02-05-matches-page) podem consumir componentes imediatamente

---

*Phase: 02-catalog-checkout*
*Completed: 2026-05-01*
