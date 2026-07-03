# FORMULADOTA

> O app da comunidade **FORMULADOTA** — uma cultura competitiva de Dota 2 liderada por Pedro Paulo (Immortal / Top 0.5%). **A cultura é o produto; o Dota é o terreno.**

Plataforma web (com desktop e mobile no horizonte) que funciona como uma máquina de doutrinação e conversão de mentalidade: o jogador aprende a **Fórmula** (a doutrina competitiva), prova que absorveu, e só então destrava jogar em lobbies com a comunidade — subindo num ranking próprio, com identidade pública e reputação atrelada.

Produção: **[formuladota.com](https://formuladota.com)**

## Como funciona (o loop)

1. **Entra** com Discord e vincula a Steam — identidade pública, **anti-anonimato** (1 Steam = 1 identidade, anti-smurf).
2. **Doutrina** — um quiz em **4 Pilares** (estilo Duolingo: erra → explica → exige acertar). Chegar ao **nível 6** = *doutrinado*.
3. **Destrava jogar** — entrar em lobby exige ser doutrinado **ou** ter permissão de partida (5 acertos no quiz = 1 permissão).
4. **Joga** — matchmaking por skill forma partidas 5×5 (lobby livre + lobby elite Imortal); um bot cria a sala no Dota e convida os 10.
5. **Sobe** — cada partida move o **MMR FORMULADOTA** (Elo + desempenho medido do replay), reseta por temporada, e no topo vira leaderboard de Imortais.
6. **Placar pós-jogo completo** — 12 abas estilo OpenDota/STRATZ (visão geral, MMR, performance, gráficos, builds, combate, mapas, **presença/heatmap**, teamfights, objetivos, draft, benchmarks), com destaque de **MVP** e explicação transparente de como o MMR mudou.

Partidas premium ("ranked com PRO") usam **fichas de vaga (R$ 10 fixo, PIX)**. Conduta é pública: quem viola a doutrina vai pro **Mural da Vergonha**.

## Stack

- **Web** — Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui
- **Backend** — Supabase (Postgres + Auth + Storage), RLS em todas as tabelas
- **Auth** — Discord OAuth via Supabase; vínculo Steam para identidade competitiva
- **Pagamentos** — Mercado Pago (PIX), webhook validado por HMAC
- **Stats Dota** — OpenDota API (enrich do replay parseado)
- **Bots** — Discord.js v14 (`bot/`) + worker Steam/Dota GC com node-steam-user (`bot-steam/`)
- **Hosting** — Vercel (web, git-connected) + Railway (os dois bots, deploy automático)

## Arquitetura

Três serviços, todos com deploy automático ao dar push na `main`:

- **`/` (web)** — Next.js na Vercel. Server Components por padrão; Server Actions para mutations; API Routes só para webhooks externos.
- **`bot/`** — bot Discord (slash commands, notificações), lê o DB via service role.
- **`bot-steam/`** — worker que cria a sala no Dota via Game Coordinator: pega um lobby confirmado, cria a partida, convida os 10, lança, e grava `dota_match_id` de volta.

A lógica de acesso (gates de nível, permissões, assinatura) é centralizada em `src/lib/` e reforçada por RLS e funções SQL.

## Documentação

Fontes da verdade, em ordem:

1. **[`docs/foundations/index.md`](./docs/foundations/index.md)** — índice dos docs fundacionais de produto e design (padrão LLM Wiki: siga só os links relevantes).
2. **`.planning/ROADMAP.md`** + **`.planning/STATE.md`** — fases e estado atual.
3. **`supabase/migrations/`** — o schema é a verdade final.
4. **[`CLAUDE.md`](./CLAUDE.md)** — instruções e convenções para desenvolvimento assistido.

> `PRD.md` na raiz é o documento **original** (loja de mentoria 1-1) e foi sobrescrito em escopo pelos pivôs de 2026 — serve só como contexto histórico.

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # preencher Supabase, Discord, Mercado Pago (MP_*), OpenDota
pnpm dev                     # web em localhost:3000

cd bot && pnpm dev           # bot Discord (terminal separado)
cd bot-steam && pnpm bot     # worker Steam/GC (terminal separado)
```

`.env.example` é a fonte da verdade das variáveis de ambiente.

## Comandos

```bash
pnpm build          # build de produção
pnpm typecheck      # tipos (tsc --noEmit)
pnpm lint           # eslint
pnpm db:gen-types   # gera types/database.ts via Supabase CLI
pnpm gen:heroes     # regenera catálogo de heróis (idem gen:items, gen:abilities)
```

## Convenções

TypeScript strict (zero `any`), funções ≤ 50 linhas, arquivos ≤ 300 linhas, early return. Zod em todo input de API/Server Action. RLS obrigatória. Cores/tokens de design vêm de `src/styles/tokens/` — nunca hardcoded. Conventional Commits, PR para qualquer mudança (sem push direto na `main`). Detalhes em [`CLAUDE.md`](./CLAUDE.md).

## Contato

Pedro Paulo — [@PedroPauloAI](https://x.com/PedroPauloAI) · [github.com/pedropauloai](https://github.com/pedropauloai)
