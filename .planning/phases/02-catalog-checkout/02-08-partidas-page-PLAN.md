---
phase: 02-catalog-checkout
plan: 08
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - src/app/partidas/page.tsx
  - src/components/partidas/saldo-card.tsx
autonomous: true
requirements: [F3.4, C1, C5, C6, C7]
must_haves:
  truths:
    - "Página /partidas requer auth (middleware Phase 1.5 já enforça redirect /login se sem sessão)"
    - "Mostra saldo agregado: SUM(partidas_compradas - partidas_usadas) e SUM(sessoes_compradas - sessoes_usadas) onde status='pago'"
    - "Empty state amigável quando saldo zero: convite com Link para /pacotes"
    - "Lista de purchases com status='pago' (compras válidas) — id curto, pacote, data_compra, partidas restantes"
    - "Aceita filter implícito de Phase 3+ (matches agendadas) — mas não renderiza calendário (out of scope Phase 2)"
    - "Server Component, RLS protege visualização (user vê apenas suas próprias purchases)"
    - "Tema cyberpunk + WCAG 2.1 AA"
  artifacts:
    - path: "src/app/partidas/page.tsx"
      provides: "Server Component que mostra saldo agregado + lista de compras pagas"
      min_lines: 50
    - path: "src/components/partidas/saldo-card.tsx"
      provides: "Card destaque com saldo agregado de partidas e sessões"
      exports: ["SaldoCard"]
      min_lines: 35
  key_links:
    - from: "src/app/partidas/page.tsx"
      to: "src/lib/supabase/server.ts"
      via: "createClient + select purchases (RLS filtra por user.id)"
      pattern: "from..purchases"
    - from: "src/app/partidas/page.tsx"
      to: "src/components/partidas/saldo-card.tsx"
      via: "import SaldoCard + render com saldo agregado"
      pattern: "SaldoCard"
---

<objective>
Implementar página `/partidas` (per F3.4 acceptance criteria — "Saldo aparece em 'minhas partidas' após pagamento"). Esta página é minimal na Phase 2 — não tem calendário ainda (Phase 3). Mostra:

1. **SaldoCard** (destaque no topo): saldo agregado de partidas e sessões disponíveis (compradas - usadas, somadas em todas purchases pagas)
2. **Lista de compras pagas**: id curto, nome do pacote, data, partidas restantes naquela compra
3. **Empty state**: se saldo zero E sem compras → CTA "Conhecer pacotes" linkando para /pacotes
4. **Auth**: middleware Phase 1.5 já redireciona se sem sessão; aqui apenas confirma user (defensive)

Purpose: É a "validação visual" que o webhook funcionou. Após Pedro pagar PIX em sandbox, deve abrir /partidas e VER o saldo. Sem esta página, F3.4 não é verificável end-to-end visualmente. Phase 3 vai adicionar agendamento — esta plan só monta a estrutura de saldo + lista.

Output: 1 page Server Component + 1 Card component (SaldoCard). Componente de lista de purchases pode ser inline na page (poucos elementos).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-catalog-checkout/02-CONTEXT.md
@CLAUDE.md
@src/lib/supabase/server.ts
@src/types/database.ts
@src/styles/globals.css

<interfaces>
Schema purchases (per migration 001):
```typescript
type Purchase = {
  id: string;
  user_id: string;
  package_id: string;
  status: "pendente" | "pago" | "expirado" | "cancelado";
  preco_pago: number;
  partidas_compradas: number;
  partidas_usadas: number;
  sessoes_compradas: number;
  sessoes_usadas: number;
  data_compra: string;  // ISO
  // ...
};
```

RLS (migration 002):
- "users see own purchases" — user vê apenas WHERE user_id = auth.uid()
- Server Component com createClient() respeita RLS automaticamente

shadcn (criados em 02-01):
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

Cores cyberpunk (de globals.css):
- bg page: var(--color-background) #050505
- bg card: var(--color-card) #0a0a1a
- accent cyan: #00F0FF (saldo destaque)
- accent purple: #A855F7 (sessões teóricas)
- text muted: var(--color-muted-foreground) #a1a1aa
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar SaldoCard component</name>
  <files>src/components/partidas/saldo-card.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/card.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/styles/globals.css (cores cyberpunk)
  </read_first>
  <action>
