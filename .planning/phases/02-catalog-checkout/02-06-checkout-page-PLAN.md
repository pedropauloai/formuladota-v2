---
phase: 02-catalog-checkout
plan: 06
type: execute
wave: 2
depends_on: ["02-01", "02-02"]
files_modified:
  - src/app/checkout/[packageId]/actions.ts
  - src/app/checkout/[packageId]/page.tsx
  - src/components/checkout/qr-code-display.tsx
  - src/components/checkout/checkout-client.tsx
autonomous: true
requirements: [F3.1, F3.2, F3.3, C1, C3, C5, C6, C7]
must_haves:
  truths:
    - "Server Action createCheckout valida packageId via Zod (UUID)"
    - "createCheckout busca pacote ativo, cria purchase com status='pendente', chama AbacatePay, salva external_payment_id"
    - "RLS bloqueia insert em purchases se user não aceitou doutrina ou status != 'ok'/'warned' — Server Action retorna mensagem amigável (não vaza detalhes técnicos)"
    - "Página /checkout/[packageId] mostra QR Code (brCodeBase64 PNG inline + brCode texto copiar) após action retornar success"
    - "Botão 'Copiar código PIX' copia brCode para clipboard e dispara toast (sonner)"
    - "Erro amigável se package inexistente/inativo ou RLS bloquear"
    - "Zero any, async/await, Zod validação"
  artifacts:
    - path: "src/app/checkout/[packageId]/actions.ts"
      provides: "Server Action createCheckout: cria purchase pendente + chama AbacatePay createTransparentPix + salva external_payment_id"
      exports: ["createCheckout"]
      min_lines: 70
    - path: "src/app/checkout/[packageId]/page.tsx"
      provides: "Server Component que valida pacote ativo (404 se não) e renderiza CheckoutClient"
      min_lines: 30
    - path: "src/components/checkout/checkout-client.tsx"
      provides: "Client Component que dispara Server Action no mount e renderiza QR Code"
      exports: ["CheckoutClient"]
      min_lines: 50
    - path: "src/components/checkout/qr-code-display.tsx"
      provides: "QR Code (img base64) + botão copiar brCode com toast feedback"
      exports: ["QRCodeDisplay"]
      min_lines: 40
  key_links:
    - from: "src/app/checkout/[packageId]/actions.ts"
      to: "src/lib/abacatepay.ts"
      via: "import createTransparentPix"
      pattern: "createTransparentPix"
    - from: "src/app/checkout/[packageId]/actions.ts"
      to: "src/lib/supabase/server.ts"
      via: "createClient + insert purchases (RLS valida aceite/status)"
      pattern: "from..purchases"
    - from: "src/components/checkout/checkout-client.tsx"
      to: "src/app/checkout/[packageId]/actions.ts"
      via: "import createCheckout + useTransition"
      pattern: "createCheckout"
    - from: "src/components/checkout/qr-code-display.tsx"
      to: "sonner"
      via: "import toast from sonner"
      pattern: "from .sonner."
---

<objective>
Implementar fluxo de checkout PIX (per F3.1, F3.2, F3.3) — heart da Phase 2:

1. Server Action createCheckout(packageId) (per Pattern 1 do RESEARCH.md, linhas 196-287): valida input, busca pacote ativo, cria purchase pendente (RLS valida aceite + status), chama AbacatePay para gerar PIX, salva external_payment_id e retorna QR Code data.

2. Página /checkout/[packageId] (Server Component): valida que pacote existe e está ativo (404 amigável se não), renderiza CheckoutClient passando dados do pacote.

3. CheckoutClient (Client Component): chama createCheckout ao montar, mostra estados loading/success/error, renderiza QRCodeDisplay quando QR pronto.

4. QRCodeDisplay: mostra QR Code inline (img src=brCodeBase64) + botão Copiar código PIX que copia brCode ao clipboard com toast (sonner).

