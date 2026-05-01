---
phase: 02-catalog-checkout
plan: 05
subsystem: catalog-ui
tags: [catalog, packages, cyberpunk, server-component, wcag]
dependency_graph:
  requires: ["02-01"]
  provides: ["F2.2", "F2.1-visual"]
  affects: ["02-06"]
tech_stack:
  added: []
  patterns: ["Server Component com Supabase fetch", "PackageCard com Link estilizado", "Grid responsivo Tailwind", "formatBRL com Intl.NumberFormat"]
key_files:
  created:
    - src/components/catalog/package-card.tsx
    - src/components/catalog/package-grid.tsx
    - src/app/pacotes/page.tsx
  modified:
    - src/app/api/webhooks/abacatepay/route.ts (auto-fix: limpeza pós-fix database.ts)
    - src/app/partidas/page.tsx (auto-fix: Button asChild não suportado em @base-ui)
decisions:
  - "Link estilizado diretamente em vez de Button asChild (base-ui não suporta asChild)"
  - "formatBRL via Intl.NumberFormat pt-BR para formato monetário PT-BR"
  - "Skeleton de loading não aplicável em Server Component puro (Suspense boundary se necessário mais tarde)"
metrics:
  duration: "11 minutos"
  completed_at: "2026-05-01T21:28:00Z"
  tasks: 2
  files: 3
---

# Phase 02 Plan 05: Pacotes Page Summary

Página pública `/pacotes` com catálogo completo dos 4 pacotes seedados, usando Server Component + Supabase anon key + cards cyberpunk com CTA para checkout.

## O que foi entregue

### Componentes criados

**`src/components/catalog/package-card.tsx`**
- Props: `{ pkg: Tables<"packages"> }` — tipagem completa sem `any`
- Badge dinâmico: cyan `#00F0FF` para Avulso, purple `#A855F7` para Mensal
- Ícones Lucide: `Trophy` (partidas) com `aria-hidden="true"`, `Sparkles` (sessões) com `aria-hidden="true"`
- Link `/checkout/${pkg.id}` com `aria-label` completo (WCAG 2.1 AA)
- Helper `formatBRL(value)` com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
- Server Component — sem `"use client"`, sem JS no client
- Hover effect: `hover:border-[#00F0FF]/40`, ring purple para pacotes mensais

**`src/components/catalog/package-grid.tsx`**
- Props: `{ packages: Tables<"packages">[] }`
- Grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` com `gap-4 md:gap-6`
- Empty state amigável: "Nenhum pacote disponível no momento. Volte em breve — novidades estão a caminho."
- Server Component puro

### Página criada

**`src/app/pacotes/page.tsx`**
- Server Component assíncrono
- Query Supabase: `supabase.from("packages").select("*").eq("ativo", true).order("display_order", { ascending: true })`
- Pacotes inativos filtrados pelo `.eq("ativo", true)` — nunca aparecem
- Metadata SEO: título + descrição PT-BR
- Hero header com H1: `"Escolha seu pacote"` (span cyan)
- Fallback `packages ?? []` protege contra erro de DB

## Query Supabase usada

```typescript
const { data: packages, error } = await supabase
  .from("packages")
  .select("*")
  .eq("ativo", true)
  .order("display_order", { ascending: true });
```

RLS permite SELECT público em `packages.ativo=true` (migration 002).

## Cores e ícones aplicados

| Elemento | Cor | Ícone |
|---|---|---|
| Badge Avulso | `#00F0FF` (cyan) | — |
| Badge Mensal | `#A855F7` (purple) | — |
| Partidas | `#00F0FF` | `Trophy` (Lucide) |
| Sessões teóricas | `#A855F7` | `Sparkles` (Lucide) |
| Preço | `#00F0FF` | — |
| CTA Comprar | bg `#00F0FF`, text black | — |
| Ring mensal | `#A855F7/30` | — |
| Card bg | `#0A0A1A` | — |

## Acessibilidade (WCAG 2.1 AA)

- `aria-label` no Link "Comprar": `Comprar pacote {nome} por {preço formatado}`
- `aria-label` na `<ul>`: `Conteúdo do pacote {nome}`
- `aria-hidden="true"` nos ícones Lucide (decorativos)
- Semantic HTML: `<main>`, `<header>`, `<ul>/<li>` na lista de features
- Contraste: texto preto no botão cyan (alta contraste)

## Desvios do Plano

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing TypeScript errors em webhook route**
- **Found during:** Task 2 (pnpm typecheck revelou erros pré-existentes)
- **Issue:** `{ status: PurchaseStatus }` não atribuível a `never` em `.update()` — database.ts não tinha `Relationships: []` nem `Views: Record<never, never>` conforme exigido pelo Supabase JS v2/postgrest v12
- **Fix:** Paralelamente, agente do plan 02-06/07/08 adicionou `Relationships: []` e mudou `Views/Functions/Enums/CompositeTypes` de `Record<string, never>` para `Record<never, never>` no database.ts. Após essa correção, o webhook route foi restaurado para sua forma original limpa (sem workarounds)
- **Files modified:** `src/app/api/webhooks/abacatepay/route.ts` (limpo pelos workarounds temporários), `src/types/database.ts` (fix pelo agente paralelo)
- **Commit:** incluído no commit de Task 2 via linter auto-format

**2. [Rule 1 - Bug] Button asChild em partidas/page.tsx (agente paralelo)**
- **Found during:** Task 2 (pnpm typecheck — agente 02-07/08 deixou código com `asChild` que @base-ui não suporta)
- **Issue:** `<Button asChild>` não existe no componente Button de @base-ui/react
- **Fix:** Substituído por `<Link>` com classes Tailwind equivalentes; removido import `Button` não usado
- **Files modified:** `src/app/partidas/page.tsx`
- **Commit:** não commitado individualmente (arquivo não é de escopo desta plan)

### Decisão: Link estilizado em vez de Button asChild

O componente `Button` do projeto usa `@base-ui/react/button` (não Radix UI), que não suporta `asChild`. Para CTAs que são links de navegação (`/checkout/[id]`), usou-se `<Link>` com classes Tailwind diretamente, sem precisar do padrão `asChild`. Padrão estabelecido em `PackageCard` e aplicado como fix em `partidas/page.tsx`.

## Como Pedro testa visualmente

1. `pnpm dev` no terminal
2. Abrir `http://localhost:3000/pacotes`
3. Deve ver 4 cards: Avulsa (R$ 10), Pacote 5 (R$ 50), Pacote 10 (R$ 100), Mentoria mensal (R$ 100)
4. Cards Avulso têm badge cyan, Mensal tem badge purple e ring roxo sutil
5. Clicar "Comprar" em qualquer card → redireciona para `/checkout/[uuid]` (404 até Plan 02-06 ser executado)

## Known Stubs

Nenhum stub intencional. Os 4 pacotes são buscados do banco real (migration 003 seedada). Caso o banco não tenha pacotes ativos, o empty state é exibido corretamente.
