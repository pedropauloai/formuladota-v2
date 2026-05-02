# Phase 4: Subscription Mensal AbacatePay — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** discuss-phase 4 com Pedro (decisões diretas) + research existente em `.planning/research/hub-stack-deep-dive.md`

<domain>
## Phase Boundary

**O que está dentro do escopo:**
- Migration 008 cria tabela `subscriptions` (user_id, abacatepay_subscription_id, status, started_at, next_billing_at, cancelled_at) com RLS
- Helper SQL `public.has_active_subscription()` que retorna `true` quando user logado tem subscription com `status='active' AND next_billing_at > now()` OU `status='cancelled' AND next_billing_at > now()` (período pago ainda válido pós-cancel)
- Cliente AbacatePay V2 estendido em `src/lib/abacatepay.ts` com `createSubscription(userId, productId)` que chama `POST /v2/subscriptions/create` e retorna `{ id, url, externalId }`
- Server Action `createSubscriptionCheckout()` em `src/app/assinatura/actions.ts` que cria registro `subscription` (status `pendente`) + chama AbacatePay + retorna URL do checkout hospedado pra redirect
- Server Action `cancelSubscription()` em `src/app/assinatura/actions.ts` que chama `DELETE /v2/subscriptions/{id}` AbacatePay + atualiza `cancelled_at` no DB (sem revogar acesso ainda — RLS helper checa `next_billing_at`)
- Webhook handler EXISTENTE `/api/webhooks/abacatepay/route.ts` ganha branches pros eventos `subscription.completed` / `subscription.renewed` / `subscription.cancelled` (HMAC mesmo, idempotência mesmo, retorno 200 sempre)
- Email Resend dispara em `subscription.completed` e `subscription.renewed` (templates inline cyberpunk, idempotencyKey por subscription_id + event)
- Página `/assinatura` Server Component cyberpunk: card com status atual, `next_billing_at` formatado PT-BR, botão "Iniciar mensalidade" (se não ativo) ou "Cancelar" (se ativo), badge cyan/red/yellow conforme status
- Middleware enforcement: subscription gate é APENAS helper SQL — NÃO bloqueia rotas em Phase 4 (Phase 5 ativa quando `lobbies` table existe)
- Atualização docs: REQUIREMENTS.md H2.2 + ROADMAP.md Phase 4 + PROJECT.md removendo trial 7d

**O que está FORA do escopo:**
- Trial 7 dias grátis (REMOVIDO em discuss-phase com Pedro 2026-05-02 — coluna `trial_ends_at` permanece em `profiles` mas null em V1, preserva pra V2)
- Tabela `lobbies` e policies de criação de lobby (Phase 5 — Bot Steam Lobby Creator)
- Email aviso 5 dias antes do vencimento (deferido pra Phase 8 polish — Phase 4 só dispara emails reativos a webhook)
- Histórico de cobranças + download de recibo PDF (Phase 7 perfil expandido)
- Multi-plano (V2 — Phase 4 hardcoda 1 plano único via env vars)
- Cupons / códigos de desconto (V2)
- Trigger automático SQL ON INSERT steam_links pra ativar trial (sem trial = sem trigger)
- Sandbox testing automatizado de webhooks de renovação mensal — Pedro testa manualmente quando primeiro user assinar

</domain>

<decisions>
## Implementation Decisions (locked)

### D-01: Sem Trial 7 dias (mudança pós-pivô)
- **Decisão:** Phase 4 NÃO implementa trial 7 dias grátis. User assina → paga primeiro mês → acesso liberado. Sem cobrança = sem acesso.
- **Razão:** Pedro decidiu em discuss-phase 2026-05-02 simplificar V1.
- **Implicações:**
  - REQUIREMENTS.md H2.2 atualizada (remove "Trial 7 dias")
  - ROADMAP.md Phase 4 acceptance atualizada (remove "OR trial vigente")
  - PROJECT.md "Trial 7 dias grátis pra ativar" → removido
  - Coluna `profiles.trial_ends_at` MANTIDA (já criada Migration 005) — sempre null em V1, preservada pra possível re-introdução V2
  - Helper `has_active_subscription()` NÃO consulta `trial_ends_at` (apenas `subscriptions` table)

