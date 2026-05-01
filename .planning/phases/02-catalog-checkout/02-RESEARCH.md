# Phase 2: Catalog & Checkout — Research

**Researched:** 2026-04-30
**Domain:** AbacatePay PIX V2, Resend email, shadcn/ui, Next.js 16 Server Actions, webhook idempotency
**Confidence:** MEDIUM-HIGH (AbacatePay docs verificados via WebFetch oficial; shadcn+Tailwind v4 verificado; padrões Next.js verificados)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Provedor de pagamento**: AbacatePay V2 (sandbox, API key `ABACATEPAY_API_KEY`, prefixo `abc_dev_`)
- **Eventos webhook V2** (nomes exatos, mudaram da V1):
  - `transparent.completed` → atualiza purchase para `pago`, libera saldo
  - `transparent.disputed` → registrar, não mudar status ainda (equivale ao antigo `checkout.lost`)
  - `transparent.refunded` → marca purchase com flag de refund
  - NOTA: `checkout.completed` e `checkout.lost` são eventos do produto **Checkout** (página hospedada). Para PIX transparente (QR Code inline), os eventos corretos são `transparent.*`
- **Validação HMAC**: Header `X-Webhook-Signature`, algoritmo HMAC-SHA256, formato base64, segredo `ABACATEPAY_WEBHOOK_SECRET`; comparar com `crypto.timingSafeEqual`
- **Idempotência**: `purchases.external_payment_id` é UNIQUE (já no schema migration 001). Webhook duplicado faz UPDATE condicional (`WHERE status = 'pendente'`) nunca INSERT
- **Status flow**: `pendente` → (`pago` | `expirado` | `cancelado`). Apenas `pendente → pago` libera saldo
- **Tunnel dev**: smee.io com `pnpm dlx smee-client` (não exige conta; ngrok como fallback)
- **RLS**: confiar no schema, não duplicar checagem na app. Server Action faz insert direto, RLS rejeita se inválido
- **Email**: Resend, remetente `onboarding@resend.dev` enquanto domínio não verificado. Disparar do webhook handler pós `transparent.completed`, nunca do checkout em si
- **Server Action** `createCheckout(packageId)`: cria purchase pendente + chama AbacatePay + retorna QR Code data
- **API Route** `POST /api/webhooks/abacatepay`: usa `service_role` key (bypass RLS, trigger sistêmico)
- **Logging**: webhook logs estruturados (decidir entre tabela `webhook_logs` ou `console.log` Vercel — pesquisa sugere tabela simples para fase MVP)
- **Deep link `/checkout/[packageId]`**: erro amigável se package inativo/inexistente/RLS bloqueia

### Claude's Discretion

- Layout exato do `/pacotes` (grid vs lista vs cards horizontais)
- Modal de checkout vs page dedicada `/checkout/[packageId]`
- Polling de status pós-checkout vs só aguardar webhook (pesquisa recomenda página de espera simples sem polling ativo)
- Quantos componentes shadcn instalar além dos mínimos

### Deferred Ideas (OUT OF SCOPE)

- Renovação automática de assinatura mensal
- Cupons / códigos de desconto
- Múltiplos provedores de pagamento
- Página `/recibos` com histórico fiscal
- Webhook signature secret rotation
- Email com template HTML rico (React Email lib)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F2.1 | Pacotes têm: nome, descricao, tipo (avulso/mensal), qtd_partidas, qtd_sessoes, preco_brl, ativo | Schema `packages` já existe em migration 001 com todos esses campos; query `SELECT * FROM packages WHERE ativo = true ORDER BY display_order` |
| F2.2 | Catálogo público lista pacotes ativos | Server Component faz fetch no Supabase com anon key; RLS policy "everyone sees active packages" já existe |
| F3.1 | Click em pacote abre checkout | Rota `/checkout/[packageId]` — page dedicada recomendada (modal tem problemas com deep link e back button) |
| F3.2 | Checkout cria registro `purchases` com status `pendente` | Server Action `createCheckout` — INSERT na tabela purchases, RLS valida aceite+status automaticamente |
| F3.3 | Integração AbacatePay V2 gera QR Code PIX | Endpoint `POST https://api.abacatepay.com/v2/transparents/create` — retorna `brCode` (texto) e `brCodeBase64` (PNG inline) |
| F3.4 | Webhook valida pagamento HMAC → `pago` → libera saldo (idempotência via `external_payment_id`) | API Route `/api/webhooks/abacatepay` com service_role; UPDATE condicional `WHERE status = 'pendente' AND external_payment_id = $id`; HMAC-SHA256 base64 no header `X-Webhook-Signature` |
| F3.5 | Email confirmação via Resend | Resend SDK v6, `resend.emails.send()` disparado dentro do webhook handler pós confirmação |
| C1 | TypeScript strict, zero `any` | Todos os tipos derivados de `Database` em `src/types/database.ts` |
| C3 | Zod em todos os inputs | Schema Zod para body do webhook, schema Zod para packageId na Server Action |
| C8 | Webhooks externos validam HMAC | `crypto.createHmac('sha256', secret).update(rawBody).digest('base64')` + `timingSafeEqual` |
| C9 | Idempotência em handlers de eventos externos | UNIQUE constraint em `purchases.external_payment_id` + UPDATE condicional na transição de status |
</phase_requirements>

---

## Summary

