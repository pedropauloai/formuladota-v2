---
phase: 02-catalog-checkout
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.example
  - README.md
autonomous: true
requirements: [F3.4, C8]
must_haves:
  truths:
    - ".env.example tem todas as vars de Phase 2 (ABACATEPAY_API_KEY, ABACATEPAY_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM)"
    - ".env.example tem comentário explicando como gerar canal smee.io e rodar smee-client"
    - "README.md tem seção 'Webhook Local Dev' com comando exato pnpm dlx smee-client"
    - "Pedro consegue copiar comando do README e rodar tunnel sem ler RESEARCH.md"
  artifacts:
    - path: ".env.example"
      provides: "Template de variáveis de ambiente para Phase 2"
      contains: "ABACATEPAY_API_KEY"
    - path: "README.md"
      provides: "Seção Webhook Local Dev com instruções smee.io + ngrok fallback"
      contains: "smee-client"
  key_links: []
---

<objective>
Documentar setup de tunnel local para webhook AbacatePay em desenvolvimento (per D-Webhook em desenvolvimento). Phase 2 não pode ser testada end-to-end sem um tunnel HTTP→localhost porque AbacatePay não consegue alcançar `http://localhost:3000` direto. CONTEXT.md decidiu usar **smee.io** (não exige conta) com ngrok como fallback.

Esta plan é puramente documentação — sem código de aplicação. Atualiza `.env.example` (template de env vars) e adiciona seção no `README.md` com o comando exato pra rodar.

Purpose: Pedro é beginner. Quando rodar `pnpm dev` e quiser testar checkout PIX end-to-end, precisa achar o comando do tunnel sem caçar em RESEARCH.md (44k linhas). README.md é o primeiro lugar que ele olha.

Output: `.env.example` atualizado + seção nova no `README.md`.
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-catalog-checkout/02-CONTEXT.md
@.planning/phases/02-catalog-checkout/02-RESEARCH.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Atualizar .env.example com vars de Phase 2 + comentário smee.io</name>
  <files>.env.example</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/.env.example (estado atual — pode existir ou não)
    - C:/Users/ADM/projects/formuladota-v2/CLAUDE.md (seção "Variáveis de Ambiente" — template canônico)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Tunnel Local para Webhook em Desenvolvimento")
  </read_first>
  <action>
1. Ler `.env.example` se existe (`cat .env.example`). Se não existir, criar com base no template de CLAUDE.md.

2. Garantir que TODAS as vars abaixo estão presentes (mesmo as de outras phases — não remover existentes). Adicionar comentários PT-BR onde não-óbvio. Conteúdo final:

```bash
# ============================================================================
# Supabase (Phase 1 — já configurado)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Service-role key — NUNCA commitar. Usado APENAS em /api/webhooks/* (bypass RLS)
SUPABASE_SERVICE_ROLE_KEY=

# ============================================================================
# Discord (Phase 1 OAuth + Phase 4 bot)
# ============================================================================
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# ============================================================================
# AbacatePay V2 — PIX Transparent (Phase 2)
# ============================================================================
# Sandbox key tem prefixo abc_dev_; produção tem prefixo abc_prod_
# Pegar em: AbacatePay dashboard → API Keys
ABACATEPAY_API_KEY=
# Secret HMAC do webhook (configurado ao criar o webhook no dashboard AbacatePay)
# Validação: HMAC-SHA256 base64 no header X-Webhook-Signature
ABACATEPAY_WEBHOOK_SECRET=

# ============================================================================
# OpenDota (Phase 5 — opcional)
# ============================================================================
OPENDOTA_API_KEY=

# ============================================================================
# Resend — email transacional (Phase 2)
# ============================================================================
# Pegar em: Resend dashboard → API Keys
RESEND_API_KEY=
# Enquanto domínio formuladota.com não verificado, usar o default da Resend.
# Quando domínio for verificado, trocar para noreply@formuladota.com
EMAIL_FROM=onboarding@resend.dev

# ============================================================================
# App
# ============================================================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ============================================================================
# DEV ONLY — Tunnel webhook local com smee.io
# ============================================================================
# smee.io é uma bridge HTTP→localhost via Server-Sent Events.
# NÃO precisa de conta. Use os passos abaixo para testar webhook em dev.
#
# 1) Acesse https://smee.io e clique "Start a new channel" — ele vai gerar
#    uma URL única tipo https://smee.io/abc123XYZ
# 2) Configure essa URL como endpoint no dashboard AbacatePay (sandbox)
# 3) Em terminal separado, rode (substituindo SEU-CANAL):
#
#    pnpm dlx smee-client --url https://smee.io/SEU-CANAL --target http://localhost:3000/api/webhooks/abacatepay
#
# 4) Em outro terminal, rode `pnpm dev`
# 5) Para simular pagamento (sem fluxo real), use o endpoint da AbacatePay:
#    POST https://api.abacatepay.com/v2/transparents/simulate-payment?id=PIX_ID
#    Authorization: Bearer $ABACATEPAY_API_KEY
#
# Salve aqui o canal smee.io que você gerou (NÃO é variável de env, só
# referência manual pra você não perder):
# SMEE_CHANNEL_DEV=https://smee.io/_______
```

