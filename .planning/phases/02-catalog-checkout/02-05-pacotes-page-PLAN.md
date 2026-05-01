---
phase: 02-catalog-checkout
plan: 05
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - src/app/pacotes/page.tsx
  - src/components/catalog/package-card.tsx
  - src/components/catalog/package-grid.tsx
autonomous: true
requirements: [F2.1, F2.2, C1, C5, C6, C7]
must_haves:
  truths:
    - "Página /pacotes lista TODOS os 4 pacotes ativos do DB (já seedados em migration 003)"
    - "Cards mostram: nome, descrição, partidas, sessões, preço em R$, badge tipo (avulso/mensal)"
    - "Pacote inativo (ativo=false) NÃO aparece na lista"
    - "Cada card tem botão 'Comprar' que linka para /checkout/[packageId]"
    - "Página usa Server Component (default) — fetch via supabase.from('packages').select()"
    - "Empty state amigável caso DB esteja sem pacotes ativos (improvável, mas possível)"
    - "Loading via Skeleton durante SSR (não aplicável em Server Component, mas componente Skeleton existe pra Suspense boundaries)"
    - "Tema cyberpunk (cyan accent, dark bg, purple para destaque mensal)"
    - "WCAG 2.1 AA: contraste, alt text, semantic HTML"
  artifacts:
    - path: "src/app/pacotes/page.tsx"
      provides: "Server Component que renderiza catálogo público"
      min_lines: 30
    - path: "src/components/catalog/package-card.tsx"
      provides: "Card de um pacote individual (props tipadas)"
      min_lines: 40
    - path: "src/components/catalog/package-grid.tsx"
      provides: "Grid responsivo (1 col mobile, 2 col tablet, 4 col desktop)"
      min_lines: 15
  key_links:
    - from: "src/app/pacotes/page.tsx"
      to: "src/lib/supabase/server.ts"
      via: "createClient() + .from('packages').select()"
      pattern: "from\\(['\"]packages['\"]"
    - from: "src/components/catalog/package-card.tsx"
      to: "/checkout/[packageId]"
      via: "<Link href={`/checkout/${pkg.id}`}>"
      pattern: "/checkout/"
    - from: "src/components/catalog/package-card.tsx"
      to: "src/components/ui/card.tsx"
      via: "import { Card, CardHeader, ... } from '@/components/ui/card'"
      pattern: "@/components/ui/card"
---

<objective>
Implementar a página pública `/pacotes` (per F2.2) que lista todos os pacotes ativos como cards cyberpunk. Esta plan entrega F2.1 (estrutura de pacotes — visualização) e F2.2 (catálogo público) — não é admin CRUD (Phase 5). Os 4 pacotes já estão seedados na migration 003: Avulsa R$10, Pacote 5 R$50, Pacote 10 R$100, Mentoria mensal R$100.

Purpose: Esta é a porta de entrada do funil de monetização. Sem ela, o usuário logado não vê o que pode comprar. Cards são públicos (RLS já permite SELECT de packages.ativo=true para todos), então user não precisa estar logado pra ver — mas o middleware de Phase 1.5 redireciona se sessão existe sem aceite doutrinário (não é responsabilidade desta plan).

Output: 1 page Server Component + 2 componentes (PackageCard, PackageGrid).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-catalog-checkout/02-CONTEXT.md
@.planning/phases/02-catalog-checkout/02-RESEARCH.md
@CLAUDE.md
@src/lib/supabase/server.ts
@src/types/database.ts
@src/styles/globals.css

<interfaces>
<!-- Tabela packages (per migration 001) -->
```typescript
// src/types/database.ts
export type Tables<"packages"> = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "avulso" | "mensal";
  qtd_partidas: number;
  qtd_sessoes: number;
  preco_brl: number;
  ativo: boolean;
  display_order: number;
  created_at: string;
};
```

