---
phase: 02-catalog-checkout
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components.json
  - src/lib/utils.ts
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/skeleton.tsx
  - src/components/ui/sonner.tsx
  - src/app/layout.tsx
  - src/styles/globals.css
  - package.json
  - pnpm-lock.yaml
autonomous: true
requirements: [C5, C6, C7]
must_haves:
  truths:
    - "shadcn/ui componentes Button, Card, Badge, Skeleton e Sonner existem em src/components/ui/"
    - "components.json existe na raiz com aliases corretos"
    - "Toaster <Sonner /> renderizado no layout root"
    - "pnpm typecheck passa após instalação"
    - "Utilitário cn() exportado de src/lib/utils.ts"
  artifacts:
    - path: "components.json"
      provides: "shadcn/ui config (aliases, baseColor, cssVariables)"
      contains: "\"$schema\""
    - path: "src/lib/utils.ts"
      provides: "cn() helper para Tailwind class merging"
      exports: ["cn"]
    - path: "src/components/ui/button.tsx"
      provides: "Button component com variants cyber-themed"
      min_lines: 30
    - path: "src/components/ui/card.tsx"
      provides: "Card / CardHeader / CardContent / CardFooter"
      min_lines: 40
    - path: "src/components/ui/badge.tsx"
      provides: "Badge component com variants"
      min_lines: 20
    - path: "src/components/ui/skeleton.tsx"
      provides: "Skeleton loading placeholder"
      min_lines: 8
    - path: "src/components/ui/sonner.tsx"
      provides: "Toaster wrapper de sonner"
      min_lines: 15
  key_links:
    - from: "src/app/layout.tsx"
      to: "src/components/ui/sonner.tsx"
      via: "<Toaster /> no body"
      pattern: "<Toaster"
    - from: "src/components/ui/*"
      to: "src/lib/utils.ts"
      via: "import { cn }"
      pattern: "from \"@/lib/utils\""
---

<objective>
Inicializar shadcn/ui no projeto com Tailwind v4 (`@canary` CLI), instalar 5 componentes mínimos da Phase 2 (Button, Card, Badge, Skeleton, Sonner) e ajustar o layout root para renderizar `<Toaster />` global. Esta plan é a fundação visual de todas as páginas da Phase 2.

Purpose: Phase 2 monta `/pacotes`, `/checkout/[packageId]`, `/partidas`. Todas dependem desses 5 componentes shadcn. Sem essa base, plans Wave 2 não podem renderizar UI minimamente padronizada/acessível.

Output: components.json, src/lib/utils.ts, 5 componentes em src/components/ui/, sonner instalado e Toaster montado no layout root.
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-catalog-checkout/02-CONTEXT.md
@.planning/phases/02-catalog-checkout/02-RESEARCH.md
@CLAUDE.md
@src/styles/globals.css
@src/app/layout.tsx
@package.json

<interfaces>
<!-- Tailwind v4 design tokens existentes em src/styles/globals.css -->