Criar `src/components/partidas/saldo-card.tsx` — Server Component, recebe contagens agregadas e renderiza card destaque com glow cyan.

Conteúdo:

```tsx
// Card destaque com saldo agregado de partidas e sessões.
// Server Component — só apresentação.

import { Trophy, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SaldoCardProps {
  partidasDisponiveis: number;
  sessoesDisponiveis: number;
}

export function SaldoCard({ partidasDisponiveis, sessoesDisponiveis }: SaldoCardProps) {
  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)] ring-1 ring-[#00F0FF]/20">
      <CardContent className="py-8">
        <p className="text-sm text-[var(--color-muted-foreground)] uppercase tracking-wider mb-4">
          Seu saldo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <Trophy className="h-10 w-10 text-[#00F0FF]" aria-hidden="true" />
            <div>
              <p className="text-4xl font-display text-[#00F0FF] text-glow-cyan">
                {partidasDisponiveis}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                partida{partidasDisponiveis === 1 ? "" : "s"} disponível{partidasDisponiveis === 1 ? "" : "eis"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sparkles className="h-10 w-10 text-[#A855F7]" aria-hidden="true" />
            <div>
              <p className="text-4xl font-display text-[#A855F7] text-glow-purple">
                {sessoesDisponiveis}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                sessão{sessoesDisponiveis === 1 ? "" : "ões"} teórica{sessoesDisponiveis === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

Confirmar:
- Zero `any`
- Lucide icons (Trophy, Sparkles) — não emojis
- Cores cyan #00F0FF e purple #A855F7
- Classes utility text-glow-cyan / text-glow-purple definidas em globals.css
- Plurais PT-BR corretos (1 partida / 2 partidas; 1 sessão / 2 sessões)
- WCAG: aria-hidden nos icons (texto alternativo está nos labels)
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/components/partidas/saldo-card.tsx && grep -q "export function SaldoCard" src/components/partidas/saldo-card.tsx && grep -q "from \"@/components/ui/card\"" src/components/partidas/saldo-card.tsx && grep -q "from \"lucide-react\"" src/components/partidas/saldo-card.tsx && grep -q "#00F0FF" src/components/partidas/saldo-card.tsx && grep -q "#A855F7" src/components/partidas/saldo-card.tsx && grep -q "Trophy" src/components/partidas/saldo-card.tsx && grep -q "Sparkles" src/components/partidas/saldo-card.tsx && grep -q "text-glow-cyan" src/components/partidas/saldo-card.tsx && grep -q "text-glow-purple" src/components/partidas/saldo-card.tsx && grep -q "text-glow-cyan" src/styles/globals.css && grep -q "text-glow-purple" src/styles/globals.css && grep -q "aria-hidden" src/components/partidas/saldo-card.tsx && ! grep -q ": any" src/components/partidas/saldo-card.tsx && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/partidas/saldo-card.tsx` exists
    - File contains exact string `export function SaldoCard`
    - Component takes `partidasDisponiveis` and `sessoesDisponiveis` numeric props
    - File imports Trophy and Sparkles from `"lucide-react"` (NOT emojis per C6)
    - File contains color `#00F0FF` (cyan per C7)
    - File contains color `#A855F7` (purple per C7)
    - File uses utility classes `text-glow-cyan` and `text-glow-purple` (definidos em globals.css)
    - Utility `text-glow-cyan` exists in `src/styles/globals.css` (verificação defensiva — não deve ter sido removido)
    - Utility `text-glow-purple` exists in `src/styles/globals.css` (verificação defensiva — não deve ter sido removido)
    - Icons have `aria-hidden="true"` (acessibilidade — texto está nos labels)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT marked `"use client"` (Server Component — só apresentação)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>SaldoCard renderiza saldo agregado com tema cyberpunk e plurais PT-BR corretos.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar /partidas/page.tsx (Server Component)</name>
  <files>src/app/partidas/page.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/components/partidas/saldo-card.tsx (criado em Task 1 desta plan)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/server.ts (createClient pattern)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (Tables purchases)
    - C:/Users/ADM/projects/formuladota-v2/src/app/pacotes/page.tsx (criado em 02-05 — referência de Server Component pattern)
  </read_first>
  <action>
