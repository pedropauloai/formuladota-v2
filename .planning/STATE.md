# formuladota v2 — Project State

> Estado atual do projeto. Atualizado conforme phases avançam.

## Stack atual

| Layer | Tech | Versão | Status |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | ✓ |
| UI lib | React | 19.0.0 | ✓ |
| Lang | TypeScript | 5.9 strict | ✓ |
| CSS | Tailwind CSS | v4 (beta) | ✓ |
| DB / Auth | Supabase | postgres-js 2.x | ✓ |
| Auth provider | Discord OAuth | via Supabase | ✓ |
| Payments | AbacatePay PIX (V2) | sandbox | ⏳ Phase 2 |
| Email | Resend | onboarding@resend.dev | ⏳ não usado ainda |
| Stats | OpenDota Premium | $0.01/100 calls | ⏳ Phase 5 |
| Bot | Discord.js v14 | — | ⏳ Phase 4 |
| Hosting app | Vercel | conectado ao GitHub | ⏳ Phase 6 |

## Phases completas

- ✓ **Phase 1** — Foundation (Discord OAuth, schema base, RLS, login funcional)
- ✓ **Phase 1.5** — Doutrina (aceite obrigatório, sistema progressivo advertência → suspensão → banimento, /codigo-de-conduta, /onboarding/doutrina, telas /suspended e /banned, middleware enforcement)

## Phase corrente

- ◆ **Phase 2** — Catalog & Checkout (em planejamento)

## Migrations Supabase aplicadas

| # | Arquivo | Conteúdo |
|---|---|---|
| 001 | initial_schema.sql | profiles, packages, purchases, availability_windows, matches, sessions, user_stats + triggers |
| 002 | rls_policies.sql | 25 policies, RLS ativo em todas tables |
| 003 | seed_packages.sql | 4 pacotes (R$10/50/100/100) + 7 janelas Pedro 19h-22h |
| 004 | doctrine_and_moderation.sql | doctrine_versions, user_warnings, behavior_status_log, trigger 3-strikes, helpers RLS |

Projeto Supabase: `nyvbfdsxjpiwgdroptdi` em `sa-east-1`.

## Repositório

- GitHub: `pedropauloai/formuladota-v2` (privado)
- Branch: `main`
- 5 commits, último: `2dfd1be` — UAT gap closure

## Contas externas configuradas

- Discord: app `formuladota` (1499631204100604025), bot `MTQ5OTYz...`, guild `303265529433686017` — bot **ainda não instalado** no servidor (pendência Pedro)
- AbacatePay sandbox: API key + webhook secret (HMAC) prontos
- Resend: API key, domínio `formuladota.com` não verificado (usar `onboarding@resend.dev`)
- OpenDota: Premium key, sem rate limits
- Vercel: GitHub linkado, deploy não acionado ainda
- Hostinger: domínio `formuladota.com` ativo (DNS no Route 53)

## Cultura / Doutrina (norte do produto)

Texto canônico em `A FÓRMULA DO DOTA DE CORRIDA.txt` na raiz. Estruturado em `src/lib/doctrine.ts` (14 princípios + 10 anti-padrões + 3-strikes config).
Aceite obrigatório bloqueia rotas privadas (middleware + RLS).

## Decisões fundadoras (locked)

- Discord-first auth (não Steam-first) — Steam vira tabela paralela em V1.5
- Pricing R$10/partida começando — sobe com demanda (PRD §5)
- Limite hardcoded 3 partidas/dia (proteção burnout Pedro)
- Sessões sempre via Discord
- Aceite doutrinário obrigatório, violações geram advertência → suspensão → banimento

## Open questions

- Domínio formuladota.com: DNS no Route 53 ainda não configurado pra Vercel
- 200 imortais como meta histórica vs 2026 — revalidar com Pedro
- Bot Discord no servidor — pendência Pedro instalar