Phase 2 implementa o caminho de monetização completo: catálogo de pacotes → checkout PIX inline (QR Code) → webhook de confirmação → liberação de saldo. A pesquisa confirma que a abordagem arquitetural do CONTEXT.md está correta e bem fundamentada.

**Descoberta crítica:** AbacatePay V2 tem dois produtos distintos. O produto "Checkout" (página hospedada pela AbacatePay, eventos `checkout.*`) e o produto "Transparent" (PIX embutido no site, eventos `transparent.*`). Para gerar QR Code inline no site formuladota, usar **Transparent PIX** (`POST /v2/transparents/create`), não o Checkout padrão. Os eventos webhook corretos são `transparent.completed`, `transparent.disputed`, `transparent.refunded` — não `checkout.completed`/`checkout.lost` como estava preliminarmente no CONTEXT.md.

**Recomendação primária:** Page dedicada `/checkout/[packageId]` (não modal) — permite deep link, back button, compartilhamento de URL, e estado de polling simples sem complexidade de state management no modal.

A Validation Architecture (nyquist) está habilitada (sem `config.json`, logo padrão = enabled), mas o projeto não tem framework de testes instalado. Para MVP, a validação será via testes manuais e logging estruturado — documento as gaps de Wave 0.

---

## Project Constraints (from CLAUDE.md)

Diretivas obrigatórias que o planner DEVE verificar em cada tarefa:

| Constraint | Regra |
|------------|-------|
| TypeScript | Strict mode, zero `any` — usar `Database` types de `src/types/database.ts` |
| Funções | Max 50 linhas — quebrar handlers longos em funções auxiliares |
| Arquivos | Max 300 linhas — webhook handler complexo deve ser dividido |
| Async | `async/await` sempre, NUNCA `.then().catch()` chains |
| Zod | Em todos os inputs de API routes e Server Actions |
| RLS | Confiar no schema — NÃO duplicar checagem na app |
| UI | Lucide icons (`lucide-react`), NUNCA emojis em UI |
| UI | Tema cyberpunk: `bg-[#050505]`, cyan `#00F0FF`, purple `#A855F7`, cards `bg-[#0A0A1A]` |
| UI | WCAG 2.1 AA — contraste, labels acessíveis |
| shadcn/ui | Base components — NÃO construir custom button/card do zero |
| Logging | `console.error` apenas em server; NUNCA `console.log` em produção |
| Pagamentos | Validar webhook HMAC; idempotência obrigatória |
| Git | NUNCA commitar `.env`, secrets, service role key |

---

## Standard Stack

### Core

| Library | Versão | Propósito | Por que é padrão |
|---------|--------|-----------|------------------|
| `resend` | 6.12.2 (latest) | Email transacional | SDK oficial Resend, free tier 100/dia, retorna `{data, error}` sem throw |
| `@supabase/ssr` | ^0.5.2 (já instalado) | Supabase SSR client | Já em uso — `createServerClient` + `createBrowserClient` |
| `zod` | ^3.23.8 (já instalado) | Validação inputs | Já em uso no projeto |
| `lucide-react` | ^0.456.0 (já instalado) | Ícones | Já em uso |
| `next` | 16.2.4 (já instalado) | Framework | App Router, Server Actions, Route Handlers |

### Supporting

| Library | Versão | Propósito | Quando usar |
|---------|--------|-----------|-------------|
| `shadcn/ui` components | latest (@canary para Tailwind v4) | Button, Card, Badge, Skeleton, Sonner, Dialog | Phase 2 adiciona componentes via `pnpm dlx shadcn@canary add [component]` |
| `node:crypto` | built-in Node.js | HMAC-SHA256 para webhook | Import nativo — sem instalação |
| `smee-client` | latest | Tunnel webhook local dev | `pnpm dlx smee-client` — sem instalar globalmente |

### Alternativas Consideradas

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| Transparent PIX (inline) | AbacatePay Checkout (página hospedada) | Checkout hospedado é mais simples mas redireciona pra página AbacatePay — pior UX para o tema cyberpunk inline |
| smee.io | ngrok | ngrok agora exige conta gratuita com limite; smee.io é completamente sem conta |
| Resend inline HTML | React Email templates | React Email é mais poderoso mas adiciona complexidade — deferred para futuro |
| Page `/checkout/[packageId]` | Modal de checkout | Modal tem problemas com deep link, back button, e compartilhamento de URL |

### Instalação

```bash
# Resend SDK
pnpm add resend

# shadcn/ui (usar canary para Tailwind v4 compatibility)
pnpm dlx shadcn@canary add button card badge skeleton sonner dialog

# smee-client (só para dev, não instalar como dep)
# Usar via: pnpm dlx smee-client --url https://smee.io/SEU-ID --target http://localhost:3000/api/webhooks/abacatepay
```

### Verificação de versões (confirmado em 2026-04-30)

```bash
npm view resend version   # → 6.12.2
```

---

## Architecture Patterns

### Estrutura de Arquivos Recomendada

