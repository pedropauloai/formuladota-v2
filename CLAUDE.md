# formuladota v2 — Claude Code Instructions

## Project

**formuladota v2** é uma plataforma web de mentoria Dota 2 em tempo real onde Pedro Paulo (Immortal/Top 0.5%) joga ranked com clientes pagantes. Sistema com perfil de progressão, agendamento, pagamento PIX e bot Discord integrado.

📋 **PRD completo: ler `PRD.md` na raiz antes de qualquer trabalho.**

### Constraints
- **Tech Stack**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase + Discord OAuth + AbacatePay + Discord.js bot
- **Domain**: formuladota.com (verificar) ou subdomínio Vercel
- **Persona**: jogador Dota 2 brasileiro, hobby, ticket baixo (R$ 10/partida)
- **Pricing**: começa de mercado (R$ 10/partida), sobe com demanda — NÃO tentar premium prematuramente
- **Maintainability**: Pedro é não-dev. Código deve ser legível, comentários em português onde não-óbvio
- **Limite hardcoded**: máximo 3 partidas/dia agendáveis (proteção saúde mental)

## Workflow Recomendado

Este projeto usa **GSD plugin (Get Shit Done)**. Para qualquer trabalho:

```bash
/gsd-execute-phase
```

E seguir as **6 fases** do PRD em sequência:
1. Foundation (auth + DB)
2. Catalog & Checkout (pacotes + PIX)
3. Profile & Scheduling (perfil + calendário)
4. Discord Bot (comandos + notificações)
5. Admin Panel (Pedro gerencia tudo)
6. Polish & Deploy

Para fixes pequenos: `/gsd-quick`. Para debug: `/gsd-debug`.

## Convenções

### Código
- TypeScript strict mode, zero `any`
- Functions max 50 linhas
- Files max 300 linhas
- Early return pra reduzir nesting
- Async/await sempre, nunca `.then().catch()` chains
- ES6 imports, nunca `require()`
- `const` por padrão, `let` quando precisar
- Logger em vez de `console.log` em produção (use `console.error` apenas em server actions)

### Validação
- Zod em todos os inputs de API e Server Actions
- RLS policies obrigatórias em todas as tables Supabase
- Validar webhooks (assinatura HMAC)

### UI
- Cyberpunk vibe alinhado com [pedropauloai.vercel.app](https://pedropauloai.vercel.app):
  - Background dark `bg-[#050505]`
  - Cyan primary `text-[#00F0FF]`
  - Purple accent `text-[#A855F7]`
  - Cards `bg-[#0A0A1A]`
  - Font display: Space Grotesk (`font-display`)
  - Font mono: JetBrains Mono (`font-mono-ui`)
- Lucide icons (`lucide-react`) — NUNCA emojis em UI
- shadcn/ui components base
- Acessibilidade WCAG 2.1 AA

### Arquitetura
- Server Components por padrão; Client Components só pra interatividade
- Server Actions pra mutations (não API routes pra forms internos)
- API Routes pra webhooks externos (`/api/webhooks/*`)
- Supabase: SSR via `@supabase/ssr` (createServerClient + createBrowserClient)
- Imagens via Next/Image + Supabase Storage CDN

### Pagamentos
- AbacatePay PIX como provedor V1
- Validar webhook com `ABACATEPAY_WEBHOOK_SECRET` (HMAC)
- Status flow: `pendente` → `pago` (libera saldo) ou `expirado` / `cancelado`
- Idempotência: webhook duplicado não duplica saldo

### Discord
- OAuth via Supabase (não implementar do zero)
- Bot separado em `bot/` (Node.js + Discord.js)
- Bot lê DB Supabase via service role key
- Slash commands registrados no servidor

### Git
- Branches: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- NUNCA commitar `.env`, secrets, ou Supabase service role key
- PR pra qualquer mudança — sem push direto na main

## Variáveis de Ambiente

Ver `.env.example` (criar baseado nesse template):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# AbacatePay
ABACATEPAY_API_KEY=
ABACATEPAY_WEBHOOK_SECRET=

# OpenDota (opcional, free)
OPENDOTA_API_KEY=

# Resend
RESEND_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_SITE_URL=
```

## Comandos

```bash
pnpm dev          # dev server local
pnpm build        # build produção
pnpm typecheck    # tipos
pnpm lint         # eslint
pnpm db:gen-types # gera types/database.ts via Supabase CLI

cd bot && pnpm dev  # bot Discord local
```

## Testing

- Validar manualmente fluxo end-to-end antes de deploy
- Testar webhook AbacatePay com sandbox antes de produção
- Bot Discord testado em servidor de teste antes de mover pro oficial

## References

- `PRD.md` — requisitos completos
- `ARCHITECTURE.md` — decisões técnicas (criar conforme avança)
- `TASKS.md` — backlog
- [OpenDota API](https://docs.opendota.com/)
- [AbacatePay docs](https://docs.abacatepay.com)
- [Discord.js v14](https://discordjs.guide)
- [Supabase Auth Discord](https://supabase.com/docs/guides/auth/social-login/auth-discord)

## Skills Locais

Quando relevante, use os skills do plugin GSD do Claude Code (já instalado):
- `engineering:architecture` — pra ADRs
- `engineering:debug` — pra investigar bugs
- `engineering:code-review` — antes de fazer PR
- `data:sql-queries` — pra queries Supabase complexas

## Permissões

### Sem aprovação (autonomous)
- Fix typescript errors
- Refactor pra reduzir tamanho de arquivo
- Adicionar testes
- Atualizar deps minor/patch

### Com aprovação Pedro
- Mudanças em `packages` (preço, qtd) — sempre alinhar antes
- Schema changes (migrations)
- Mudanças em billing/payments
- Deploy produção
- Adicionar deps majores