Criar `src/app/partidas/page.tsx`. Server Component que:

1. `await createClient()` + `auth.getUser()` — defensive (middleware já garante)
2. Query `purchases` com filtros: `user_id = user.id` (RLS já cuida) e `status = 'pago'` (RLS NÃO filtra por status)
3. Calcular saldo agregado: SUM(partidas_compradas - partidas_usadas) e SUM(sessoes_compradas - sessoes_usadas)
4. Renderizar SaldoCard + lista de purchases ou empty state

Conteúdo:

```tsx
// /partidas — perfil mínimo de saldo do user logado.
// Phase 2 entrega só saldo + lista; calendário de agendamento vem na Phase 3.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SaldoCard } from "@/components/partidas/saldo-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Minhas Partidas — Fórmula Dota",
};

export default async function PartidasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defensive — middleware já enforça login + aceite. Mas se algo passar, redirect.
  if (!user) redirect("/login");

  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("id, status, preco_pago, partidas_compradas, partidas_usadas, sessoes_compradas, sessoes_usadas, data_compra, package_id, packages(nome)")
    .eq("status", "pago")
    .order("data_compra", { ascending: false });

  if (error) {
    console.error("[/partidas] erro ao buscar compras:", error.message);
  }

  const compras = purchases ?? [];
  const partidasDisponiveis = compras.reduce(
    (sum, p) => sum + (p.partidas_compradas - p.partidas_usadas),
    0
  );
  const sessoesDisponiveis = compras.reduce(
    (sum, p) => sum + (p.sessoes_compradas - p.sessoes_usadas),
    0
  );

  const semSaldo = partidasDisponiveis === 0 && sessoesDisponiveis === 0;

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display text-[var(--color-foreground)]">
            Minhas <span className="text-[#00F0FF]">partidas</span>
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Saldo disponível para agendar partidas e sessões com Pedro.
          </p>
        </header>

        <SaldoCard
          partidasDisponiveis={partidasDisponiveis}
          sessoesDisponiveis={sessoesDisponiveis}
        />

        {semSaldo && (
          <Card className="mt-8 bg-[var(--color-card)] border-[var(--color-border)] border-dashed">
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-[var(--color-muted-foreground)] mb-4" aria-hidden="true" />
              <h2 className="text-xl text-[var(--color-foreground)] mb-2">Sem saldo ainda</h2>
              <p className="text-[var(--color-muted-foreground)] mb-6 max-w-md mx-auto">
                Você ainda não tem partidas ou sessões disponíveis. Conheça os pacotes e comece sua mentoria com Pedro.
              </p>
              <Button asChild className="bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90">
                <Link href="/pacotes">Ver pacotes</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!semSaldo && compras.length > 0 && (
          <section className="mt-10" aria-label="Histórico de compras">
            <h2 className="text-xl text-[var(--color-foreground)] mb-4">Compras pagas</h2>
            <ul className="space-y-3">
              {compras.map((p) => {
                const partidasRest = p.partidas_compradas - p.partidas_usadas;
                const sessoesRest = p.sessoes_compradas - p.sessoes_usadas;
                const dataCompra = new Date(p.data_compra).toLocaleDateString("pt-BR");
                const packageNome = Array.isArray(p.packages) ? p.packages[0]?.nome : p.packages?.nome;

                return (
                  <li key={p.id}>
                    <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
                      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-[var(--color-foreground)] font-medium">
                            {packageNome ?? "Pacote"}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            #{p.id.slice(0, 8)} • {dataCompra}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {partidasRest > 0 && (
                            <Badge variant="outline" className="border-[#00F0FF] text-[#00F0FF]">
                              {partidasRest} partida{partidasRest === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {sessoesRest > 0 && (
                            <Badge variant="outline" className="border-[#A855F7] text-[#A855F7]">
                              {sessoesRest} sessão{sessoesRest === 1 ? "" : "ões"}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
```