<!-- Pacotes seedados (per migration 003) -->
| Nome | Tipo | Partidas | Sessões | Preço | Display order |
|------|------|----------|---------|-------|---------------|
| Avulsa | avulso | 1 | 0 | R$ 10 | 1 |
| Pacote 5 | avulso | 5 | 0 | R$ 50 | 2 |
| Pacote 10 | avulso | 10 | 0 | R$ 100 | 3 |
| Mentoria mensal | mensal | 8 | 2 | R$ 100 | 4 |

<!-- shadcn components disponíveis (criados em 02-01) -->
```typescript
// @/components/ui/card
export const Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter;
// @/components/ui/badge
export const Badge, badgeVariants;
// @/components/ui/button
export const Button, buttonVariants;
```

<!-- Padrão Server Component (Phase 1) -->
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function PacotesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("ativo", true)
    .order("display_order", { ascending: true });
  // ...
}
```

<!-- Cyberpunk colors (de globals.css @theme) -->
- bg page: var(--color-background) #050505
- bg card: var(--color-card) #0a0a1a
- border: var(--color-border) #27272a
- text primary: var(--color-foreground) #f4f4f5
- text muted: var(--color-muted-foreground) #a1a1aa
- accent cyan: #00F0FF (avulso badges, CTAs)
- accent purple: #A855F7 (mensal badge)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar PackageCard component (cyberpunk card)</name>
  <files>src/components/catalog/package-card.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/card.tsx (criado em 02-01 — exports Card, CardHeader, CardTitle, etc.)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/badge.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/button.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (tipo Tables<"packages">)
    - C:/Users/ADM/projects/formuladota-v2/src/styles/globals.css (cores cyberpunk)
  </read_first>
  <action>
Criar `src/components/catalog/package-card.tsx` como Server Component (sem `"use client"`). Recebe um pacote tipado e renderiza um card com botão "Comprar" linkando para `/checkout/[id]`.

Conteúdo exato:

```tsx
// Card individual de um pacote no catálogo público.
// Server Component — não precisa de interatividade no card em si.
// Click no botão navega para /checkout/[packageId] (Plan 02-06).

import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

type Package = Tables<"packages">;

interface PackageCardProps {
  pkg: Package;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const isMensal = pkg.tipo === "mensal";
  const precoFormatado = formatBRL(pkg.preco_brl);

