# formuladota — PROJECT.md

> Vision canônica pós-pivô estratégico (2026-05-01).
> Substitui o framing original do PRD ("plataforma de mentoria 1-1 com Pedro").

## Core value

**Hub de comunidade Dota 2 brasileira** estilo GamersClub do CS — onde jogadores pagam mensalidade pra acessar partidas in-house criadas por bot Steam, jogam com pessoas alinhadas culturalmente (doutrina aceita obrigatoriamente), competem em temporadas com ranking + premiação, e podem opcionalmente comprar serviços de coaching de profissionais credenciados.

## Diferencial

| Concorrente | Diferencial formuladota |
|---|---|
| meta-liga.ggarena.pro | **Cultura doutrinada** (14 princípios + 10 anti-padrões + sistema progressivo de moderação). Eles têm liga técnica pura; nós temos liga técnica + comportamental. |
| GamersClub (CS) | **Foco Dota 2 brasileiro** + Pedro Paulo Immortal/Top 0.5% + metodologia validada (Fórmula do Dota de Corrida) |
| Mentoria avulsa de coaches | **Marketplace** — múltiplos coaches credenciados pelo Pedro, não dependência de 1 pessoa |

## Modelo de negócio

- **Mensalidade R$ 47,00/mês** via AbacatePay subscription (PIX recorrente nativo `POST /v2/subscriptions/create`, cycle MONTHLY, auto-renovação via webhook `subscription.renewed`)
- **Trial 7 dias grátis** pra ativar (precisa Steam vinculado pra criar/entrar lobby)
- **Sem mensalidade ativa = read-only** (browse ranking, ver perfis, mas não pode criar/entrar lobby)
- **Mentoria/serviços de coach** são produto secundário — Pedro é coach #1, schema pronto pra V2 admitir outros coaches (Pedro concede role)
- **Premiação por temporada**: placeholder no DB (`prize_pool` em `seasons`). Pedro busca patrocinadores, configura depois. UI mostra "patrocínio em breve"

## Identidade técnica do user

Cada usuário no formuladota tem múltiplas identidades vinculadas:
- **Discord OAuth** (auth primário, comunidade) — já implementado
- **Steam OAuth** (identidade gamer obrigatória pra criar/entrar lobby) — Phase 3
- **Outras redes opcionais** futuras (YouTube, Twitch, X) — anti-smurf cross-validation V2

## Roles

| Role | Permissões |
|---|---|
| `admin` | Pedro. CRUD tudo, concede/revoga roles, configura temporadas, define `prize_pool`. |
| `coach` (futuro V2) | Cria pacotes próprios (mentoria, lobby coletivo, análise de replay). Recebe split via plataforma. |
| `player` (default) | Mensalidade ativa → cria/entra lobby. Compra pacote de coach específico. Sobe ranking. |

## Stack atual (preservada)

- Next.js 16 + React 19 + Tailwind v4 + TypeScript strict
- Supabase (PostgreSQL + Auth Discord + RLS)
- AbacatePay (PIX avulso entregue Phase 2 + subscription Phase 4)
- Resend transactional emails (idempotencyKey)
- shadcn/ui base
- Cyberpunk theme (cyan #00F0FF + purple #A855F7 + dark #050505)

## Stack a adicionar

- **`steam-user` v5 + `steam-totp` + `node-dota2`** — bot lobby Dota 2 em Docker headless (Railway Hobby ~$3/mês)
- **Stratz GraphQL** — match stats pós-partida (Tier 1 free 2000 req/h)
- OpenDota Premium **mantido** como fallback / source secundária
- Steam OpenID 2.0 — auth complementar

## Validated Requirements

Movidos pra `## Validated Requirements` conforme phases entregam:

### Validated in Phase 1: Foundation
- F1.1 Discord OAuth via Supabase
- F1.2 Profile (discord_id, email, username)
- F1.4 Pedro `is_admin = true`

### Validated in Phase 1.5: Doutrina
- F1.5 Aceite doutrinário obrigatório versionado
- §11 Sistema progressivo (advertência → suspensão → banimento)

### Validated in Phase 2: Catalog & Checkout
- F2.1, F2.2 Catálogo público de pacotes
- F3.1-F3.5 Checkout PIX avulso end-to-end (idempotência via `external_payment_id`)
- C8 HMAC validation, C9 idempotência

## Active Requirements (Milestone V2 — HUB)

Definidos em `.planning/REQUIREMENTS.md` e referenciados em `.planning/ROADMAP.md`. Resumo:

- **H1** (Hub-Steam): Steam OAuth + sistema de roles + multi-coach schema
- **H2** (Hub-Subscription): Mensalidade AbacatePay subscription + trial 7d + RLS gate
- **H3** (Hub-Lobby): Bot Steam cria lobby Dota 2 in-house + matchmaking interno
- **H4** (Hub-League): Sistema de temporadas + MMR interno + ranking
- **H5** (Hub-Badges): Tiers Herald→Immortal × 5 estrelas, badges cyberpunk reskinned
- **H6** (Hub-Dashboards): Painel admin (Pedro gerencia tudo) + painel player (status, matches, ranking)
- **H7** (Hub-Polish): Header/footer global, landing reformulada, deploy Vercel + DNS

## Current State

- **Phase 1, 1.5, 2 — concluídas** (auth Discord, doutrina, checkout PIX avulso)
- **Phase 2 → modo "loja de coaches"** — refator multi-coach na Phase 3 (schema com `coaches` table + `packages.coach_id`)
- **Milestone V2 — HUB iniciando** (Phase 3 em planejamento)

Last updated: 2026-05-01