Purpose: F3.1-F3.3 são o core da monetização. Sem esta plan, usuário clica Comprar no /pacotes e bate em 404. AbacatePay client (Plan 02-02) já existe; falta wirá-lo via UI. Webhook handler (Plan 02-07) é independente — fecha o ciclo (PIX pago → saldo liberado).

Output: 4 arquivos (1 Server Action, 1 page, 2 components).
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
@src/app/onboarding/doutrina/actions.ts

<interfaces>
Server Action de Plan 02-02 (já criada):
```typescript
// src/lib/abacatepay.ts
export type CreateTransparentPixResult =
  | { success: true; data: TransparentPixData }
  | { success: false; error: string };

export async function createTransparentPix(
  input: { amount: number; description: string; externalId: string; expiresIn?: number }
): Promise<CreateTransparentPixResult>;

// TransparentPixData inclui: id, brCode, brCodeBase64, expiresAt, amount, status
```

Schema purchases (per migration 001 + 004 RLS):
```sql
purchases (
  id uuid pk,
  user_id uuid → profiles(id),
  package_id uuid → packages(id),
  status text in ('pendente','pago','expirado','cancelado') default 'pendente',
  external_payment_id text,
  preco_pago numeric(10,2),
  partidas_compradas integer,
  sessoes_compradas integer default 0,
  ...
);

-- RLS (migration 004) — INSERT exige:
-- auth.uid() = user_id
-- AND has_accepted_doctrine(auth.uid())
-- AND is_user_active(auth.uid())   -- ok ou warned
-- Erro Postgres "new row violates row-level security policy" → code 42501
```

Padrão Server Action (Phase 1.5):
```typescript
// src/app/onboarding/doutrina/actions.ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function acceptDoctrine(formData: FormData): Promise<void> { ... }
```

Pattern 1 do RESEARCH.md — copiar literalmente como base do createCheckout. Ver linhas 196-287 do .planning/phases/02-catalog-checkout/02-RESEARCH.md.

shadcn (criados em 02-01):
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Criar Server Action createCheckout</name>
  <files>src/app/checkout/[packageId]/actions.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/app/onboarding/doutrina/actions.ts (pattern Server Action existente)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/abacatepay.ts (criado em 02-02 — exports createTransparentPix)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/server.ts (createClient pattern)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (Tables purchases, packages)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (Pattern 1 — Server Action createCheckout, linhas 196-287)
    - C:/Users/ADM/projects/formuladota-v2/supabase/migrations/004_doctrine_and_moderation.sql (policy active users create own purchases — código erro 42501 = RLS bloqueio)
  </read_first>
  <behavior>
    - Test 1: input com packageId não-UUID → retorna { success: false, error: "ID de pacote inválido." }
    - Test 2: usuário não autenticado → retorna { success: false, error: "Não autenticado." }
    - Test 3: package não encontrado ou ativo=false → retorna { success: false, error: "Pacote não encontrado ou inativo." }
    - Test 4: RLS bloqueia INSERT (sem aceite ou suspenso) → retorna mensagem amigável (não vaza erro técnico)
    - Test 5: AbacatePay falha → faz cleanup da purchase órfã (DELETE) + retorna error genérico
    - Test 6: success path → retorna { success: true, purchaseId, brCode, brCodeBase64, expiresAt } E persiste external_payment_id na purchase
  </behavior>
  <action>
Criar src/app/checkout/[packageId]/actions.ts baseado em Pattern 1 do RESEARCH.md (linhas 196-287). REFATORAR a função principal em helpers privados para manter < 50 linhas (CLAUDE.md max). Conteúdo:

```typescript
"use server";

// Server Action: cria purchase pendente + chama AbacatePay para gerar PIX.
// RLS na tabela purchases (migration 004) valida aceite doutrina + status ativo automaticamente.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTransparentPix } from "@/lib/abacatepay";

const checkoutInputSchema = z.object({
  packageId: z.string().uuid(),
});

interface ActivePackage {
  id: string;
  nome: string;
  preco_brl: number;
  qtd_partidas: number;
  qtd_sessoes: number;
}

export type CheckoutResult =
  | {
      success: true;
      purchaseId: string;
      brCode: string;
      brCodeBase64: string;
      expiresAt: string;
    }
  | { success: false; error: string };

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>;

/**
 * Cria uma compra pendente e gera um PIX inline via AbacatePay V2.
 * Retorna o QR Code (brCode + brCodeBase64) para o cliente exibir.
 *
 * RLS valida: usuário autenticado + aceite doutrinário + status ok/warned.
 * Se RLS bloqueia (postgres code 42501), retorna mensagem amigável sem vazar detalhes.
 */
export async function createCheckout(packageId: string): Promise<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse({ packageId });
  if (!parsed.success) {
    return { success: false, error: "ID de pacote inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const pkg = await findActivePackage(supabase, parsed.data.packageId);
  if (!pkg) {
    return { success: false, error: "Pacote não encontrado ou inativo." };
  }

  const purchaseRes = await insertPendingPurchase(supabase, user.id, pkg);
  if (!purchaseRes.ok) {
    return { success: false, error: purchaseRes.error };
  }

  const pixResult = await createTransparentPix({
    amount: Math.round(pkg.preco_brl * 100),
    description: `FormulaDota — ${pkg.nome}`,
    externalId: purchaseRes.purchaseId,
    expiresIn: 3600,
  });

  if (!pixResult.success) {
    await supabase.from("purchases").delete().eq("id", purchaseRes.purchaseId);
    return { success: false, error: "Erro ao gerar PIX. Tente novamente em instantes." };
  }

  const { error: updateError } = await supabase
    .from("purchases")
    .update({ external_payment_id: pixResult.data.id })
    .eq("id", purchaseRes.purchaseId);

  if (updateError) {
    console.error("[createCheckout] update external_payment_id falhou:", updateError.message);
  }

  return {
    success: true,
    purchaseId: purchaseRes.purchaseId,
    brCode: pixResult.data.brCode,
    brCodeBase64: pixResult.data.brCodeBase64,
    expiresAt: pixResult.data.expiresAt,
  };
}

async function findActivePackage(
  supabase: SupabaseSrv,
  packageId: string
): Promise<ActivePackage | null> {
  const { data, error } = await supabase
    .from("packages")
    .select("id, nome, preco_brl, qtd_partidas, qtd_sessoes")
    .eq("id", packageId)
    .eq("ativo", true)
    .single();

  if (error || !data) return null;
  return data;
}

type PurchaseInsertResult =
  | { ok: true; purchaseId: string }
  | { ok: false; error: string };

async function insertPendingPurchase(
  supabase: SupabaseSrv,
  userId: string,
  pkg: ActivePackage
): Promise<PurchaseInsertResult> {
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      user_id: userId,
      package_id: pkg.id,
      preco_pago: pkg.preco_brl,
      partidas_compradas: pkg.qtd_partidas,
      sessoes_compradas: pkg.qtd_sessoes,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") {
      return {
        ok: false,
        error: "Você precisa aceitar o código de conduta ou seu acesso está suspenso. Verifique seu perfil.",
      };
    }
    console.error("[insertPendingPurchase] falhou:", error?.message);
    return { ok: false, error: "Erro ao criar compra. Tente novamente." };
  }

  return { ok: true, purchaseId: data.id };
}
```

