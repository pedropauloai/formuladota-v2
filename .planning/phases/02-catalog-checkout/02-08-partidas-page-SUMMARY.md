---
phase: 02-catalog-checkout
plan: 08
subsystem: ui
tags: [nextjs, supabase, react, server-component, tailwind, lucide-react]

requires:
  - phase: 02-01
    provides: shadcn/ui components (Card, Badge, Button), cyberpunk tokens, globals.css utilities
  - phase: 02-05
    provides: /pacotes page (CTA destino do empty state)
  - phase: 01-foundation
    provides: createClient (server.ts), database.ts types com Relationships, auth middleware

provides:
  - "Página /partidas: Server Component com saldo agregado de purchases pagas"
  - "SaldoCard component: card destaque cyberpunk com partidas (cyan) e sessões (purple)"
  - "Empty state amigável: convida user sem saldo a ir para /pacotes"
  - "Lista de compras pagas com id curto, nome do pacote, data PT-BR, badges de restante"

affects: [phase-03-profile-scheduling, phase-05-admin-panel]

tech-stack:
  added: []
  patterns:
    - "2-query approach para joins Supabase: purchases + packages separados, merge via Map<id, pkg>"
    - "Pick<Tables<T>, keys> para tipos parciais tipados sem any"
    - "Link estilizado diretamente quando base-ui Button não suporta asChild"

key-files:
  created:
    - src/components/partidas/saldo-card.tsx
    - src/app/partidas/page.tsx
  modified: []

key-decisions:
  - "2-query approach (não join) para buscar packages: Relationships[] vazio no database.ts impede inferência de tipo do join — evita need de any/unknown cast"
  - "Link estilizado ao invés de Button asChild: base-ui Button não suporta asChild (padrão Radix); Link com classes Tailwind é equivalente funcional sem workaround de tipo"
  - "Aggregação de saldo inline no Server Component: sem estado local, sem hook — só .reduce() sobre array de purchases pagas"

patterns-established:
  - "SaldoCard recebe props numéricas pré-calculadas: apresentação pura, sem acesso a Supabase"
  - "Pick<Tables<tableName>, fields> para tipar queries parciais sem cast"

requirements-completed: [F3.4, C1, C5, C6, C7]

duration: 25min
completed: 2026-04-30
---

# Phase 02 Plan 08: Partidas Page Summary

**Página /partidas Server Component com SaldoCard cyberpunk (cyan/purple glow), 2-query approach para tipo-safe packages lookup, e empty state com CTA para /pacotes**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-30T00:00:00Z
- **Completed:** 2026-04-30T00:25:00Z
- **Tasks:** 2 (ambas completas)
- **Files modified:** 2 criados

## Accomplishments

- SaldoCard com Trophy (cyan #00F0FF, text-glow-cyan) para partidas e Sparkles (purple #A855F7, text-glow-purple) para sessões teóricas — Server Component puro de apresentação
- Página /partidas busca purchases pagas via RLS, agrega saldo com `.reduce()`, exibe SaldoCard + lista de compras
- Empty state com ShoppingBag icon e Link estilizado para /pacotes quando saldo é zero
- Zero `any`, zero `unknown` — tipos derivados de `Pick<Tables<"purchases">, ...>` e `Map<string, Pick<Tables<"packages">, ...>>`
- Build, typecheck e lint todos passando (exit 0)

## Task Commits

1. **Task 1: Criar SaldoCard component** - `cfa6d03` (feat)
2. **Task 2: Criar /partidas/page.tsx (Server Component)** - `bbedb7b` (feat)

## Files Created/Modified

- `src/components/partidas/saldo-card.tsx` — Card destaque com saldo agregado, ícones Lucide, glow utilities, plurais PT-BR
- `src/app/partidas/page.tsx` — Server Component que busca purchases pagas, agrega saldo, renderiza SaldoCard + lista + empty state

## Decisions Made

**1. 2-query approach para packages (não join)**
O campo `Relationships: []` (array vazio) em `database.ts` significa que não há relacionamentos tipados definidos. Usar `packages(nome)` no select do Supabase causaria tipo `never` ou precisaria de cast inseguro. Solução: query separada de packages filtrada pelos `package_id` únicos encontrados nas purchases, merge via `Map<string, Pick<PackageRow, "id" | "nome">>`. Elimina qualquer necessidade de cast.

**2. Link estilizado ao invés de Button asChild**
O Button do projeto usa `@base-ui/react/button` (não Radix UI). base-ui não tem prop `asChild` — esse é um padrão exclusivo do Radix Slot. A solução é usar `<Link>` diretamente com classes Tailwind equivalentes às do Button, o que é igualmente semântico e correto em HTML.

**3. Pick<Tables<T>, keys> para tipos de queries parciais**
Em vez de deixar o TypeScript inferir um tipo opaco das queries parciais, declaramos explicitamente o tipo da variável `compras` como `Pick<PurchaseRow, "id" | "status" | ...>[]`. Isso garante que o compilador valida os campos usados no `.map()` e `.reduce()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button asChild não suportado no base-ui Button**
- **Found during:** Task 2 (Criar /partidas/page.tsx)
- **Issue:** O plano propunha `<Button asChild><Link href="/pacotes">Ver pacotes</Link></Button>`. O componente Button usa `@base-ui/react/button` que não tem prop `asChild` (padrão Radix). TypeScript error TS2322.
- **Fix:** Substituído por `<Link href="/pacotes" className="inline-flex items-center ...">Ver pacotes</Link>` com classes Tailwind equivalentes às do botão primário. Linter automático do projeto detectou e corrigiu antes da verificação manual.
- **Files modified:** src/app/partidas/page.tsx
- **Verification:** pnpm typecheck exit 0, pnpm lint exit 0
- **Committed in:** bbedb7b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix necessário para type safety — sem impacto funcional no UX. Link estilizado é visualmente idêntico ao Button primário.

## Issues Encountered

- Leitura inicial de `database.ts` retornou versão obsoleta (sem `Relationships: []`). Versão atual no disco já tinha os campos corretos (adicionados por outro agente paralelo da phase). Verificação real via `pnpm typecheck` revelou que o typecheck passava, confirmando que o arquivo no disco era diferente do cache inicial.

## Known Stubs

Nenhum stub detectado. O SaldoCard recebe props numéricas reais calculadas de dados do Supabase. O `packageNome` usa fallback `"Pacote"` apenas se o pacote não for encontrado no DB (edge case defensivo, não stub intencional).

## User Setup Required

Nenhum — não requer configuração de serviços externos. A page usa autenticação já configurada na Phase 1 e queries ao Supabase com RLS já estabelecida na Phase 1 + migrations.

## Next Phase Readiness

- Phase 3 (Profile & Scheduling) pode consumir `/partidas` como base para adicionar agendamento de slots
- A estrutura de saldo (partidasDisponiveis, sessoesDisponiveis) já está calculada corretamente para quando o Phase 3 adicionar a lógica de uso (partidas_usadas++)
- Rota `/partidas` está disponível na navegação — Phase 3 adicionará links de agendamento nesta página

---
*Phase: 02-catalog-checkout*
*Completed: 2026-04-30*