3. Confirmar: arquivo existe, tem TODAS as vars listadas em CLAUDE.md, comentário smee.io presente.

4. Pedir confirmação do user para `git add .env.example` (este arquivo VAI pro repo, mas `.env` não — Pedro deve ter `.env` em `.gitignore` desde Phase 1).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f .env.example && grep -q "ABACATEPAY_API_KEY" .env.example && grep -q "ABACATEPAY_WEBHOOK_SECRET" .env.example && grep -q "RESEND_API_KEY" .env.example && grep -q "EMAIL_FROM" .env.example && grep -q "smee" .env.example && grep -q "smee-client" .env.example</automated>
  </verify>
  <acceptance_criteria>
    - `.env.example` exists at project root
    - File contains exact strings: `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - File contains comment block referencing `smee.io` and `pnpm dlx smee-client`
    - File contains exact command path `/api/webhooks/abacatepay`
    - File does NOT contain real API keys (placeholders only — verify with `grep -E "abc_(dev|prod)_[A-Za-z0-9]{20}" .env.example` returns no matches)
    - `EMAIL_FROM` has default value `onboarding@resend.dev` (not empty)
    - `NEXT_PUBLIC_SITE_URL` has default `http://localhost:3000`
  </acceptance_criteria>
  <done>.env.example tem template completo de vars Phase 2, com instruções inline para tunnel smee.io.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Adicionar seção 'Webhook Local Dev' no README.md</name>
  <files>README.md</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/README.md (estado atual — verificar se existe e que conteúdo tem)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Tunnel Local para Webhook em Desenvolvimento" — copiar instruções)
  </read_first>
  <action>
1. Ler `README.md` (`cat README.md`). Se não existir, criar com seções básicas (Quickstart, Comandos, Webhook Local Dev). Se existir, ADICIONAR a seção "Webhook Local Dev" sem remover conteúdo existente.

2. Seção a adicionar (insira logo após a seção "Comandos" ou no final do arquivo):

```markdown
## Webhook Local Dev (Phase 2 — AbacatePay PIX)

Para testar fluxo de pagamento end-to-end localmente, você precisa de um tunnel HTTP→localhost porque AbacatePay (na nuvem) não consegue alcançar `http://localhost:3000` diretamente.