Confirmar:
- pnpm typecheck e pnpm lint passam
- Zero any
- Cada função < 50 linhas (createCheckout ~40, helpers <30)
- Arquivo total < 300 linhas
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f "src/app/checkout/[packageId]/actions.ts" && grep -q '"use server"' "src/app/checkout/[packageId]/actions.ts" && grep -q "export async function createCheckout" "src/app/checkout/[packageId]/actions.ts" && grep -q "export type CheckoutResult" "src/app/checkout/[packageId]/actions.ts" && grep -q "createTransparentPix" "src/app/checkout/[packageId]/actions.ts" && grep -q "z.string().uuid" "src/app/checkout/[packageId]/actions.ts" && grep -q "42501" "src/app/checkout/[packageId]/actions.ts" && grep -q "external_payment_id" "src/app/checkout/[packageId]/actions.ts" && grep -q "Math.round" "src/app/checkout/[packageId]/actions.ts" && ! grep -q ": any" "src/app/checkout/[packageId]/actions.ts" && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File src/app/checkout/[packageId]/actions.ts exists
    - File starts with `"use server"` directive
    - File contains exact string `export async function createCheckout`
    - File contains exact string `export type CheckoutResult`
    - File uses `z.string().uuid()` for input validation (per C3)
    - File handles RLS error code `42501` with friendly message (não vaza detalhe técnico)
    - File converts `preco_brl * 100` to centavos via `Math.round` (AbacatePay espera int em centavos)
    - File calls `createTransparentPix` from `@/lib/abacatepay`
    - File persists `external_payment_id` na purchase APÓS receber resposta da AbacatePay
    - File deletes purchase órfã se AbacatePay falhar (cleanup)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT contain `.then(` (async/await only per CLAUDE.md)
    - File line count < 300 (per CLAUDE.md)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Server Action createCheckout cria purchase pendente, gera PIX via AbacatePay, persiste external_payment_id, retorna QR Code data tipado.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar QRCodeDisplay e CheckoutClient (Client Components)</name>
  <files>src/components/checkout/qr-code-display.tsx, src/components/checkout/checkout-client.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/app/checkout/[packageId]/actions.ts (criado em Task 1 desta plan — exports createCheckout, CheckoutResult)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/button.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/card.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/skeleton.tsx (criado em 02-01)
    - C:/Users/ADM/projects/formuladota-v2/src/components/ui/sonner.tsx (criado em 02-01)
  </read_first>
  <action>
1. Criar src/components/checkout/qr-code-display.tsx — Client Component, exibe QR Code PNG inline + botão copiar:

```tsx
"use client";

// Exibe QR Code PIX inline (PNG base64) + botão para copiar o código texto.

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export function QRCodeDisplay({ brCode, brCodeBase64, expiresAt }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const expiresFormatted = formatExpiresAt(expiresAt);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast.success("Código PIX copiado!", { description: "Cole no app do seu banco." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Não consegui copiar. Selecione manualmente.");
      console.error("[QRCodeDisplay] clipboard falhou:", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg" aria-label="QR Code PIX">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brCodeBase64} alt="QR Code PIX para pagamento" width={240} height={240} className="block" />
      </div>
      <p className="text-sm text-[var(--color-muted-foreground)] text-center">
        Escaneie o QR Code com o app do seu banco<br />
        ou copie o código abaixo:
      </p>
      <div className="w-full max-w-md">
        <code
          className="block px-3 py-2 bg-[var(--color-muted)] border border-[var(--color-border)] rounded text-xs font-mono break-all text-[var(--color-foreground)]"
          aria-label="Código PIX copia-e-cola"
        >
          {brCode}
        </code>
      </div>
      <Button
        onClick={handleCopy}
        variant="outline"
        className="border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10"
        aria-label="Copiar código PIX"
      >
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copiado!" : "Copiar código PIX"}
      </Button>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Expira em {expiresFormatted}
      </p>
    </div>
  );
}

function formatExpiresAt(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(d);
  } catch {
    return "1 hora";
  }
}
```

2. Criar src/components/checkout/checkout-client.tsx — Client Component, dispara Server Action no mount:

```tsx
"use client";

// Orquestra o fluxo de checkout no client:
// - Ao montar, dispara createCheckout
// - Mostra Skeleton enquanto aguarda
// - Mostra erro com retry ou QRCodeDisplay com sucesso

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createCheckout, type CheckoutResult } from "@/app/checkout/[packageId]/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeDisplay } from "@/components/checkout/qr-code-display";

interface CheckoutClientProps {
  packageId: string;
  packageName: string;
  precoFormatado: string;
}

export function CheckoutClient({ packageId, packageName, precoFormatado }: CheckoutClientProps) {
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const r = await createCheckout(packageId);
      setResult(r);
    });
  }, [packageId]);

  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)] max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-[var(--color-foreground)]">{packageName}</CardTitle>
        <p className="text-3xl text-[#00F0FF] font-display">{precoFormatado}</p>
      </CardHeader>
      <CardContent>
        {(isPending || !result) && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Skeleton className="h-60 w-60" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
        )}

        {result?.success === false && (
          <div className="flex flex-col items-center gap-4 py-8" role="alert">
            <AlertCircle className="h-12 w-12 text-[#ef4444]" aria-hidden="true" />
            <p className="text-[var(--color-foreground)] text-center max-w-md">{result.error}</p>
            <Button asChild variant="outline">
              <Link href="/pacotes">Voltar aos pacotes</Link>
            </Button>
          </div>
        )}

        {result?.success === true && (
          <QRCodeDisplay
            brCode={result.brCode}
            brCodeBase64={result.brCodeBase64}
            expiresAt={result.expiresAt}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

3. Confirmar pnpm typecheck e pnpm lint.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/components/checkout/qr-code-display.tsx && test -f src/components/checkout/checkout-client.tsx && grep -q '"use client"' src/components/checkout/qr-code-display.tsx && grep -q '"use client"' src/components/checkout/checkout-client.tsx && grep -q "export function QRCodeDisplay" src/components/checkout/qr-code-display.tsx && grep -q "export function CheckoutClient" src/components/checkout/checkout-client.tsx && grep -q "navigator.clipboard.writeText" src/components/checkout/qr-code-display.tsx && grep -q 'from "sonner"' src/components/checkout/qr-code-display.tsx && grep -q "createCheckout" src/components/checkout/checkout-client.tsx && grep -q "useTransition" src/components/checkout/checkout-client.tsx && ! grep -q ": any" src/components/checkout/qr-code-display.tsx && ! grep -q ": any" src/components/checkout/checkout-client.tsx && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File src/components/checkout/qr-code-display.tsx exists with `"use client"` directive
    - File src/components/checkout/checkout-client.tsx exists with `"use client"` directive
    - QRCodeDisplay renders `img` with `src={brCodeBase64}` and `alt` (acessibilidade WCAG per C5)
    - QRCodeDisplay uses `navigator.clipboard.writeText(brCode)` for copy
    - QRCodeDisplay imports `toast` from `sonner` and shows `toast.success` on copy
    - QRCodeDisplay shows `brCode` in `code` tag for manual copy fallback
    - CheckoutClient calls `createCheckout(packageId)` from server action
    - CheckoutClient uses `useTransition` for pending state
    - CheckoutClient shows Skeleton during pending
    - CheckoutClient shows error UI with `AlertCircle` icon when result.success === false
    - CheckoutClient renders `QRCodeDisplay` when result.success === true
    - Files do NOT contain `: any` (zero any per C1)
    - Files use Lucide icons (Copy, Check, AlertCircle), NOT emojis (per C6)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Cliente do checkout funcional: dispara Server Action no mount, mostra Skeleton/erro/QR com toast feedback ao copiar.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Criar /checkout/[packageId]/page.tsx (Server Component)</name>
  <files>src/app/checkout/[packageId]/page.tsx</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/components/checkout/checkout-client.tsx (criado em Task 2 desta plan)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/server.ts (createClient pattern)
    - C:/Users/ADM/projects/formuladota-v2/src/app/pacotes/page.tsx (criado em 02-05 — referência de Server Component pattern com params Promise)
  </read_first>
  <action>
Criar src/app/checkout/[packageId]/page.tsx. Server Component que valida pacote ativo (404 se não) e renderiza CheckoutClient. IMPORTANTE: Next.js 16 mudou — `params` agora é `Promise<>` e precisa ser `await`-ado.

Conteúdo:

```tsx
// /checkout/[packageId] — page Server Component.
// Valida que pacote existe e está ativo (404 amigável se não).
// Server Action createCheckout (Client Component) faz o resto: cria purchase + chama AbacatePay.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutClient } from "@/components/checkout/checkout-client";

