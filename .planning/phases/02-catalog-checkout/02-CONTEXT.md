# Phase 2: Catalog & Checkout — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** PRD Express Path (PRD.md §6 Phase 2 + §4 F2/F3 + §11 moderação RLS)

<domain>
## Phase Boundary

Esta phase entrega o caminho completo de monetização: do user logado (com aceite doutrinário válido + status `ok`/`warned`) clicando num pacote do catálogo até o saldo de partidas/sessões aparecer no perfil dele após pagamento PIX confirmado.

**O que está dentro do escopo:**
- Página `/pacotes` lista os 4 pacotes ativos do DB (já seedados na migration 003)
- Página de checkout pra um pacote selecionado com QR Code PIX gerado pela AbacatePay V2
- Server Action que cria registro `purchases` (status `pendente`) e chama AbacatePay
- API Route `/api/webhooks/abacatepay` que valida HMAC, processa eventos `checkout.completed` / `checkout.lost` / `checkout.refunded`, atualiza status e libera saldo (com idempotência)
- Email de confirmação via Resend após pagamento confirmado
- Página `/partidas` (versão mínima) mostrando saldo total de partidas/sessões disponíveis pro user
- Logging estruturado pra debug de webhook

**O que está fora do escopo:**
- Calendário de agendamento (Phase 3)
- Crud admin de pacotes (Phase 5)
- Notificação Discord do bot (Phase 4 — bot ainda não rodando)
- Domínio prod (Phase 6 — usar tunnel local pra dev)

</domain>

<decisions>
## Implementation Decisions

### Pagamento — AbacatePay V2 Transparent PIX (sandbox)

> ⚠ **CORREÇÃO pós-research (2026-05-01)**: o produto certo é **Transparent PIX** (`POST /v2/transparents/create`), não Checkout. O produto Checkout retorna URL de página hospedada da AbacatePay; o Transparent retorna `brCode` + `brCodeBase64` pra exibir QR inline no nosso site (UX melhor pro mentorado brasileiro). Detalhes em `02-RESEARCH.md`.

- **API key**: `ABACATEPAY_API_KEY` em `.env.local` (sandbox prefix `abc_dev_`).
- **Endpoint criar PIX**: `POST https://api.abacatepay.com/v2/transparents/create` → retorna `id`, `brCode` (texto copiar-e-colar), `brCodeBase64` (PNG pronto p/ `<img src="data:image/png;base64,...">`).
- **Eventos webhook (Transparent — não Checkout)**:
  - `transparent.completed` → atualiza purchase para `pago`, libera saldo, dispara email Resend
  - `transparent.disputed` → marca purchase com flag de disputa (admin trata manualmente)
  - `transparent.refunded` → marca purchase como refundada
- **Validação HMAC**: SHA-256 base64 no header `X-Webhook-Signature`. Comparar com `crypto.timingSafeEqual` (NUNCA `===`).
- **Idempotência**: `UPDATE purchases SET status='pago', ... WHERE external_payment_id=? AND status='pendente'`. Atômico no PostgreSQL — webhook duplicado afeta 0 linhas (return cedo, não duplicar saldo). `external_payment_id` é UNIQUE no schema.
- **Status flow**: `pendente` → (`pago` | `expirado` | `cancelado`). Apenas `pendente → pago` libera saldo.

### Webhook em desenvolvimento (sem domínio prod ainda)
- Vercel ainda não está conectado. Pra testar webhook localmente, usar **smee.io** (recomendado — bridge HTTP→localhost sem exigir conta) ou **ngrok** (fallback).
- Documentar comando exato em `.env.example` ou `README.md`.

### RLS — confiar no schema, não duplicar checagem na app
- `purchases.insert` policy já valida `has_accepted_doctrine(auth.uid()) AND is_user_active(auth.uid())` (migration 004).
- Server Action faz `supabase.from('purchases').insert(...)` direto e deixa RLS rejeitar; app pega o erro e retorna mensagem amigável.
- **NÃO** repetir checagem de `behavior_status` ou `doctrine_accepted_at` no código da app — única fonte da verdade é o DB.

### Email — Resend com remetente temporário
- `EMAIL_FROM=onboarding@resend.dev` enquanto domínio formuladota.com não verificado no Resend.
- Email de confirmação template inline (PT-BR, cyberpunk visual minimal — texto principal preto-no-branco mas com header/CTA cyan).
- Disparar do webhook handler (pós-`checkout.completed`), não do checkout em si.

### UI — shadcn/ui + cyberpunk
- Instalar shadcn componentes mínimos da phase: `Button`, `Card`, `Badge`, `Skeleton` (loading), `Sonner`/`Toast` (feedback), `Dialog` (modal de checkout opcional).
- Cards de pacotes seguem padrão cyberpunk de Phase 1.5 (border + bg + cyan accent).
- Loading states obrigatórios (Skeleton ou indicator) em todas as fetches.
- Empty state em `/partidas` quando saldo zero: convite pra ir pro catálogo.

