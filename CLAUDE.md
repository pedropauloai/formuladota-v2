# formuladota v2 — Claude Code Instructions

## Project

**formuladota v2** é o **app da comunidade FormulaDota** — uma cultura competitiva de Dota 2 liderada por Pedro Paulo (Immortal/Top 0.5%). A plataforma é uma máquina de doutrinação e conversão de mentalidade: quiz de doutrina em 4 Pilares, sistema de progressão por níveis, lobbies (livre + elite Imortal), partidas "ranked com PRO" via fichas PIX, e identidade pública anti-anonimato. **A cultura é o produto; o Dota é o terreno.**

📋 **Fontes da verdade, em ordem:** ler **`docs/foundations/index.md`** primeiro (índice de 1 linha por doc — padrão LLM Wiki: seguir só os links relevantes pra tarefa, não varrer a pasta) → `.planning/ROADMAP.md` + `STATE.md` → migrations em `supabase/migrations/`. O `PRD.md` na raiz é o documento ORIGINAL (loja de mentoria 1-1) e foi **sobrescrito em escopo** pelos pivôs de maio/2026 — usar só como contexto histórico.

### Constraints
- **Tech Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase + Discord OAuth + Mercado Pago (PIX) + Discord.js bot
- **Deploy**: produção em formuladota-v2.vercel.app (git-connected)
- **Persona**: jogador Dota 2 brasileiro comprometido, de qualquer bracket
- **Pricing**: ficha de vaga = **R$ 10 fixo** (pricing descentralizado por PRO foi REVERTIDO em 2026-06-02, migration 041). Split 85/10/5. Mudança de preço = aprovação Pedro.
- **Gates de acesso**: criar sala = assinatura ativa; entrar em lobby = nível 6 (doutrinado) OU ≥1 permissão de partida; lobby elite = assinatura + Imortal Valve + Místico nv30. Lógica centralizada em `src/lib/` e enforced por RLS/funções SQL.
- **Maintainability**: Pedro é não-dev. Código deve ser legível, comentários em português onde não-óbvio

## Workflow Recomendado

Este projeto usa **GSD plugin (Get Shit Done)**. Para qualquer trabalho:

```bash
/gsd-execute-phase
```

Fases e status atuais: ver `.planning/ROADMAP.md` (as "6 fases do PRD" original foram superadas pelos pivôs — não seguir aquela sequência).

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

### UI — Hierarquia de design (LEI, decidida por Pedro 2026-06-11)

A identidade visual tem DUAS leis complementares — não confundir:

1. **ESTRUTURA, LAYOUT e DENSIDADE = cliente Dota 2 real.** Sistema A: coluna esquerda de identidade+amigos, top tabs, sidebar direita contextual, bottom-bar com [JOGAR DOTA] verde. Denso e compacto, NÃO arejado estilo SaaS. Referência canônica: `docs/foundations/DOTA2_CLIENT_REFERENCE.md` (catálogo das 9 imagens na raiz). NÃO é Riot/Valorant minimalista.
2. **PELE (cores, materiais, tipografia) = brand FormulaDota**, definida EXCLUSIVAMENTE pelos tokens em `src/styles/tokens/raw.css` + `semantic.css`: vermelho `#C42121` (ExitLag), verde play/success `#00C466` (GamersClub), neutros escuros ExitLag (`#0B0C0F`/`#111317`), dourado pra números/destaques (família gold), Ubuntu (body) + Teko condensed (nav, títulos, números). Radius 2px (quase reto). Essas referências (ExitLag/GamersClub) foram escolha INTENCIONAL do Pedro — não "corrigir" pra outra paleta.

PROIBIDO (causam regressão visual):
- Paleta cyberpunk cyan `#00F0FF` / roxo `#A855F7` — era do portfólio pedropauloai, NÃO pertence a este projeto. Se encontrar, migrar pra tokens.
- Cores/durations/z-index hardcoded em componentes — sempre via tokens semânticos (regras C14-C20 em `docs/foundations/DESIGN_LANGUAGE.md`).
- Avatares `rounded-full` — avatar de usuário é SEMPRE quadrado `rounded-sm` (padrão Steam/Dota). Dots de presença podem ser redondos.

Demais regras:
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
- **Mercado Pago PIX** como provedor (AbacatePay foi substituído — referências legadas podem existir em docs antigos)
- Validar webhook com `MP_WEBHOOK_SECRET` (HMAC via `verifyMpWebhookSignature`)
- Status flow: `pendente` → `pago` (libera saldo) ou `expirado` / `cancelado`
- Idempotência: webhook duplicado não duplica saldo
- Lib canônica: `src/lib/mercadopago/` (a pasta — o arquivo `src/lib/mercadopago.ts` é legado em consolidação)

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

Ver `.env.example` na raiz — é a fonte da verdade das variáveis (Supabase, Discord, Mercado Pago `MP_*`, OpenDota, app). Não duplicar a lista aqui.

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
- Testar webhook Mercado Pago com sandbox (`TEST-` token) antes de produção
- Bot Discord testado em servidor de teste antes de mover pro oficial

## References

- `docs/foundations/` — 20 docs fundacionais (fonte da verdade de produto e design)
- `PRD.md` — requisitos ORIGINAIS (histórico, sobrescrito pelos pivôs)
- [OpenDota API](https://docs.opendota.com/)
- [Mercado Pago docs](https://www.mercadopago.com.br/developers)
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