```
src/
├── app/
│   ├── pacotes/
│   │   └── page.tsx                        # Catálogo (Server Component)
│   ├── checkout/
│   │   └── [packageId]/
│   │       └── page.tsx                    # Checkout + QR Code (Client Component)
│   ├── partidas/
│   │   └── page.tsx                        # Saldo do usuário (Server Component)
│   └── api/
│       └── webhooks/
│           └── abacatepay/
│               └── route.ts                # Webhook handler (API Route)
├── components/
│   ├── ui/                                 # shadcn components (copiados via CLI)
│   ├── catalog/
│   │   ├── package-card.tsx                # Card de um pacote
│   │   └── package-grid.tsx               # Grid de pacotes
│   └── checkout/
│       ├── checkout-form.tsx              # Form com Server Action
│       └── qr-code-display.tsx            # Exibe brCodeBase64 + brCode
├── lib/
│   ├── abacatepay.ts                      # Cliente AbacatePay (criar/verificar)
│   ├── resend.ts                          # Helper email confirmação
│   └── supabase/
│       ├── server.ts                      # (já existe — não modificar)
│       └── service.ts                     # createServiceClient com service_role key
└── types/
    └── abacatepay.ts                      # Types do payload webhook
```

### Pattern 1: Server Action — Criar Checkout

**O que é:** Server Action que cria purchase pendente no DB e chama AbacatePay para gerar QR Code PIX.
**Quando usar:** Usuário clica "Comprar" no catálogo.

```typescript
// src/app/checkout/[packageId]/actions.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTransparentPix } from "@/lib/abacatepay";
import { requireServerEnv } from "@/lib/env";

const checkoutInput = z.object({
  packageId: z.string().uuid(),
});

export type CheckoutResult =
  | { success: true; purchaseId: string; brCode: string; brCodeBase64: string; expiresAt: string }
  | { success: false; error: string };

export async function createCheckout(packageId: string): Promise<CheckoutResult> {
  const parsed = checkoutInput.safeParse({ packageId });
  if (!parsed.success) {
    return { success: false, error: "ID de pacote inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  // Buscar pacote
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .eq("ativo", true)
    .single();

  if (pkgError || !pkg) {
    return { success: false, error: "Pacote não encontrado ou inativo." };
  }

  // Criar purchase pendente — RLS valida has_accepted_doctrine + is_user_active
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      preco_pago: pkg.preco_brl,
      partidas_compradas: pkg.qtd_partidas,
      sessoes_compradas: pkg.qtd_sessoes,
      status: "pendente",
    })
    .select("id")
    .single();

  if (purchaseError || !purchase) {
    // RLS rejeitou (sem aceite ou suspenso) — mensagem amigável
    if (purchaseError?.code === "42501") {
      return { success: false, error: "Você precisa aceitar a doutrina ou não pode comprar agora." };
    }
    return { success: false, error: "Erro ao criar compra. Tente novamente." };
  }

  // Chamar AbacatePay
  const pixResult = await createTransparentPix({
    amount: Math.round(pkg.preco_brl * 100), // centavos
    description: `FormulaDota — ${pkg.nome}`,
    externalId: purchase.id,
    expiresIn: 3600, // 1 hora
  });

  if (!pixResult.success) {
    // Limpar purchase órfã
    await supabase.from("purchases").delete().eq("id", purchase.id);
    return { success: false, error: "Erro ao gerar PIX. Tente novamente." };
  }

  // Salvar external_payment_id para idempotência
  await supabase
    .from("purchases")
    .update({ external_payment_id: pixResult.data.id })
    .eq("id", purchase.id);

  return {
    success: true,
    purchaseId: purchase.id,
    brCode: pixResult.data.brCode,
    brCodeBase64: pixResult.data.brCodeBase64,
    expiresAt: pixResult.data.expiresAt,
  };
}
```

### Pattern 2: API Route — Webhook Handler

**O que é:** API Route que recebe eventos `transparent.*` da AbacatePay, valida HMAC, atualiza purchase com idempotência, envia email.
**Quando usar:** AbacatePay POST para `/api/webhooks/abacatepay`.

```typescript
// src/app/api/webhooks/abacatepay/route.ts
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendConfirmationEmail } from "@/lib/resend";
import { requireServerEnv } from "@/lib/env";
import { z } from "zod";

// Schema Zod para o payload do webhook (transparent.completed)
const webhookPayloadSchema = z.object({
  event: z.enum(["transparent.completed", "transparent.disputed", "transparent.refunded"]),
  apiVersion: z.number(),
  devMode: z.boolean(),
  data: z.object({
    transparent: z.object({
      id: z.string(),           // external_payment_id no nosso DB
      externalId: z.string().optional(), // purchase.id que passamos
      amount: z.number(),
      status: z.string(),
    }),
    customer: z.object({
      email: z.string().email().optional(),
      name: z.string().optional(),
    }).optional(),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Ler raw body ANTES de qualquer parse (crítico para HMAC)
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";

  // 2. Validar HMAC
  const secret = requireServerEnv("ABACATEPAY_WEBHOOK_SECRET");
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const sigA = Buffer.from(expectedSig);
  const sigB = Buffer.from(signature);

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // 3. Parse e validação do payload
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const parsed = webhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inesperado" }, { status: 400 });
  }

  const { event, data } = parsed.data;
  const externalPaymentId = data.transparent.id;

  // 4. Idempotência via UPDATE condicional (não INSERT)
  const supabase = createServiceClient(); // service_role — bypass RLS

  if (event === "transparent.completed") {
    const { data: updated, error } = await supabase
      .from("purchases")
      .update({ status: "pago" })
      .eq("external_payment_id", externalPaymentId)
      .eq("status", "pendente")  // condicional — idempotência
      .select("id, user_id, partidas_compradas, sessoes_compradas")
      .single();

    if (error || !updated) {
      // Já processado (idempotência) ou não encontrado — retornar 200 pra AbacatePay não retentar
      return NextResponse.json({ received: true });
    }

    // 5. Enviar email de confirmação (não-crítico — falha não rejeita webhook)
    await sendConfirmationEmail({
      purchaseId: updated.id,
      userId: updated.user_id,
      customerEmail: data.customer?.email,
      customerName: data.customer?.name,
    }).catch((err) => {
      console.error("[webhook] email falhou:", err);
    });
  }

  if (event === "transparent.refunded") {
    await supabase
      .from("purchases")
      .update({ status: "cancelado" })
      .eq("external_payment_id", externalPaymentId);
  }

  return NextResponse.json({ received: true });
}
```