Confirmar pnpm typecheck, pnpm lint, pnpm build.

NOTA: a query usa join com packages (`packages(nome)`). Supabase retorna isso como array OU objeto dependendo do hint de relação — o código trata ambos via `Array.isArray(p.packages)`.

**Type safety (C1 — não-negociável)**: Se TypeScript reclamar do tipo retornado pelo join (`packages` como array vs objeto), USAR APPROACH 2-QUERY:
1. Query `purchases` sem join (tipos limpos do Database).
2. Coletar `package_id` distintos.
3. Query separada `packages` filtrando por esses IDs.
4. Merge no JS via `Map<id, package>`.

ZERO `any` e ZERO `unknown` casts. NUNCA usar `as unknown as T` ou `: unknown` como workaround para silenciar erro de tipagem — é violação direta de C1. Prefira approach 2-query ou type guard com runtime check via Zod schema.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/app/partidas/page.tsx && grep -q "export default async function PartidasPage" src/app/partidas/page.tsx && grep -q "SaldoCard" src/app/partidas/page.tsx && grep -q "from..purchases" src/app/partidas/page.tsx && grep -q 'status.*"pago"' src/app/partidas/page.tsx && grep -q "partidas_compradas - p.partidas_usadas" src/app/partidas/page.tsx && grep -q "sessoes_compradas - p.sessoes_usadas" src/app/partidas/page.tsx && grep -q "/pacotes" src/app/partidas/page.tsx && ! grep -q ": any" src/app/partidas/page.tsx && ! grep -qE ": (any|unknown)\b" src/app/partidas/page.tsx && ! grep -q "as unknown as" src/app/partidas/page.tsx && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/partidas/page.tsx` exists
    - File contains `export default async function PartidasPage`
    - File renders `<SaldoCard>` with `partidasDisponiveis` and `sessoesDisponiveis`
    - File queries `purchases` with `.eq("status", "pago")` (apenas compras pagas — não pendentes)
    - File aggregates saldo via `partidas_compradas - partidas_usadas` and `sessoes_compradas - sessoes_usadas`
    - File handles empty state (`semSaldo === true`) with Link to `/pacotes`
    - File renders list of purchases with id curto (`p.id.slice(0, 8)`), data formatada PT-BR, badges dos restantes
    - File NOT marked `"use client"` (Server Component)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT contain unsafe `: unknown` annotations or `as unknown as` casts (zero unknown casts per C1 — usar 2-query approach se join der erro de tipo)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Página /partidas mostra saldo agregado + lista de compras pagas. Empty state convida a /pacotes. Phase 2 fechada visualmente.</done>
</task>

</tasks>

<verification>
- pnpm typecheck, pnpm lint, pnpm build exit 0
- Manual end-to-end: user logado + sem compras → /partidas mostra empty state + CTA → clica "Ver pacotes" → /pacotes
- Manual end-to-end: user faz compra (Plan 02-05/06) + simula pagamento (Plan 02-07 webhook) → /partidas mostra SaldoCard com 1 partida + 1 item na lista
- Visual: cyan glow no número de partidas, purple glow no número de sessões, tema cyberpunk consistente
- WCAG: aria-labels e aria-hidden corretos, plurais PT-BR
</verification>

<success_criteria>
- Acceptance criteria do PRD §6 Phase 2 atendido: "Saldo aparece em 'minhas partidas' após pagamento"
- Empty state amigável (não vazio crash) quando user logado mas sem compras
- Phase 2 visualmente fechada — user pode navegar pacotes → checkout → pagar → ver saldo
- Phase 3 vai consumir essa estrutura (adicionar agendamento de slot)
</success_criteria>

<output>
Após completar as 2 tasks, criar `.planning/phases/02-catalog-checkout/02-08-partidas-page-SUMMARY.md` com:
- Componente SaldoCard: props e visual cyberpunk
- Page /partidas: query Supabase, agregação de saldo, empty state
- Notas sobre join packages(nome) — tipo array/objeto na resposta Supabase
- Como Pedro testou visualmente após webhook simulado
</output>