### D-02: Cancel flow híbrido (acesso mantido até `next_billing_at`)
- **Decisão:** User cancela → registro `subscriptions.cancelled_at = now()` + `status = 'cancelled'`, mas `next_billing_at` permanece. Helper `has_active_subscription()` retorna `true` enquanto `next_billing_at > now()` mesmo com status `cancelled`. Após `next_billing_at`, helper retorna `false` (acesso revogado).
- **Razão:** Padrão SaaS justo — user pagou o mês, deve ter acesso até fim do período. Reduz fricção/disputa.
- **Implementação SQL helper:**
  ```sql
  create or replace function public.has_active_subscription() returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and status in ('active', 'cancelled')
        and next_billing_at > now()
    );
  $$;
  ```
- **AbacatePay API:** Pesquisar se `DELETE /v2/subscriptions/{id}` cancela imediato ou no fim do período. Comportamento DB nosso é independente — DB decide acesso, AbacatePay decide próxima cobrança.

### D-03: RLS gate prep — helper SQL agora, policies em Phase 5
- **Decisão:** Phase 4 cria APENAS o helper `public.has_active_subscription()`. NÃO cria policies em tabelas que não existem (`lobbies`). Phase 5 (Bot Steam Lobby) consome o helper em policy `lobbies.insert WITH CHECK (public.has_active_subscription())`.
- **Razão:** Tabela `lobbies` não existe ainda; criar policy stub é over-engineering. Helper é função pura testável isoladamente. Pattern documentado em CONTEXT pra Phase 5 referenciar.
- **Documentação:** Esta CONTEXT.md serve como referência; Phase 5 RESEARCH.md cita helper.

### D-04: Webhook handler — extender existente, NÃO criar novo arquivo
- **Decisão:** `/api/webhooks/abacatepay/route.ts` (Phase 2) ganha branches no switch `payload.event` pra `subscription.completed` / `subscription.renewed` / `subscription.cancelled`. NÃO criar `/api/webhooks/abacatepay/subscriptions/route.ts` separado.
- **Razão:**
  - AbacatePay dashboard typicamente configura 1 endpoint único pra todos eventos
  - Mesmo HMAC secret pros 2 tipos de evento (transparent.* e subscription.*) — duplicar arquivo duplica validação
  - Pattern Phase 2 já é roteador por `payload.event` — extensão natural
  - Menos config externa = menos pontos de falha
- **Implementação:** Adicionar funções `handleSubscriptionCompleted()`, `handleSubscriptionRenewed()`, `handleSubscriptionCancelled()` no mesmo arquivo. Cada uma: UPDATE conditional na `subscriptions` table + email Resend (se completed/renewed) com idempotencyKey.
- **Schema Zod:** Estender `webhookPayloadSchema` em `src/types/abacatepay.ts` com discriminated union por `event` — `transparent.*` e `subscription.*` têm `data` shapes diferentes (research confirma).

### D-05: 1 plano único hardcoded via env vars (V1)
- **Decisão:** Phase 4 hardcoda mensalidade R$47 + product_id via env vars `ABACATEPAY_HUB_PRODUCT_ID` e `HUB_PRICE_BRL=47` (validados em Zod schema `src/lib/env.ts`). Sem tabela `subscription_plans`.
- **Razão:** Phase 4 só tem 1 plano. Tabela é over-engineering. V2 quando entrar plano premium adiciona tabela com migration própria (sem custo agora).
- **Pedro task manual:** Criar produto no dashboard AbacatePay (`Nome: FormulaDota HUB Mensal`, `Preço: 4700 centavos`, `Ciclo: MONTHLY`), copiar `prod_xxxx` ID retornado, adicionar em `.env.local` como `ABACATEPAY_HUB_PRODUCT_ID=prod_xxxx`. Plan documenta esse passo.

