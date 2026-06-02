# formuladota — PROJECT.md

> Vision canônica pós-pivô estratégico (2026-05-01).
> Substitui o framing original do PRD ("plataforma de mentoria 1-1 com Pedro").

## Decisão de nomenclatura & alvo de plataforma (2026-06-02)

> **"HUB" foi aposentado como termo.** Em docs, código e comunicação, a palavra oficial pro formato do produto é **"app" / "aplicativo"** — o termo do dia a dia que o público de Dota 2 brasileiro usa hoje. "Client/launcher" foi descartado: o vocabulário morreu na transição Garena → Steam e soa técnico/datado pra comunidade atual.

**Hierarquia de identidade:**
> **FormulaDota** (marca) → é um **app** (formato) → com uma **comunidade** dentro (times, torneios, amigos, etc.) → e a *alma* vive numa **tagline** (memória afetiva do Garena: *"o lugar onde a galera do Dota 2 brasileiro se reencontra"*). O Garena é gancho de marketing, **não** nome da categoria.

**Alvo de plataforma — multiplataforma:**
- **Web** (atual) — Next.js, ponto de entrada hoje.
- **App nativo desktop** (visão V3) — launcher estilo Steam/Discord via Tauri.
- **App mobile** (desejado por Pedro, 2026-06-02) — versão para celular. Forma/escopo a definir (PWA, React Native, ou Tauri mobile). Toda decisão de produto/UX daqui pra frente considera viabilidade mobile.

**Foco estratégico atual:** MVP fichas **praticamente finalizado** (só faltam ajustes que virão de testes/uso real). Próxima frente = **features de comunidade**: torneios, times, lobbies in-house, sistema de busca/matchmaking. Isso encerra a oscilação "MVP fichas vs HUB" — as duas convivem; fichas entregue, comunidade é o próximo norte.

## Core value

**App de comunidade Dota 2 brasileira** estilo GamersClub do CS — onde jogadores pagam mensalidade pra acessar partidas in-house criadas por bot Steam, jogam com pessoas alinhadas culturalmente (doutrina aceita obrigatoriamente), competem em temporadas com ranking + premiação, e podem opcionalmente comprar serviços de coaching de profissionais credenciados.

## Diferencial

| Concorrente | Diferencial formuladota |
|---|---|
| meta-liga.ggarena.pro | **Cultura doutrinada** (14 princípios + 10 anti-padrões + sistema progressivo de moderação). Eles têm liga técnica pura; nós temos liga técnica + comportamental. |
| GamersClub (CS) | **Foco Dota 2 brasileiro** + Pedro Paulo Immortal/Top 0.5% + metodologia validada (Fórmula do Dota de Corrida) |
| Mentoria avulsa de coaches | **Marketplace** — múltiplos coaches credenciados pelo Pedro, não dependência de 1 pessoa |

## Modelo de negócio

- **Mensalidade R$ 47,00/mês** via **Mercado Pago Pix Automático** (preapproval API com `payment_method_id=pix`). **MUDANÇA pós-decisão Pedro 2026-05-02:** descartada abordagem AbacatePay PIX Manual via Cron (que era fallback porque AbacatePay subscription nativa é CARD-only). Pix Automático foi lançado pelo Bacen em junho/2025 — débito automático recorrente em PIX, autorizado uma vez pelo user. Sem cron mensal, sem QR manual. MCP Mercado Pago oficial adicionado (`https://mcp.mercadopago.com/mcp`), pendente autenticação OAuth. Plans Phase 4 antigos (PIX Manual) ARQUIVADOS.
- ~~Trial 7 dias grátis~~ — REMOVIDO em discuss-phase 2026-05-02 (decisão Pedro). Sem trial em V1. Possível reintrodução V2.
- **Sem mensalidade ativa = read-only** (browse ranking, ver perfis, mas não pode criar/entrar lobby)
- **Cancel flow híbrido**: user cancela → `cancelled_at` set, mas mantém acesso até fim do período pago (`next_due_at`). Padrão SaaS justo. Cron não gera novo PIX pra subscriptions cancelled.
- **Inadimplência**: subscription com `next_due_at` passou e webhook completed não veio em 5 dias → status `overdue` (cron sweep). User reativa manual em `/assinatura` (cria novo PIX). Sem auto-retry V1.
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
- ~~Cyberpunk theme cyan/purple~~ → **Brand vermelho/preto/branco** (rebrand 2026-05-02 pós-receber logos oficiais Pedro). Cor vermelha exata derivada via color picker do `LOGO HORIZONTAL PRINCIPAL PRETO.png`. Phase 3.5 implementa.
- **Brand string:** **FORMULADOTA** (maiúsculo, sem acento) em toda UI/email — nunca "Fórmula Dota"
- **Sem menção "Pedro Paulo" em UI** — admin implícito, não pessoa pública. Bio coach fica genérica ("Coach Immortal Top 0.5%")

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