### Server Actions vs API Routes
- **Server Action** (`createCheckout(packageId)`): cria purchase pendente + chama AbacatePay + retorna URL/QR Code. Roda dentro da sessão autenticada do Next.
- **API Route** (`POST /api/webhooks/abacatepay`): recebe webhook externo. Valida HMAC. Não usa cookies de sessão — usa `service_role` key pra fazer UPDATE bypassing RLS (justo porque é trigger sistêmico, não user-driven).

### Logging
- Webhook logs estruturados: timestamp, event type, external_id, purchase_id, status_before, status_after, error (se houver). Salvar em tabela `webhook_logs` simples (Migration 005) ou só `console.log` no Vercel (decidir após research).

### Deep links
- `/checkout/[packageId]` precisa funcionar via link direto também (cliente clica ou compartilha).
- Se package não existe, está inativo, ou user não pode comprar (RLS bloqueia): mostrar erro amigável apontando o motivo (não revelar detalhes técnicos).

### Claude's Discretion (não locked)
- Layout exato do `/pacotes` (grid? lista? cards horizontais?)
- Modal de checkout vs page dedicada (pesquisar UX padrão pra pagamento PIX brasileiro)
- Se mostrar polling do status pós-checkout ou só aguardar webhook (decisão cobre UX vs simplicidade)
- Quantos componentes shadcn instalar (lazy: só os que usar agora)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PRD & Requirements (raiz do projeto)
- `PRD.md` — fonte canônica de requisitos (§4 F2, F3; §6 Phase 2; §11 moderação RLS)
- `CLAUDE.md` — convenções projeto (TypeScript strict, max 50 linhas/função, RLS obrigatória, WCAG, etc.)
- `.planning/STATE.md` — estado atual (stack, migrations aplicadas, contas externas)
- `.planning/ROADMAP.md` — Phase 2 escopo + acceptance criteria
- `.planning/REQUIREMENTS.md` — F2.1-F2.4, F3.1-F3.5 detalhados

### Phase 1 / 1.5 reference (não modificar)
- `src/lib/supabase/server.ts` — pattern Server Component
- `src/lib/supabase/client.ts` — pattern Client Component
- `src/lib/supabase/middleware.ts` — enforcement em camadas (banned/suspended/!accepted)
- `src/lib/env.ts` — validação Zod env vars (preprocess "" → undefined)
- `src/app/onboarding/doutrina/actions.ts` — pattern Server Action com Zod + redirect
- `src/lib/doctrine.ts` — pattern de constantes tipadas
- `src/types/database.ts` — types Supabase gerados

### Schema (não modificar nesta phase, só consumir)
- `supabase/migrations/001_initial_schema.sql` — tables purchases, packages
- `supabase/migrations/002_rls_policies.sql` — policies base
- `supabase/migrations/003_seed_packages.sql` — 4 pacotes seedados
- `supabase/migrations/004_doctrine_and_moderation.sql` — RLS purchases.insert exige aceite + status ativo

### Documentação externa pra pesquisar
- AbacatePay V2 — https://docs.abacatepay.com (researcher deve buscar endpoint criar checkout PIX + spec do webhook + assinatura HMAC)
- Resend Node SDK — https://resend.com/docs (pra email transacional)
- shadcn/ui — https://ui.shadcn.com (componentes Button, Card, Badge, Skeleton, Toast, Dialog)
- smee.io e ngrok — pra tunnel local em dev

</canonical_refs>

<specifics>
## Specific Ideas

- Pacotes seedados (`select * from packages where ativo = true order by display_order`):
  1. Avulsa — R$ 10 — 1 partida
  2. Pacote 5 — R$ 50 — 5 partidas
  3. Pacote 10 — R$ 100 — 10 partidas
  4. Mentoria mensal — R$ 100 — 8 partidas + 2 sessões teóricas

- Behavior_status do user determina UI no `/pacotes`:
  - `ok` ou `warned` → botão "Comprar" ativo
  - `suspended` → cards visíveis mas botão desabilitado com tooltip "Aguarde fim da suspensão"
  - `banned` → middleware redireciona pra `/banned` antes de chegar (não exibe `/pacotes`)
  - sem aceite → middleware redireciona pra `/onboarding/doutrina` antes (idem)

- Email de confirmação template (Resend):
  - Subject: `Pagamento confirmado — {nome do pacote}`
  - Body: saudação + resumo do pacote + CTA "Agendar primeira partida" (link `/agendar`, mesmo que página não exista ainda na Phase 2 — vai dar 404 amigável)

- Tunnel local pra dev:
  ```
  pnpm dlx smee-client --url https://smee.io/{seu-id} --target http://localhost:3000/api/webhooks/abacatepay
  ```

</specifics>

<deferred>
## Deferred Ideas

- Renovação automática de assinatura mensal (V2)
- Cupons / códigos de desconto (V2)
- Múltiplos provedores de pagamento (Mercado Pago, Stripe) — V2
- Page dedicada `/recibos` com histórico fiscal — V2
- Webhook signature secret rotation — V2
- Email com template HTML rico (usar React Email lib) — fica como minor improvement futuro

</deferred>

---

*Phase: 02-catalog-checkout*
*Context gathered: 2026-05-01 via PRD Express Path*