### D-06: Página `/assinatura` minimal (status + ação)
- **Decisão:** Server Component que mostra:
  - Sem subscription ativa: card cyan com explicação ("R$ 47/mês — acesso ao HUB completo") + botão "Iniciar mensalidade" (Server Action redireciona pro AbacatePay checkout URL)
  - Com `status='active'`: card verde com "Mensalidade ativa", "Próxima cobrança: {next_billing_at PT-BR}", botão "Cancelar mensalidade" (Server Action)
  - Com `status='cancelled' AND next_billing_at > now()`: card amarelo com "Cancelada — acesso até {next_billing_at PT-BR}", botão "Reativar mensalidade" (cria nova subscription)
  - Com `status='expired' OR (cancelled AND next_billing_at <= now())`: card vermelho com "Expirada — sem acesso", botão "Iniciar mensalidade"
- **Razão:** MVP faster. Histórico cobranças + download recibo PDF expandem na Phase 7 perfil.
- **Layout:** Padrão card cyberpunk Phase 1.5 (`bg-[#0A0A1A] border-[#27272a]`, font-display Space Grotesk, ações cyan).

### D-07: Webhook idempotência por evento
- **Decisão:**
  - `subscription.completed`: UPDATE `subscriptions SET status='active', started_at=NOW(), next_billing_at=... WHERE abacatepay_subscription_id=? AND status='pendente'` (atomic — duplicado afeta 0 rows)
  - `subscription.renewed`: UPDATE `subscriptions SET next_billing_at=NEW_DATE WHERE abacatepay_subscription_id=? AND next_billing_at < NEW_DATE` (só atualiza se data avança — rejeita reorders)
  - `subscription.cancelled`: UPDATE `subscriptions SET status='cancelled', cancelled_at=NOW() WHERE abacatepay_subscription_id=? AND status='active'` (idempotente — duplicado é no-op)
- **Email idempotencyKey:** `subscription-completed-{subscription_id}` + `subscription-renewed-{subscription_id}-{billing_period_iso}` (renewed precisa key por período senão Resend bloqueia 2º email).

### D-08: Migration 008 estrutura
- **Tabela `subscriptions`:**
  ```sql
  create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    abacatepay_subscription_id text unique,  -- NULL antes do webhook completed; preenche depois
    abacatepay_billing_id text unique,        -- bill_xxx retornado no create (idempotência do create)
    status text not null default 'pendente' check (status in ('pendente','active','cancelled','expired')),
    started_at timestamptz,
    next_billing_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index subscriptions_user_id_status_idx on public.subscriptions (user_id, status);
  create unique index subscriptions_one_active_per_user on public.subscriptions (user_id) where status in ('pendente','active');
  ```
- **Trigger `updated_at`:** Reusar pattern de Migration 001 (handle_updated_at).
- **RLS:**
  - SELECT: `auth.uid() = user_id OR public.is_admin()`
  - INSERT: `auth.uid() = user_id` (Server Action createSubscriptionCheckout cria)
  - UPDATE: apenas via service-role (webhook handler) — sem policy pra cookie client (impossibilita user mexer status)
  - DELETE: nunca (manter audit trail)
- **Helper `has_active_subscription()`:** Como em D-02.

### D-09: Email Resend templates
- **Subscription completed:** "Bem-vindo ao HUB! Sua mensalidade R$ 47 está ativa. Próxima cobrança em {next_billing_at}."
- **Subscription renewed:** "Mensalidade renovada — R$ 47 cobrados. Próxima cobrança em {next_billing_at}."
- **Subscription cancelled:** "Mensalidade cancelada. Você mantém acesso até {next_billing_at}." (apenas se cancelled antes de expirar; se expired sem renovar, não dispara email — silencioso)
- **Templates:** Inline HTML cyberpunk (mesmo pattern `src/lib/resend.ts` Phase 2 — extender com 3 helpers `buildSubscriptionCompletedHtml/Renewed/Cancelled`).