## Current Milestone: v2.5 Design Foundations — AAA Game Client Experience

**Goal:** Estabelecer constituição visual permanente + design system completo implementado, transformando FormulaDota de web app cyberpunk genérico em verdadeiro game client AAA, ANTES de qualquer nova UI.

**Target features:**
- 6 documentos fundacionais permanentes em `docs/foundations/` (VISUAL_PHILOSOPHY, UX_PRINCIPLES, MOTION_SYSTEM, SOUND_SYSTEM, PRODUCT_CORE, DESIGN_LANGUAGE)
- Design system completo em código (tokens cores/typography/spacing/motion/sound + motion primitives + sound primitives + layout system)
- 5-7 componentes base AAA-grade (Button, Card, Modal/Dialog, Toast, HeroVideo, QueueCard/MatchCard)
- Deep research em `.planning/research/` (clients AAA referência + tech stack libs)

**Key context (pivô 2026-05-23):**
- Pausa MVP fichas (memory `project_mvp_fichas.md` 2026-05-21) e Phase 4 Mercado Pago até pelo menos os Design Tokens (F3) entregarem.
- Phase 3.5 antiga (Rebrand Dota 2 raso) DEPRECADA — absorvida e expandida por este milestone. Research preservado em `.planning/phases/_deprecated/03.5-rebrand-dota2-visual-superseded-by-v2.5-design-foundations/`.
- Phase 4 Mercado Pago PAUSADA em `.planning/phases/_paused/04-mercadopago-migration/`.
- Refs obrigatórias: Dota 2 client, Steam, Battle.net, Riot Client, FACEIT, CS2 UI, Discord, Path of Exile, Diablo IV, MMO launchers.
- Estética PROIBIDA: SaaS startup, excesso de cards/grid/widgets, landing-page vibe, vibecoding.
- Estética OBRIGATÓRIA: sistema vivo, atmosfericidade, clareza de ação principal, UX cinematográfica, software premium.
- Docs vivem em `docs/foundations/` (raiz do repo, máxima visibilidade).
- Estimativa: 7-10 dias.

## Current State (atualizado 2026-06-02)

- **Milestone V1 — concluído** (Phase 1, 1.5, 2): auth Discord, doutrina, checkout PIX avulso.
- **Milestone V2.5 — Design Foundations — CONCLUÍDO** (8 phases, design system AAA, Sistema A canônico).
- **Milestone V2.6 — Player Identity + Social (Phase 9) — CONCLUÍDO**: perfil estilo client Dota 2, amigos + presence realtime, dashboard customizável, catálogo 127 heróis.
- **MVP fichas — praticamente finalizado**: pricing descentralizado por PRO (floor R$10, teto por tier HONOR), split de receita PRO 85% / sponsor 10% / plataforma 5%. Ajustes finais virão de testes/uso real.
- **Próximo norte — features de comunidade**: torneios, times, lobbies in-house, sistema de busca/matchmaking. (Schemas V2 já preservados no DB desde o pivô.)
- **Phase 4 (Mercado Pago mensalidade)** segue pausada — reavaliar se mensalidade entra junto das features de comunidade ou depois.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

Last updated: 2026-06-02 — terminologia "app" travada (HUB aposentado), versão mobile adicionada ao alvo de plataforma, MVP fichas concluído, próximo norte = features de comunidade (torneios/times/lobbies/busca)