Usamos [smee.io](https://smee.io) — não exige conta, sem rate limit em dev.

### Setup (uma vez)

1. Acesse [smee.io](https://smee.io) e clique **Start a new channel**. Ele vai gerar uma URL única tipo `https://smee.io/abc123XYZ`.
2. No dashboard da AbacatePay (sandbox), crie um webhook:
   - **Endpoint URL**: a URL que o smee.io te deu acima
   - **Secret**: gere um string aleatório e salve em `ABACATEPAY_WEBHOOK_SECRET` no seu `.env.local`
   - **Eventos**: marque `transparent.completed`, `transparent.disputed`, `transparent.refunded`

### Rodar (toda vez que for desenvolver)

Em **três terminais separados**:

```bash
# Terminal 1 — tunnel smee.io
pnpm dlx smee-client \
  --url https://smee.io/SEU-CANAL \
  --target http://localhost:3000/api/webhooks/abacatepay

# Terminal 2 — Next.js dev server
pnpm dev

# Terminal 3 — quando quiser simular pagamento sem fluxo PIX real:
curl -X POST "https://api.abacatepay.com/v2/transparents/simulate-payment?id=PIX_ID_AQUI" \
  -H "Authorization: Bearer $ABACATEPAY_API_KEY"
```

Substitua `SEU-CANAL` pelo ID que o smee.io te deu, e `PIX_ID_AQUI` pelo `id` retornado em `POST /v2/transparents/create`.

### Fallback: ngrok

Se smee.io estiver instável, use [ngrok](https://ngrok.com) (agora exige conta gratuita):

```bash
ngrok http 3000
# Copie a URL HTTPS gerada e cole no dashboard AbacatePay como endpoint
```

### Validar HMAC manualmente (debug)

Se webhook retornar 401 "Assinatura inválida" mesmo com tunnel rodando, verifique:

1. `ABACATEPAY_WEBHOOK_SECRET` no `.env.local` bate exatamente com o secret configurado no dashboard AbacatePay
2. Você está usando `request.text()` ANTES de qualquer `JSON.parse` (parsear muda o body e quebra a assinatura — ver Pitfall 2 em `.planning/phases/02-catalog-checkout/02-RESEARCH.md`)
```

3. Salvar e verificar com `cat README.md` que conteúdo existente foi preservado.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f README.md && grep -q "Webhook Local Dev" README.md && grep -q "smee.io" README.md && grep -q "smee-client" README.md && grep -q "/api/webhooks/abacatepay" README.md && grep -q "transparent.completed" README.md && grep -q "ngrok" README.md</automated>
  </verify>
  <acceptance_criteria>
    - `README.md` exists at project root
    - File contains heading `## Webhook Local Dev` (ou similar com `Webhook` + `Local`)
    - File contains exact string `pnpm dlx smee-client`
    - File contains exact string `https://smee.io`
    - File contains exact string `/api/webhooks/abacatepay`
    - File contains exact string `transparent.completed` (event name)
    - File contains exact string `ABACATEPAY_WEBHOOK_SECRET`
    - File mentions `ngrok` as fallback option
    - File mentions `simulate-payment` AbacatePay endpoint (para testes sem fluxo PIX real)
    - Existing README.md content NOT removed (file size grew, didn't shrink)
  </acceptance_criteria>
  <done>README tem seção clara para Pedro rodar tunnel smee.io e testar webhook PIX localmente sem ler RESEARCH.md.</done>
</task>

</tasks>

<verification>
- `.env.example` e `README.md` ambos atualizados
- Pedro pode `cp .env.example .env.local`, preencher as keys, e rodar webhook local seguindo só o README
- Nenhum secret real commitado (apenas placeholders)
</verification>

<success_criteria>
- Documentação operacional pronta — Pedro não precisa caçar comando em RESEARCH.md
- `.env.example` é fonte da verdade pro template de env (alinhado com CLAUDE.md)
- Tunnel smee.io é o caminho recomendado, ngrok como fallback documentado
</success_criteria>

<output>
Após completar as 2 tasks, criar `.planning/phases/02-catalog-checkout/02-04-smee-tunnel-docs-SUMMARY.md` com:
- Vars adicionadas ao `.env.example` (lista)
- Seção adicionada ao README.md (heading exato)
- URL/comando smee-client documentado
- Notas sobre ngrok fallback
</output>