### D-10: Server Actions structure
- `src/app/assinatura/actions.ts` exporta:
  - `createSubscriptionCheckout()` — autentica user (cookie client, NÃO service-role per C13), cria registro `subscriptions` status pendente + chama `createSubscription()` AbacatePay + retorna URL pro `redirect(url)` no componente
  - `cancelSubscription()` — autentica user, busca subscription ativa do user, chama `DELETE /v2/subscriptions/{id}` AbacatePay, UPDATE cancelled_at
- **Validação Zod:** Sem input do user (Server Actions sem args ou apenas FormData), mas validate retornos da API AbacatePay com Zod (per C3).
- **Functions max 50 linhas:** Separar `getOrCreatePendingSubscription()` helper se passar.

### Claude's Discretion (não locked, planner pode decidir)
- Layout exato do card de status (cores específicas, ícones Lucide)
- Como formatar `next_billing_at` em PT-BR (provavelmente `Intl.DateTimeFormat('pt-BR')` — pattern existente no projeto)
- Se mostrar polling do status pós-redirect ou só refresh manual (Phase 2 deixou Pedro decidir; manter simples — refresh manual)
- Naming exato do helper auxiliar (e.g., `getOrCreatePendingSubscription` vs `ensureSubscriptionRecord`)
- Como apresentar erro AbacatePay no `/assinatura` (toast Sonner vs ErrorBanner inline — Phase 3 introduziu ErrorBanner pattern, replicar)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision e contrato
- `.planning/PROJECT.md` — visão pós-pivô formuladota = HUB
- `.planning/ROADMAP.md` — Phase 4 escopo + acceptance (atualizado pós-discuss-phase removendo trial)
- `.planning/REQUIREMENTS.md` — H2.1 (subscription nativa AbacatePay), H2.2 (sem trial — atualizado), H2.3 (RLS gate), H2.4 (página /assinatura) + cross-cutting C1-C13

### Schema atual (não modificar; só adicionar via Migration 008)
- `supabase/migrations/001_initial_schema.sql` — `profiles`, `packages`, `purchases`
- `supabase/migrations/002_rls_policies.sql` — pattern policy + helper `is_admin()`
- `supabase/migrations/004_doctrine_and_moderation.sql` — pattern de helpers RLS, trigger
- `supabase/migrations/005_steam_roles_multicoach.sql` — `profiles.trial_ends_at` (manter null V1) + helper `is_coach()`
- `supabase/migrations/006_finalize_pedro_coach_seed.sql` — Pedro coach #1
- `supabase/migrations/007_public_coach_profiles_visible.sql` — RLS public read coaches

### Lib patterns existentes (REUSAR — não recriar)
- `src/lib/abacatepay.ts` — extender com `createSubscription(userId, productId)` e `cancelSubscription(subscriptionId)`. `verifyAbacatepayWebhookSignature()` JÁ COBRE eventos `subscription.*` (mesmo HMAC).
- `src/lib/resend.ts` — extender com 3 funções `sendSubscriptionCompletedEmail`, `sendSubscriptionRenewedEmail`, `sendSubscriptionCancelledEmail` (lazy init Resend client mantido)
- `src/lib/env.ts` — adicionar `ABACATEPAY_HUB_PRODUCT_ID` (string `prod_*` required) ao serverSchema Zod
- `src/lib/supabase/service.ts` — usar APENAS no webhook (per C13)
- `src/lib/supabase/server.ts` — pattern Server Action e Server Component cookie client
- `src/lib/supabase/middleware.ts` — Phase 4 NÃO modifica middleware; Phase 5 adiciona subscription gate quando `lobbies` existir