```css
@theme {
  --color-background: #050505;
  --color-foreground: #f4f4f5;
  --color-muted: #18181b;
  --color-muted-foreground: #a1a1aa;
  --color-card: #0a0a1a;
  --color-card-foreground: #f4f4f5;
  --color-border: #27272a;
  --color-input: #18181b;
  --color-cyan: #00f0ff;
  --color-purple: #a855f7;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

shadcn/ui usa `--background`, `--foreground`, `--border`, `--card` etc. Mapear no globals.css se necessário (alias direto), OU manter as classes Tailwind já existentes (`bg-[var(--color-card)]`) reescrevendo os componentes.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inicializar shadcn/ui via CLI canary</name>
  <files>components.json, src/lib/utils.ts, package.json, pnpm-lock.yaml, src/styles/globals.css</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/package.json (ver versão Tailwind v4 beta + Next 16)
    - C:/Users/ADM/projects/formuladota-v2/src/styles/globals.css (ver design tokens existentes)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "shadcn/ui + Tailwind v4")
  </read_first>
  <action>
Executar `pnpm dlx shadcn@canary init` no diretório raiz `C:/Users/ADM/projects/formuladota-v2`. Quando prompt aparecer, escolher:
- Style: New York (default)
- Base color: Zinc
- CSS variables: Yes
- React Server Components: Yes
- Path alias: `@/*` (já configurado em tsconfig.json)
- components alias: `@/components`
- utils alias: `@/lib/utils`

Após init:

1. Verificar que `components.json` foi criado na raiz com schema válido (`"$schema": "https://ui.shadcn.com/schema.json"`).
2. Verificar que `src/lib/utils.ts` foi criado com export `cn` usando `clsx` + `tailwind-merge` (deps já existem em package.json — não reinstalar).
3. **NÃO substituir** o conteúdo de `src/styles/globals.css` se a CLI tentar — precisamos preservar o `@theme` cyberpunk existente. Se a CLI sobrescreveu, restaurar manualmente os tokens listados no `<interfaces>` acima e adicionar APENAS os tokens shadcn faltantes (`--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--ring`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--muted`, `--muted-foreground`, `--popover`, `--popover-foreground`, `--input`) mapeando para as cores cyberpunk existentes (background → #050505, foreground → #f4f4f5, card → #0a0a1a, border → #27272a, primary → cyan #00f0ff, accent → purple #a855f7, destructive → #ef4444).
4. Se CLI tentar instalar `tailwindcss-animate`, RECUSAR (incompatível com v4) — usar `tw-animate-css` se Sonner exigir animação.

Comandos exatos:
```bash
pnpm dlx shadcn@canary init
# Responder prompts conforme acima
pnpm typecheck
```

Se algum erro de typecheck, ajustar tsconfig paths (`"@/*": ["./src/*"]` deve já existir).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && pnpm typecheck && test -f components.json && test -f src/lib/utils.ts && grep -q "export.*cn" src/lib/utils.ts && grep -q "color-cyan" src/styles/globals.css</automated>
  </verify>
  <acceptance_criteria>
    - File `C:/Users/ADM/projects/formuladota-v2/components.json` exists
    - `components.json` contains exact string `"$schema"` and `"aliases"`
    - File `C:/Users/ADM/projects/formuladota-v2/src/lib/utils.ts` exists
    - `src/lib/utils.ts` contains `export function cn` (or `export const cn`)
    - `src/styles/globals.css` still contains `--color-cyan: #00f0ff` (tokens cyberpunk preservados)
    - `pnpm typecheck` exits 0
    - `package.json` does NOT contain `"tailwindcss-animate"` in dependencies (incompatible with v4)
  </acceptance_criteria>
  <done>shadcn/ui inicializado, utils.ts exportando cn(), tokens cyberpunk intactos, typecheck verde.</done>
</task>

<task type="auto">
  <name>Task 2: Adicionar componentes Button, Card, Badge, Skeleton, Sonner</name>
  <files>src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/badge.tsx, src/components/ui/skeleton.tsx, src/components/ui/sonner.tsx, package.json, pnpm-lock.yaml</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/components.json (criado em Task 1)
    - C:/Users/ADM/projects/formuladota-v2/src/styles/globals.css (verificar tokens disponíveis)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Componentes necessários para Phase 2")
  </read_first>
  <action>
Executar `pnpm dlx shadcn@canary add button card badge skeleton sonner` em `C:/Users/ADM/projects/formuladota-v2`. Aceitar todos os prompts (sobrescrever se perguntar).

A CLI vai:
- Instalar `sonner` em dependencies (deve aparecer em package.json)
- Instalar `@radix-ui/react-slot` (Button asChild)
- Criar `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `skeleton.tsx`, `sonner.tsx`

Após adição:

1. Abrir cada arquivo gerado e confirmar que:
   - `button.tsx` exporta `Button` e `buttonVariants`
   - `card.tsx` exporta `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
   - `badge.tsx` exporta `Badge` e `badgeVariants`
   - `skeleton.tsx` exporta `Skeleton`
   - `sonner.tsx` exporta `Toaster` (wrapper do Sonner com `theme="dark"` ou usando `useTheme` — se gerou com `next-themes`, REMOVER essa dep e simplificar para `theme="dark"` hardcoded — projeto não usa next-themes, é dark-only).

2. Se `sonner.tsx` importou `useTheme` de `next-themes`, substituir por:
```tsx
"use client";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-[var(--color-card)] group-[.toaster]:text-[var(--color-foreground)] group-[.toaster]:border-[var(--color-border)]",
          description: "group-[.toast]:text-[var(--color-muted-foreground)]",
          actionButton: "group-[.toast]:bg-[var(--color-cyan)] group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-[var(--color-muted)] group-[.toast]:text-[var(--color-muted-foreground)]",
        },
      }}
      {...props}
    />
  );
}
```

3. **NÃO instalar `next-themes`** — não é necessário (projeto é dark-only).

4. Confirmar que `pnpm typecheck` e `pnpm lint` ainda passam.

Comandos:
```bash
pnpm dlx shadcn@canary add button card badge skeleton sonner
# Se prompts aparecerem para sobrescrever sonner, aceitar e depois editar manualmente conforme passo 2
pnpm typecheck && pnpm lint
```
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/components/ui/button.tsx && test -f src/components/ui/card.tsx && test -f src/components/ui/badge.tsx && test -f src/components/ui/skeleton.tsx && test -f src/components/ui/sonner.tsx && grep -q "export.*Button" src/components/ui/button.tsx && grep -q "export.*Card" src/components/ui/card.tsx && grep -q "export.*Toaster" src/components/ui/sonner.tsx && grep -q "\"sonner\"" package.json && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/ui/button.tsx` exists with `export ` and `Button`
    - File `src/components/ui/card.tsx` exists with at least `Card`, `CardHeader`, `CardContent`, `CardFooter` exports
    - File `src/components/ui/badge.tsx` exists with `export ` and `Badge`
    - File `src/components/ui/skeleton.tsx` exists with `export ` and `Skeleton`
    - File `src/components/ui/sonner.tsx` exists with `export ` and `Toaster`
    - `package.json` dependencies contains `"sonner"`
    - `package.json` dependencies does NOT contain `"next-themes"` (dark-only, sem theme switcher)
    - `src/components/ui/sonner.tsx` does NOT import from `"next-themes"`
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>5 componentes shadcn instalados, sonner sem dep de next-themes, typecheck + lint verdes.</done>
</task>

<task type="auto">
  <name>Task 3: Montar Toaster global no layout root</name>
  <files>src/app/layout.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/app/layout.tsx (estado atual)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/sonner.tsx (criado em Task 2)
  </read_first>
  <action>
Editar `src/app/layout.tsx` para importar `Toaster` de `@/components/ui/sonner` e renderizar `<Toaster />` dentro do `<body>`, após `{children}`. O resultado final deve ser:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fórmula Dota — mentoria Immortal em tempo real",
  description:
    "Compre partidas ranked com Pedro Paulo (Immortal/Top 0.5%). Mentoria 1-1 dentro do jogo, agendada via Discord.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

Verificar typecheck e lint após edição.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "import.*Toaster.*from.*@/components/ui/sonner" src/app/layout.tsx && grep -q "<Toaster" src/app/layout.tsx && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/layout.tsx` contains exact string `import { Toaster } from "@/components/ui/sonner"`
    - `src/app/layout.tsx` contains `<Toaster />` (with self-closing or `<Toaster></Toaster>`)
    - `<Toaster />` is rendered AFTER `{children}` inside `<body>` (not before, not outside)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Toaster global montado no body do layout root, pronto para uso via `toast()` de qualquer Client Component.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exits 0
- `pnpm lint` exits 0
- `components.json` exists na raiz
- 5 componentes existem em `src/components/ui/`
- `Toaster` montado no layout root
- Tokens cyberpunk preservados em `globals.css`
- Nenhuma dep desnecessária instalada (sem `next-themes`, sem `tailwindcss-animate`)
</verification>

<success_criteria>
- shadcn/ui base operacional para plans Wave 2 consumir
- Button, Card, Badge, Skeleton, Sonner disponíveis via `@/components/ui/*`
- `cn()` helper exportado em `@/lib/utils`
- Build passa
</success_criteria>

<output>
Após completar as 3 tasks, criar `.planning/phases/02-catalog-checkout/02-01-shadcn-setup-SUMMARY.md` documentando:
- Versão do shadcn CLI usada
- Componentes adicionados
- Quaisquer ajustes manuais feitos em sonner.tsx ou globals.css
- Estado final do components.json (style, baseColor, aliases)
</output>