### Pattern 3: AbacatePay Client

**O que é:** Módulo isolado que encapsula chamadas HTTP para AbacatePay V2.

```typescript
// src/lib/abacatepay.ts
import { requireServerEnv } from "@/lib/env";

const BASE_URL = "https://api.abacatepay.com/v2";

// Nota: environment é determinado pela API key, não pela URL
function getHeaders(): HeadersInit {
  const apiKey = requireServerEnv("ABACATEPAY_API_KEY");
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

interface CreatePixInput {
  amount: number;       // em centavos
  description: string;
  externalId: string;   // purchase.id do nosso DB
  expiresIn?: number;   // segundos, default 3600
}

interface PixResponse {
  success: boolean;
  data: {
    id: string;
    brCode: string;          // código copia-e-cola
    brCodeBase64: string;    // "data:image/png;base64,..."
    status: string;
    expiresAt: string;
    amount: number;
  };
}

export async function createTransparentPix(input: CreatePixInput): Promise<PixResponse> {
  const response = await fetch(`${BASE_URL}/transparents/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      method: "PIX",
      data: {
        amount: input.amount,
        description: input.description,
        expiresIn: input.expiresIn ?? 3600,
        metadata: { externalId: input.externalId },
      },
    }),
  });

  const json = await response.json() as { success: boolean; data?: PixResponse["data"]; error?: string };

  if (!json.success || !json.data) {
    return { success: false, data: {} as PixResponse["data"] };
  }

  return { success: true, data: json.data };
}
```

### Pattern 4: Service Role Client

**O que é:** Cliente Supabase com `service_role` key para uso exclusivo em API Routes (bypass RLS).

```typescript
// src/lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// NÃO exportar nem usar em Server Components/Actions do usuário
// Exclusivo para: webhook handlers, jobs sistêmicos
export function createServiceClient() {
  const serviceKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### Anti-Patterns a Evitar

- **Usar service_role em Server Actions de usuário:** Bypassa RLS — usar `createClient()` com cookie session para mutations do usuário, `createServiceClient()` só em webhooks/jobs
- **Parse JSON antes de validar HMAC:** Se parsear antes de ler o raw body, a assinatura muda. Sempre `request.text()` primeiro, depois valide HMAC, depois `JSON.parse(rawBody)`
- **Retornar 4xx/5xx para webhook duplicado:** AbacatePay vai retentar. Webhook duplicado já processado deve retornar `200 { received: true }`
- **Enviar email dentro de try/catch que rejeita webhook:** Email é side-effect não-crítico — falha de email não deve rejeitar o webhook. Usar `.catch()` isolado
- **Checar behavior_status no código da app:** RLS já faz isso. Duplicar cria divergência de estado

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|--------------|------|---------|
| Validação HMAC com timing-safe | Comparação manual de strings | `crypto.timingSafeEqual` (built-in Node) | Timing attacks — comparação ingênua vaza informação por timing |
| QR Code PNG | Biblioteca de geração de QR | `brCodeBase64` da AbacatePay | AbacatePay já retorna PNG em base64 — usar `<img src={brCodeBase64}>` direto |
| Envio de email | Nodemailer ou SMTP | `resend` SDK | Complexidade de SMTP, deliverability, configuração DNS — Resend abstrai tudo |
| Input validation | Custom parsers | Zod (já instalado) | Parse + type narrowing em uma chamada; já padrão do projeto |
| DB client com RLS bypass | Query raw SQL | `createServiceClient()` com service_role | Supabase já tem esse padrão; reinventar cria surface de bug |
| Deduplicação de webhooks | Set em memória | UNIQUE constraint no DB (`external_payment_id`) | Memória não persiste entre restarts/deployments; DB é durável |

**Insight chave:** AbacatePay fornece o QR Code como `brCodeBase64` (PNG pronto) e `brCode` (texto para copiar). Não há necessidade de nenhuma biblioteca de geração de QR Code no cliente.

---

## AbacatePay V2 — Referência Completa

### Produto Correto: Transparent PIX

Para QR Code **inline** no site (sem redirecionar para página da AbacatePay):

```
POST https://api.abacatepay.com/v2/transparents/create
Authorization: Bearer {ABACATEPAY_API_KEY}
Content-Type: application/json
```

**Payload mínimo:**
```json
{
  "method": "PIX",
  "data": {
    "amount": 1000,
    "description": "FormulaDota — Avulsa"
  }
}
```

**Payload completo recomendado:**
```json
{
  "method": "PIX",
  "data": {
    "amount": 1000,
    "description": "FormulaDota — Avulsa (1 partida)",
    "expiresIn": 3600,
    "metadata": { "externalId": "purchase-uuid-aqui" }
  }
}
```

**Resposta (campos relevantes):**
```json
{
  "data": {
    "id": "pix_char_abc123",
    "amount": 1000,
    "status": "PENDING",
    "brCode": "00020160014BR.GOV.BCB.PIX...",
    "brCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
    "expiresAt": "2026-04-30T20:00:00.000Z"
  },
  "success": true
}
```

### Diferença entre Produtos AbacatePay V2

| Produto | Endpoint | Eventos | QR Code | Quando usar |
|---------|----------|---------|---------|-------------|
| **Transparent PIX** | `/v2/transparents/create` | `transparent.*` | Retorna `brCode` + `brCodeBase64` inline | QR Code embutido no site — caso do formuladota |
| Checkout (hospedado) | `/v2/checkouts/create` | `checkout.*` | Redireciona para `url` da AbacatePay | Página de pagamento externa da AbacatePay |

### Eventos Webhook Corretos (Transparent PIX)

| Evento | Quando dispara | Ação no banco |
|--------|---------------|---------------|
| `transparent.completed` | PIX recebido com sucesso | `purchases.status = 'pago'` — libera saldo |
| `transparent.disputed` | Disputa/chargeback aberto | Registrar, aguardar resolução |
| `transparent.refunded` | PIX estornado | `purchases.status = 'cancelado'` |

**Nota:** `checkout.lost` mencionado no CONTEXT.md inicial NÃO existe nos eventos transparentes. O equivalente para PIX expirado é gerenciar via polling ou `transparent.disputed`. PIX simplesmente expira sem evento se não pago — considerar cron job para expirar purchases pendentes antigas (opcional MVP).

### HMAC Signature

```
Header: X-Webhook-Signature
Algoritmo: HMAC-SHA256
Formato: base64
Chave: ABACATEPAY_WEBHOOK_SECRET (configurado no dashboard AbacatePay)
```

**Implementação correta:**
```typescript
import crypto from "node:crypto";

function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

### Sandbox vs Produção

- **URL:** Única — `https://api.abacatepay.com/v2` para ambos os ambientes
- **Ambiente:** Determinado pela API key, não pela URL
- **Sandbox key:** Prefixo `abc_dev_` (conforme CONTEXT.md)
- **Simular pagamento em dev:**
  ```
  POST https://api.abacatepay.com/v2/transparents/simulate-payment?id={pix_char_id}
  Authorization: Bearer {SANDBOX_KEY}
  Body: {}
  ```
  Isso dispara o webhook `transparent.completed` para seu endpoint registrado.

### Configurar Webhook no Dashboard

Webhooks são registrados via dashboard AbacatePay (não via API programaticamente). Campos necessários:
- Nome: "FormulaDota — Pagamentos PIX"
- Endpoint URL: `https://smee.io/SEU-CANAL` (dev) ou `https://formuladota.com/api/webhooks/abacatepay` (prod)
- Secret: gerar string aleatória → salvar em `ABACATEPAY_WEBHOOK_SECRET`
- Eventos: `transparent.completed`, `transparent.disputed`, `transparent.refunded`

---

## Resend — Email de Confirmação

### Setup

```typescript
// src/lib/resend.ts
import { Resend } from "resend";
import { requireServerEnv } from "@/lib/env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  }
  return _resend;
}

interface SendConfirmationInput {
  purchaseId: string;
  userId: string;
  customerEmail?: string;
  customerName?: string;
}

export async function sendConfirmationEmail(input: SendConfirmationInput): Promise<void> {
  if (!input.customerEmail) return;

  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to: [input.customerEmail],
    subject: "Pagamento confirmado — FormulaDota",
    html: buildConfirmationHtml(input.customerName),
    idempotencyKey: `purchase-confirmed-${input.purchaseId}`,
  });

  if (error) {
    console.error("[resend] email falhou:", error.message);
    // Não throw — falha de email não deve quebrar o webhook
  }
}

function buildConfirmationHtml(name?: string): string {
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  return `
    <div style="background:#050505;color:#f4f4f5;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto">
      <h1 style="color:#00F0FF;font-size:24px;margin-bottom:16px">Pagamento Confirmado</h1>
      <p>${greeting} Seu pagamento foi confirmado.</p>
      <p>Seu saldo de partidas foi atualizado. Quando o agendamento estiver disponível,
         acesse <a href="https://formuladota.com/partidas" style="color:#00F0FF">suas partidas</a>.</p>
      <p style="color:#71717a;font-size:12px;margin-top:32px">
        FormulaDota — Fórmula do Dota de Corrida com Pedro Paulo
      </p>
    </div>
  `;
}
```

### Observações importantes

- `idempotencyKey` previne envios duplicados se o webhook handler rodar duas vezes
- `onboarding@resend.dev` funciona sem verificação de domínio — limite 100/dia free tier
- Resend retorna `{ data, error }` — nunca faz throw, sempre checar `error`
- Email de confirmação é **não-crítico**: falha não deve rejeitar o webhook com erro 5xx

---

## shadcn/ui + Tailwind v4

### Status de Compatibilidade (verificado 2026-04-30)

shadcn/ui tem suporte oficial a Tailwind v4 e React 19. Usar `@canary` da CLI para Tailwind v4:

```bash
pnpm dlx shadcn@canary add button card badge skeleton sonner dialog
```

**Diferenças do setup v3 → v4:**
- Cores migradas de HSL para OKLCH (mas o projeto usa CSS custom properties direto — sem conflito)
- `tailwindcss-animate` depreciado → `tw-animate-css` (Sonner/Dialog precisam de animação — verificar se componente precisa)
- `@theme` directive (já em uso em `globals.css` do projeto) — compatível com shadcn/ui v4
- `forwardRef` removido dos componentes — React 19 nativo

### Integração com Tema Cyberpunk Existente

O projeto já tem CSS custom properties em `globals.css` via `@theme`:
```css
--color-cyan: #00f0ff;
--color-purple: #a855f7;
--color-card: #0a0a1a;
--color-border: #27272a;
```

shadcn/ui usa `--background`, `--foreground`, `--border`, `--card` — mapear no `globals.css` ou customizar os componentes após instalação. Estratégia: copiar o componente via CLI e ajustar as classes Tailwind para usar as custom properties do projeto (ex: `bg-[#0a0a1a]` em vez de `bg-card`).

### Componentes necessários para Phase 2

| Componente | Uso | Notas |
|------------|-----|-------|
| `Button` | CTA "Comprar", "Copiar código PIX" | Variant `outline` com border cyan |
| `Card` | Cards de pacote no catálogo | Background `#0a0a1a` |
| `Badge` | Tipo do pacote (avulso/mensal), status | Cor baseada no tipo |
| `Skeleton` | Loading states em catálogo e checkout | Durante fetch packages |
| `Sonner` (toast) | Feedback de ação (copiou código, erro) | useToast pattern |
| `Dialog` | (opcional) confirmação antes de comprar | Só se UX pedir modal simples |

---

## Tunnel Local para Webhook em Desenvolvimento

### smee.io (Recomendado)

Sem conta necessária. Bridge HTTP → localhost via Server-Sent Events.

```bash
# 1. Criar canal em https://smee.io (gera URL única, ex: https://smee.io/xYz123)
# 2. Adicionar essa URL como endpoint no dashboard AbacatePay (dev)
# 3. Rodar o client:
pnpm dlx smee-client --url https://smee.io/xYz123 --target http://localhost:3000/api/webhooks/abacatepay

# Em outro terminal:
pnpm dev
```

**Importante:** Documentar o canal smee.io em `.env.example` como comentário (não é variável de ambiente, só referência de dev).

### ngrok (Fallback)

Agora exige conta gratuita. URL aleatória muda a cada reinício (paga para fixar). Útil se smee.io tiver instabilidade:

```bash
ngrok http 3000
# Copia a URL HTTPS gerada → registra no dashboard AbacatePay
```

### Simulação sem Tunnel

Para testar o webhook handler sem AbacatePay real, usar `curl` diretamente:

```bash
# Gerar HMAC correto e postar manualmente
# (documentar script de teste no repositório)
curl -X POST http://localhost:3000/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: BASE64_HMAC_AQUI" \
  -d '{"event":"transparent.completed","apiVersion":2,"devMode":true,"data":{"transparent":{"id":"pix_test_123","status":"PAID","amount":1000},"customer":{"email":"test@test.com"}}}'
```

---

## Idempotência — Padrão Recomendado

### Mecanismo Principal: UPDATE Condicional

A idempotência já está garantida pelo schema (`external_payment_id` UNIQUE em `purchases`). O padrão no webhook handler:

```sql
-- Equivalente SQL do que o handler faz
UPDATE purchases
SET status = 'pago'
WHERE external_payment_id = 'pix_char_abc123'
  AND status = 'pendente'     -- <- condicional é a chave
RETURNING id, user_id;

-- Se retornar 0 rows: webhook já processado (idempotente) → retornar 200
-- Se retornar 1 row: processado agora → continuar com email
```

### Por que UPDATE condicional e não SELECT + UPDATE

`SELECT + UPDATE` tem race condition: dois webhooks simultâneos podem passar no SELECT e fazer UPDATE duplo. O UPDATE condicional é atômico no PostgreSQL — apenas um vai modificar a row.

### Eventos Out-of-Order

| Cenário | Comportamento |
|---------|--------------|
| `transparent.completed` antes de salvar `external_payment_id` | Impossível — o `external_payment_id` é salvo pelo Server Action antes de retornar ao usuário |
| `transparent.refunded` antes de `transparent.completed` | Atualiza para `cancelado` — se completado chegar depois, o UPDATE condicional (`WHERE status = 'pendente'`) não encontra nada (já `cancelado`) → sem efeito |
| Webhook duplicado do mesmo evento | UPDATE condicional não encontra `status = 'pendente'` → retorna 0 rows → `200 { received: true }` sem side effects |

---

## Common Pitfalls

### Pitfall 1: Produto Errado da AbacatePay (Checkout vs Transparent)

**O que dá errado:** Usar `/v2/checkouts/create` em vez de `/v2/transparents/create`. O Checkout hospedado redireciona o usuário para uma página da AbacatePay, quebra o UX inline, e usa eventos `checkout.*` não `transparent.*`.

**Por que acontece:** A documentação tem dois produtos similares. "Checkout" é mais proeminente.

**Como evitar:** Sempre usar `/v2/transparents/create` com `method: "PIX"`. Verificar que `brCode` e `brCodeBase64` estão na resposta.

**Sinal de alerta:** Resposta retorna `url` (link da AbacatePay) em vez de `brCode` — está no produto errado.

### Pitfall 2: Parse JSON Antes de Validar HMAC

**O que dá errado:** `const body = await request.json()` transforma o body em objeto JavaScript, depois `JSON.stringify(body)` pode reordenar chaves ou mudar whitespace — a assinatura não bate.

**Por que acontece:** É tentador usar `request.json()` por conveniência.

**Como evitar:** SEMPRE `const rawBody = await request.text()` primeiro, valida HMAC no raw string, só então `JSON.parse(rawBody)`.

**Sinal de alerta:** Webhook retorna 401 "Assinatura inválida" mesmo com o secret correto.

### Pitfall 3: Retornar 4xx/5xx para Webhook Já Processado

**O que dá errado:** AbacatePay interpreta 4xx/5xx como falha e retenta o webhook. Se o handler retornar 500 quando o evento já foi processado, causa loop de retentativas.

**Por que acontece:** Lógica defensiva incorreta ("se não encontrou o purchase, é erro").

**Como evitar:** Webhook duplicado/não-encontrado retorna sempre `200 { received: true }`. Somente erro de infraestrutura (DB down) retorna 5xx.

**Sinal de alerta:** Saldo duplicado no usuário; logs mostram múltiplas execuções do mesmo `external_payment_id`.

### Pitfall 4: shadcn/ui sem `@canary` com Tailwind v4

**O que dá errado:** `pnpm dlx shadcn@latest` instala componentes com sintaxe Tailwind v3 (`tailwindcss-animate`, classes `hover:` vs v4 variants). Componentes não renderizam ou dão erro de compilação.

**Por que acontece:** shadcn@latest pode não ser o canary com suporte v4.

**Como evitar:** Sempre usar `pnpm dlx shadcn@canary add [component]` quando Tailwind v4 está instalado.

**Sinal de alerta:** Erro de build sobre `tailwindcss-animate` ou classes CSS não reconhecidas.

### Pitfall 5: Email dentro do Fluxo Crítico do Webhook

**O que dá errado:** `await sendConfirmationEmail(...)` sem try/catch — se o Resend API tiver instabilidade, o webhook retorna 500, AbacatePay retenta, e o saldo pode ser liberado múltiplas vezes (se a idempotência não estiver perfeita).

**Por que acontece:** Parece simples colocar o await inline.

**Como evitar:** Isolar o email em `.catch()` separado e nunca propagar sua falha:
```typescript
await sendConfirmationEmail(...).catch(err => console.error("[webhook] email:", err));
```

### Pitfall 6: externalId vs id na AbacatePay

**O que dá errado:** Confundir `data.transparent.id` (ID interno AbacatePay — nosso `external_payment_id`) com `data.transparent.externalId` (nosso purchase ID que passamos como metadata). Para idempotência, usar `data.transparent.id` como `external_payment_id`.

**Como evitar:** Mapear explicitamente no schema Zod do webhook e documentar na variável.

---

## Validation Architecture

Config.json não existe — nyquist_validation tratado como habilitado (padrão).

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | Nenhum instalado — projeto usa validação manual |
| Config | Não existe (Wave 0 gap) |
| Quick run | `pnpm typecheck && pnpm lint` |
| Full suite | Manual: testar fluxo completo com smee.io + sandbox AbacatePay |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Comando | Arquivo existe? |
|--------|--------------|---------------|---------|-----------------|
| F2.1 | Pacotes têm campos corretos no DB | Verificação manual: `SELECT * FROM packages` | SQL no Supabase dashboard | N/A |
| F2.2 | Catálogo lista só pacotes `ativo = true` | Visual: abrir `/pacotes` logado | Manual browser | N/A |
| F3.1 | Click em pacote abre checkout | Visual: navegar para `/checkout/[id]` | Manual browser | N/A |
| F3.2 | Checkout cria purchase pendente no DB | DB check após ação | `SELECT * FROM purchases ORDER BY created_at DESC LIMIT 1` | N/A |
| F3.3 | QR Code PIX aparece na tela | Visual: QR Code visível e `brCodeBase64` carregado | Manual browser | N/A |
| F3.4 | Webhook `transparent.completed` libera saldo | Simular com AbacatePay sandbox simulate-payment | Manual: `POST /v2/transparents/simulate-payment?id=...` | N/A |
| F3.4 | Webhook duplicado NÃO duplica saldo | Enviar webhook 2x, verificar purchase.status permanece `pago` | Manual com curl | N/A |
| F3.5 | Email de confirmação enviado após pagamento | Verificar Resend dashboard → logs de envio | Manual Resend dashboard | N/A |
| C8 | HMAC inválido retorna 401 | curl com signature errada → deve retornar 401 | Manual curl | N/A |

### Wave 0 Gaps

- [ ] Nenhum framework de teste instalado — para MVP, validação manual é aceitável conforme PRD ("Validar manualmente fluxo end-to-end antes de deploy")
- [ ] Script utilitário de teste do webhook (curl com HMAC correto) — criar em `scripts/test-webhook.sh`
- [ ] Considerar `vitest` para fase futura — não bloqueia Phase 2

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Quando Mudou | Impacto |
|-----------------|-----------------|--------------|---------|
| Next.js Pages Router + `bodyParser: false` para raw body | App Router: `request.text()` — raw body disponível nativamente | Next.js 13+ | Não precisa configurar nada — `.text()` funciona |
| `shadcn@latest` com Tailwind v3 | `shadcn@canary` com Tailwind v4 | 2025 | Usar `@canary` para projetos com Tailwind v4 |
| `tailwindcss-animate` | `tw-animate-css` | 2025 | shadcn/ui depreciou a lib anterior para v4 |
| AbacatePay V1 (`payment.paid`, `payment.expired`) | AbacatePay V2 (`transparent.completed`, `transparent.refunded`) | 2024-2025 | Nomes de eventos completamente diferentes |
| React forwardRef nos componentes shadcn | Sem forwardRef (React 19 nativo) | React 19 | Componentes shadcn mais simples |

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|------------|--------|---------|
| Node.js | Crypto HMAC, webhook handler | ✓ | v22.22.0 | — |
| AbacatePay sandbox | F3.3, F3.4 | ✓ | API key configurada (STATE.md) | Mock manual via curl |
| Resend | F3.5 | ✓ | API key configurada (STATE.md) | Log apenas, não enviar |
| smee.io | Tunnel webhook dev | ✓ | Via npx/pnpm dlx (sem conta) | ngrok (requer conta gratuita) |
| Supabase projeto | Todas | ✓ | `nyvbfdsxjpiwgdroptdi` sa-east-1 | — |
| pnpm | Instalação deps | ✓ | 10.28.2 | — |

**Sem dependências bloqueantes.** AbacatePay e Resend têm keys configuradas conforme STATE.md.

---

## Open Questions

1. **`checkout.lost` vs expiração de PIX**
   - O que sabemos: Transparent PIX não tem evento `transparent.lost` documentado. PIX simplesmente expira sem evento se não pago dentro do `expiresIn`.
   - O que está incerto: AbacatePay dispara algum evento para PIX expirado? A documentação não menciona.
   - Recomendação: Implementar MVP sem handler de expiração. Criar cron job simples (Vercel Cron) para marcar purchases `pendente` com `data_compra < now() - 2h` como `expirado` — Phase 2 pode deixar isso como Wave 2 task.

2. **customer.email no payload transparent.completed**
   - O que sabemos: O campo `data.customer.email` está presente se o `customer` foi passado na criação. Como não passamos `customer` no create (não temos CPF do usuário), o campo pode vir nulo.
   - O que está incerto: O email do usuário está no `profiles.email` do Supabase — buscar por `user_id` via `purchase.user_id` no handler.
   - Recomendação: No webhook handler, buscar email do `profiles` via `service_role` client usando o `user_id` encontrado na purchase atualizada.

3. **Webhook secret compartilhado vs por-evento**
   - O que sabemos: AbacatePay usa um único secret por webhook endpoint configurado.
   - O que está incerto: Se múltiplos ambientes (dev smee.io + prod) compartilham o mesmo endpoint registrado.
   - Recomendação: Registrar dois webhooks no dashboard AbacatePay: um apontando para smee.io (dev) e outro para a URL de prod. Cada um pode ter seu próprio secret.

---

## Sources

### Primary (HIGH confidence — verificado via WebFetch em docs oficiais)

- `https://docs.abacatepay.com/llms.txt` — índice completo de endpoints documentados
- `https://docs.abacatepay.com/pages/transparents/create.md` — endpoint, payload, resposta QR Code
- `https://docs.abacatepay.com/pages/webhooks/security.md` — HMAC-SHA256 base64, `X-Webhook-Signature`, `timingSafeEqual`
- `https://docs.abacatepay.com/pages/webhooks/events/transparent.md` — eventos `transparent.completed/disputed/refunded` e payload completo
- `https://docs.abacatepay.com/pages/transparents/simulate-payment.md` — sandbox simulation endpoint
- `https://docs.abacatepay.com/pages/webhooks.md` — configuração via dashboard, não API
- `https://resend.com/docs/send-with-nodejs` — SDK, `idempotencyKey`, error handling
- `https://ui.shadcn.com/docs/tailwind-v4` — compatibilidade shadcn + Tailwind v4

### Secondary (MEDIUM confidence — WebSearch verificado com fontes múltiplas)

- WebSearch "shadcn ui Tailwind v4 Next.js 15 2025" — `@canary` para Tailwind v4, `tw-animate-css`
- WebSearch "webhook idempotency PostgreSQL UNIQUE constraint" — UPDATE condicional, `ON CONFLICT DO NOTHING`
- WebSearch "Next.js webhook HMAC validation App Router raw body" — `request.text()` antes de parse

### Tertiary (LOW confidence — WebSearch apenas)

- Comportamento de expiração de PIX Transparent sem evento (não documentado explicitamente)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versões confirmadas via npm registry e docs oficiais
- AbacatePay API: HIGH — verificado via WebFetch nas docs oficiais em markdown
- HMAC implementation: HIGH — verificado em docs AbacatePay com exemplo de código
- Webhook events: HIGH — verificado em `transparent.md` com payload completo
- shadcn/Tailwind v4: MEDIUM — WebSearch + ui.shadcn.com/docs/tailwind-v4
- Idempotência: MEDIUM — padrões verificados em múltiplas fontes técnicas
- Expiração PIX sem evento: LOW — não documentado explicitamente

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (AbacatePay V2 — API estável; shadcn canary pode mudar mais rápido)