### API Route existente (extender, não recriar)
- `src/app/api/webhooks/abacatepay/route.ts` — adicionar branches `subscription.*` no switch `payload.event`. Manter:
  - Raw body via `request.text()` ANTES de qualquer parse (Pitfall 2)
  - HMAC validate via `verifyAbacatepayWebhookSignature` (timingSafeEqual)
  - SEMPRE retornar 200 (Pitfall 3)
  - Idempotência via UPDATE conditional WHERE
  - Email fire-and-forget via `void` call

### Types
- `src/types/abacatepay.ts` — estender `webhookPayloadSchema` com discriminated union (`event` discriminator) cobrindo `transparent.*` e `subscription.*`
- `src/types/database.ts` — regenerar pós-Migration 008 via Supabase MCP `mcp__supabase__generate_typescript_types`

### Frontend patterns existentes (replicar visual)
- `src/app/perfil/page.tsx` (se existir; senão `/codigo-de-conduta` ou `/onboarding/doutrina`) — pattern Server Component cyberpunk
- `src/components/catalog/package-card.tsx` — pattern card cyberpunk com Badge variant
- `src/components/auth/error-banner.tsx` (Phase 3) — replicar em `/assinatura` pra erros AbacatePay

### Research existente (não pesquisar denovo)
- `.planning/research/hub-stack-deep-dive.md` §1 (AbacatePay subscriptions) — endpoint, payload, webhooks, schema DB, Pitfalls. CONFIANÇA HIGH.

### AbacatePay docs (verificar mudanças desde pesquisa 2026-04-30)
- https://docs.abacatepay.com/pages/subscriptions/create.md — endpoint criar
- https://docs.abacatepay.com/pages/subscriptions/reference.md — referência técnica
- https://docs.abacatepay.com/pages/webhooks/events/subscriptions.md — eventos detalhados (researcher deve revalidar)

### Resend SDK v6
- https://resend.com/docs/api-reference/emails/send-email — idempotencyKey segundo argumento (já em uso Phase 2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/abacatepay.ts` (113 linhas): tem `createTransparentPix()` e `verifyAbacatepayWebhookSignature()`. **Adicionar** `createSubscription()` e `cancelSubscription()`. HMAC validation reutiliza idêntico (research confirma mesmo secret).
- `src/lib/resend.ts` (95 linhas): tem `sendPurchaseConfirmationEmail()` + `getResend()` lazy init + `buildConfirmationHtml()`. **Adicionar** 3 funções similares pra subscription events.
- `src/app/api/webhooks/abacatepay/route.ts` (185 linhas): handler completo com idempotência, email side-effect, Zod validation, fire-and-forget. **Adicionar** 3 handlers `handleSubscription*` + estender switch.
- `src/lib/env.ts`: pattern Zod com `requireServerEnv` runtime helper. **Adicionar** `ABACATEPAY_HUB_PRODUCT_ID` ao schema.
- `src/types/abacatepay.ts`: schema Zod já estruturado. **Estender** com discriminated union por `event`.
- Migrations 005/006/007 estabelecem pattern: arquivo separado por concern, idempotente (`drop policy if exists`, `on conflict do nothing`, DO $ blocks).

