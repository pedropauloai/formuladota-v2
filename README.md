# formuladota v2

> Plataforma de mentoria Dota 2 em tempo real com Pedro Paulo (Immortal/Top 0.5%).

## O que é

Site onde clientes:
1. Logam com Discord
2. Compram pacotes de partidas com Pedro (R$ 10/partida)
3. Agendam horários
4. Jogam ranked junto com Pedro (mentoria em tempo real)
5. Acompanham progressão (MMR, stats, conquistas)

Bot Discord integrado pra `/perfil`, `/saldo`, `/agendar` + notificações.

## Status

🚧 **Em construção** — MVP previsto pra 7 dias após início.

## Documentação

- 📋 [`PRD.md`](./PRD.md) — Product Requirements Document completo
- 🤖 [`CLAUDE.md`](./CLAUDE.md) — Instruções pro Claude Code
- 📐 `ARCHITECTURE.md` — Decisões técnicas (em construção)
- ✅ `TASKS.md` — Backlog (em construção)

## Quickstart Dev

```bash
# Clone + install
pnpm install

# Setup env
cp .env.example .env.local
# preencher Supabase, Discord, AbacatePay keys

# Run dev
pnpm dev

# Bot Discord (terminal separado)
cd bot && pnpm dev
```

## Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Auth**: Discord OAuth via Supabase
- **Pagamentos**: AbacatePay (PIX)
- **Stats Dota**: OpenDota API
- **Bot**: Discord.js v14 (Node)
- **Hosting**: Vercel (web) + Railway (bot)

## Features V1 (MVP)

- ✅ Discord OAuth login
- ✅ Catálogo de pacotes (avulso e mensal)
- ✅ Checkout PIX via AbacatePay
- ✅ Agendamento de partidas (calendário)
- ✅ Histórico de partidas + stats
- ✅ Bot Discord (`/perfil`, `/saldo`, `/agendar`)
- ✅ Painel admin pro Pedro

## Pricing inicial

| Pacote | Tipo | Preço |
|---|---|---|
| Avulsa (1 partida) | avulso | R$ 10 |
| Pacote 5 | avulso | R$ 50 |
| Pacote 10 | avulso | R$ 100 |
| Mentoria mensal (8 partidas + 2 sessões) | mensal | R$ 100 |

> Pricing escala naturalmente conforme demanda apertar.

## Por que esse projeto

Pedro saiu do Dota em nov/2025 por burnout. Construir esse sistema permite:
- **Voltar parcialmente ao Dota** sem comunidade aberta tóxica
- **Receita adicional** sem dependência total
- **Lives 2-3h/dia max** (vs 8h+ antes)
- **Distância profissional via produto digital**
- **Caso público** de construção com Claude Code

Detalhes da decisão estratégica: [Conflito - voltar ou não pro Dota (Obsidian)](../../segundo-cerebro/10%20-%20Pessoal/Conflitos/Voltar%20ou%20nao%20voltar%20pro%20Dota.md)

## Contato

Pedro Paulo — pedropauloaitech@gmail.com
- 🐦 [@PedroPauloAI](https://x.com/PedroPauloAI)
- 💼 [pedropauloai.vercel.app](https://pedropauloai.vercel.app)
- 🐙 [github.com/pedropauloai](https://github.com/pedropauloai)