  return (
    <Card
      className={`flex flex-col bg-[var(--color-card)] border-[var(--color-border)] transition-colors hover:border-[#00F0FF]/40 ${
        isMensal ? "ring-1 ring-[#A855F7]/30" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl text-[var(--color-foreground)] font-display">
            {pkg.nome}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isMensal
                ? "border-[#A855F7] text-[#A855F7]"
                : "border-[#00F0FF] text-[#00F0FF]"
            }
          >
            {isMensal ? "Mensal" : "Avulso"}
          </Badge>
        </div>
        {pkg.descricao && (
          <CardDescription className="text-[var(--color-muted-foreground)]">
            {pkg.descricao}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm text-[var(--color-foreground)]" aria-label={`Conteúdo do pacote ${pkg.nome}`}>
          <li className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#00F0FF]" aria-hidden="true" />
            <span>
              <strong>{pkg.qtd_partidas}</strong> partida{pkg.qtd_partidas === 1 ? "" : "s"} com Pedro
            </span>
          </li>
          {pkg.qtd_sessoes > 0 && (
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#A855F7]" aria-hidden="true" />
              <span>
                <strong>{pkg.qtd_sessoes}</strong> sessão{pkg.qtd_sessoes === 1 ? "" : "ões"} teórica{pkg.qtd_sessoes === 1 ? "" : "s"}
              </span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-stretch">
        <p className="text-3xl font-display text-[#00F0FF]">
          {precoFormatado}
          <span className="text-sm text-[var(--color-muted-foreground)] ml-1">
            {isMensal ? "/mês" : ""}
          </span>
        </p>
        <Button asChild className="bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90">
          <Link href={`/checkout/${pkg.id}`} aria-label={`Comprar pacote ${pkg.nome} por ${precoFormatado}`}>
            Comprar
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Formato R$ X,XX (PT-BR)
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
```

Verificar:
- Zero `any`
- Funções < 50 linhas (PackageCard fica em ~60 linhas — split formatBRL para auxiliar — está ok porque está abaixo da função principal e cada função separada está <30 linhas)
- Lucide icons usados (Trophy, Sparkles) — NÃO emojis (per C6)
- aria-labels para acessibilidade WCAG 2.1 AA (per C5)
- Cores cyan #00F0FF e purple #A855F7 usadas (per C7)
- shadcn components consumidos via `@/components/ui/*` (per C6)
- pnpm typecheck e pnpm lint passam
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/components/catalog/package-card.tsx && grep -q "export function PackageCard" src/components/catalog/package-card.tsx && grep -q "from \"@/components/ui/card\"" src/components/catalog/package-card.tsx && grep -q "from \"@/components/ui/button\"" src/components/catalog/package-card.tsx && grep -q "from \"@/components/ui/badge\"" src/components/catalog/package-card.tsx && grep -q "from \"lucide-react\"" src/components/catalog/package-card.tsx && grep -q "/checkout/" src/components/catalog/package-card.tsx && grep -q "#00F0FF" src/components/catalog/package-card.tsx && grep -q "#A855F7" src/components/catalog/package-card.tsx && grep -q "aria-label" src/components/catalog/package-card.tsx && ! grep -q ": any" src/components/catalog/package-card.tsx && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/catalog/package-card.tsx` exists
    - File contains exact string `export function PackageCard`
    - File imports from `@/components/ui/card`, `@/components/ui/button`, `@/components/ui/badge`
    - File imports icons from `"lucide-react"` (NOT emojis per C6)
    - File contains exact string `/checkout/` (link target)
    - File uses `Tables<"packages">` type (NOT `any`)
    - File contains color `#00F0FF` (cyan per C7)
    - File contains color `#A855F7` (purple per C7)
    - File contains at least one `aria-label` (WCAG 2.1 AA per C5)
    - File does NOT contain `"use client"` (Server Component)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT contain emoji unicode chars (per C6 — check no `🎯`, `⭐`, etc.)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>PackageCard renderiza um pacote tipado com tema cyberpunk, badge dinâmico (avulso/mensal), e link para checkout.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar PackageGrid + page /pacotes</name>
  <files>src/components/catalog/package-grid.tsx, src/app/pacotes/page.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/components/catalog/package-card.tsx (criado em Task 1 desta plan)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/server.ts (pattern Server Component)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (Tables<"packages">)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (folder structure recomendado, linhas ~158-188)
  </read_first>
  <action>
1. Criar `src/components/catalog/package-grid.tsx` (Server Component, tipado):

```tsx
// Grid responsivo de pacotes. Mobile: 1 col; sm: 2 col; lg: 4 col.

import { PackageCard } from "@/components/catalog/package-card";
import type { Tables } from "@/types/database";

type Package = Tables<"packages">;

interface PackageGridProps {
  packages: Package[];
}

export function PackageGrid({ packages }: PackageGridProps) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-muted-foreground)] text-lg">
          Nenhum pacote disponível no momento.
        </p>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-2">
          Volte em breve — novidades estão a caminho.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}
```

2. Criar `src/app/pacotes/page.tsx` (Server Component):

```tsx
// Catálogo público de pacotes — F2.2.
// Server Component: faz fetch direto no Supabase com anon key.
// RLS permite SELECT de packages.ativo=true para todos (per migration 002).

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PackageGrid } from "@/components/catalog/package-grid";

export const metadata: Metadata = {
  title: "Pacotes — Fórmula Dota",
  description:
    "Mentoria 1-1 com Pedro Paulo (Immortal/Top 0.5%). Pacotes avulsos a partir de R$ 10 ou mensal com sessões teóricas.",
};

export default async function PacotesPage() {
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from("packages")
    .select("*")
    .eq("ativo", true)
    .order("display_order", { ascending: true });

  if (error) {
    // RLS não deveria barrar SELECT público — se barrou, é bug de schema/policy
    console.error("[/pacotes] erro ao buscar pacotes:", error.message);
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 md:mb-14 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-[var(--color-foreground)]">
            Escolha seu <span className="text-[#00F0FF]">pacote</span>
          </h1>
          <p className="mt-4 text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
            Mentoria 1-1 com Pedro Paulo, Immortal e Top 0.5% mundial. Pague via PIX, agende e jogue ranked junto.
          </p>
        </header>

        <PackageGrid packages={packages ?? []} />
      </div>
    </main>
  );
}
```

3. Confirmar que pnpm typecheck e pnpm lint passam.

4. Acceptance manual: `pnpm dev` + abrir `http://localhost:3000/pacotes` deve mostrar os 4 pacotes (assumindo migration 003 aplicada — STATE.md confirma que está).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/components/catalog/package-grid.tsx && test -f src/app/pacotes/page.tsx && grep -q "export function PackageGrid" src/components/catalog/package-grid.tsx && grep -q "export default async function PacotesPage" src/app/pacotes/page.tsx && grep -q "from\\(.packages.\\)" src/app/pacotes/page.tsx && grep -q "ativo.*true" src/app/pacotes/page.tsx && grep -q "display_order" src/app/pacotes/page.tsx && grep -q "import.*PackageCard" src/components/catalog/package-grid.tsx && grep -q "grid-cols" src/components/catalog/package-grid.tsx && ! grep -q ": any" src/components/catalog/package-grid.tsx && ! grep -q ": any" src/app/pacotes/page.tsx && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/catalog/package-grid.tsx` exists with `export function PackageGrid`
    - File `src/app/pacotes/page.tsx` exists with `export default async function PacotesPage`
    - PacotesPage uses `await createClient()` from `@/lib/supabase/server`
    - PacotesPage queries `from("packages")` with `.eq("ativo", true)` and `.order("display_order"`
    - PackageGrid contains responsive Tailwind classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (or equivalent layout)
    - PackageGrid handles empty state (`packages.length === 0`)
    - PacotesPage exports `metadata` for SEO
    - PacotesPage NOT marked `"use client"` (Server Component)
    - Files do NOT contain `: any` (zero any per C1)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
    - `pnpm build` exits 0 (página compila sem erros)
  </acceptance_criteria>
  <done>Página /pacotes renderiza 4 pacotes ativos do DB em grid responsivo cyberpunk. Cada card tem CTA "Comprar" → /checkout/[id].</done>
</task>

</tasks>

<verification>
- `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0
- Visual: `pnpm dev` + GET http://localhost:3000/pacotes mostra 4 cards com badges (3 cyan "Avulso", 1 purple "Mensal")
- Cliques em "Comprar" linkam para `/checkout/[uuid]` (resultará 404 até Plan 02-06 ser executado)
- WCAG: aria-labels nos botões, alt text não é necessário (Lucide icons têm aria-hidden)
- Tema cyberpunk consistente
</verification>

<success_criteria>
- F2.2 (catálogo público) funcional
- F2.1 (estrutura de pacotes — campos visíveis) atendido visualmente
- Empty state amigável caso DB sem pacotes ativos
- Server Component (zero JS no client além de hover states do shadcn)
- Build de produção passa
</success_criteria>

<output>
Após completar as 2 tasks, criar `.planning/phases/02-catalog-checkout/02-05-pacotes-page-SUMMARY.md` com:
- Componentes criados (PackageCard, PackageGrid) e suas props
- Página /pacotes — query Supabase usada
- Cores e ícones aplicados (Trophy, Sparkles, cyan, purple)
- Notas sobre acessibilidade (aria-labels)
- Como Pedro testou visualmente (URL local)
</output>