### Established Patterns
- **2-query approach** em vez de Supabase JOIN (Phase 2/3 issue com tipos `Relationships`). Em `/assinatura` Server Component: query 1 = subscription do user; query 2 = subscription_plan info se necessário (em Phase 4 só 1 plano hardcoded → não precisa query 2).
- **Service-role APENAS em /api/webhooks/*** (C13). Server Action `createSubscriptionCheckout`/`cancelSubscription` usam cookie client. RLS protege.
- **`Pick<Tables<T>, K>`** em selects parciais (zero `as` cast).
- **HMAC SHA-256 base64 + timingSafeEqual** — secret única `ABACATEPAY_WEBHOOK_SECRET` cobre todos eventos.
- **idempotencyKey Resend SDK v6** como segundo arg de `resend.emails.send(payload, { idempotencyKey })`.
- **Webhook SEMPRE 200** mesmo em validation failure pós-HMAC (HMAC fail = 401, todo resto = 200).
- **Migration idempotente** via `create table if not exists`, `drop policy if exists`, `on conflict do nothing`.

### Integration Points
- Header global (`src/components/layout/header.tsx`): adicionar link "Assinatura" no nav após "Pacotes" (futuro, Phase 8 polish)
- Middleware `src/lib/supabase/middleware.ts`: **NÃO modificar** Phase 4. Phase 5 adiciona subscription gate quando `lobbies` existir.
- Página `/perfil` (existência incerta — se existe, futuro link "Gerenciar mensalidade" → `/assinatura`. Phase 8 polish.)
- Tabela `subscriptions.user_id` FK pra `profiles.id` — cascade delete acompanha lifecycle do user

</code_context>

<specifics>
## Specific Ideas

### Pedro task manual antes do Plan rodar (preflight)
1. Criar produto no dashboard AbacatePay sandbox: `Nome: FormulaDota HUB Mensal`, `Preço: 4700` (centavos), `Ciclo: MONTHLY`
2. Copiar o `prod_xxxx` retornado e adicionar em `.env.local`:
   ```
   ABACATEPAY_HUB_PRODUCT_ID=prod_xxxx
   HUB_PRICE_BRL=47
   ```
3. Plan documenta esse passo no SUMMARY.md como pendência se Pedro não fizer antes

### Webhook payload `subscription.*` shape (research confirmado)
```json
{
  "event": "subscription.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_abc123",
      "status": "ACTIVE",
      "canceledAt": null
    },
    "customer": { "email": "...", "name": "..." },
    "checkout": { "externalId": "subscription-{user_id}" }
  }
}
```
- `data.checkout.externalId` formato `subscription-{user_id}` — extrai `user_id` pra correlacionar com `subscriptions.user_id`
- Alternativa: usar `abacatepay_billing_id` (bill_xxx do create response) como external key — mais robusto

### Status transitions allowed
```
pendente → active   (subscription.completed)
active   → cancelled (subscription.cancelled OR cancelSubscription Server Action)
active   → expired  (próximo subscription.renewed falha — V2 trata, V1 manual via admin)
cancelled → active   (Server Action createSubscriptionCheckout cria nova subscription se anterior cancelled)
expired  → active    (idem reativação)
```

### Schema env vars novos
```
# AbacatePay subscription
ABACATEPAY_HUB_PRODUCT_ID=prod_xxxx  # criado manual no dashboard
HUB_PRICE_BRL=47                     # display only (cobrança usa preço do dashboard)
```

</specifics>

<deferred>
## Deferred Ideas (NOT in Phase 4)

- **Trial 7 dias grátis** — REMOVIDO em V1 (Pedro 2026-05-02). V2 pode reintroduzir; coluna `profiles.trial_ends_at` permanece preparada
- **Email aviso 5 dias antes vencimento** — Phase 8 polish (cron Vercel ou pg_cron Supabase)
- **Tabela `subscription_plans` multi-tier** — V2 quando lançar plano premium
- **Histórico de cobranças + download recibo PDF** — Phase 7 perfil expandido
- **Cupons / códigos de desconto** — V2
- **Trigger automático SQL pra ativar trial ON INSERT steam_links** — sem trial = sem trigger
- **Subscription gate no middleware** — Phase 5 quando `lobbies` table existir
- **Sandbox testing automatizado de renovação mensal** — Pedro testa manual quando primeiro user assinar (sandbox AbacatePay deve permitir simular `subscription.renewed` via dashboard)
- **Polling status pós-redirect AbacatePay** — Phase 4 deixa user dar refresh manual; auto-poll é Phase 7 polish
- **Histórico de status changes (audit log)** — V2; Phase 4 não cria `subscription_status_log` table

</deferred>

---

*Phase: 04-subscription-mensal*
*Context gathered: 2026-05-02 via discuss-phase com Pedro*