interface PageProps {
  params: Promise<{ packageId: string }>;
}

export const metadata: Metadata = {
  title: "Checkout — Fórmula Dota",
};

export default async function CheckoutPage({ params }: PageProps) {
  const { packageId } = await params;

  const supabase = await createClient();
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, nome, preco_brl, ativo")
    .eq("id", packageId)
    .eq("ativo", true)
    .single();

  if (!pkg) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-display text-[var(--color-foreground)]">
            Pagamento <span className="text-[#00F0FF]">PIX</span>
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Escaneie o QR Code abaixo ou copie o código no seu banco.
          </p>
        </header>

        <CheckoutClient
          packageId={pkg.id}
          packageName={pkg.nome}
          precoFormatado={formatBRL(pkg.preco_brl)}
        />
      </div>
    </main>
  );
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
```

Verificar pnpm typecheck, pnpm lint, pnpm build.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f "src/app/checkout/[packageId]/page.tsx" && grep -q "export default async function CheckoutPage" "src/app/checkout/[packageId]/page.tsx" && grep -q "params: Promise" "src/app/checkout/[packageId]/page.tsx" && grep -q "notFound" "src/app/checkout/[packageId]/page.tsx" && grep -q "CheckoutClient" "src/app/checkout/[packageId]/page.tsx" && grep -q "ativo.*true" "src/app/checkout/[packageId]/page.tsx" && ! grep -q ": any" "src/app/checkout/[packageId]/page.tsx" && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - File src/app/checkout/[packageId]/page.tsx exists
    - File contains `export default async function CheckoutPage`
    - `params` is typed as `Promise<{ packageId: string }>` (Next.js 16 async params)
    - File calls `notFound()` if pkg is null/inactive (404 amigável)
    - File renders `<CheckoutClient>` passing packageId, packageName, precoFormatado
    - File queries `packages` with `.eq("ativo", true)`
    - File does NOT marked `"use client"` (Server Component)
    - File does NOT contain `: any` (zero any per C1)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
    - `pnpm build` exits 0 (página compila com Next.js 16 async params)
  </acceptance_criteria>
  <done>Página /checkout/[packageId] valida pacote no server, dispara Client Component que chama Server Action e exibe QR Code. Fluxo F3.1+F3.2+F3.3 completo modulo webhook (Plan 02-07).</done>
</task>

</tasks>

<verification>
- pnpm typecheck, pnpm lint, pnpm build exit 0
- Visual (manual): rodar `pnpm dev` + abrir http://localhost:3000/pacotes + clicar "Comprar" no pacote Avulsa → /checkout/[uuid] mostra Skeleton, depois QR Code, depois clipboard funciona
- Erro path (manual): user sem aceite doutrina (impossivel via UI normal — middleware redirect — mas testavel forjando cookie) → mensagem amigável "Você precisa aceitar o código de conduta..."
- packageId inválido (uuid não encontrado) → 404 amigável
- WCAG: aria-labels nos botões e elementos interativos
</verification>

<success_criteria>
- F3.1 (click → checkout) funcional via Link href em PackageCard (Plan 02-05)
- F3.2 (purchase pendente) funcional — INSERT condicionado a RLS (aceite + status)
- F3.3 (PIX QR Code inline) funcional — brCodeBase64 PNG + brCode texto + clipboard
- Erro paths: package inativo, RLS bloqueia, AbacatePay down — todos tratados
- Build de produção passa
- Webhook handler (Plan 02-07) é o que vai fechar o ciclo (status pendente → pago)
</success_criteria>

<output>
Após completar as 3 tasks, criar .planning/phases/02-catalog-checkout/02-06-checkout-page-SUMMARY.md com:
- Server Action createCheckout: assinatura + helpers internos (findActivePackage, insertPendingPurchase)
- CheckoutClient: estados loading/error/success
- QRCodeDisplay: clipboard API + fallback texto
- Page: notFound() para package inativo + Next.js 16 async params
- Como Pedro testou visualmente (URL local + sandbox AbacatePay)
</output>
