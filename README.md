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

## Webhook Local Dev (Phase 2 — AbacatePay PIX)

Para testar fluxo de pagamento end-to-end localmente, você precisa de um tunnel HTTP→localhost porque AbacatePay (na nuvem) não consegue alcançar `http://localhost:3000` diretamente.

Usamos [smee.io](https://smee.io) — não exige conta, sem rate limit em dev.

### Setup (uma vez)

1. Acesse [smee.io](https://smee.io) e clique **Start a new channel**. Ele vai gerar uma URL única tipo `https://smee.io/abc123XYZ`.
2. No dashboard da AbacatePay (sandbox), crie um webhook:
   - **Endpoint URL**: a URL que o smee.io te deu acima
   - **Secret**: gere uma string aleatória e salve em `ABACATEPAY_WEBHOOK_SECRET` no seu `.env.local`
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

1. `ABACATEPAY_WEBHOOK_SECRET` no `.env.local` bate exatamente com o secret configurado no dashboard AbacatePay.
2. Você está usando `request.text()` ANTES de qualquer `JSON.parse` (parsear muda o body e quebra a assinatura — ver Pitfall 2 em `.planning/phases/02-catalog-checkout/02-RESEARCH.md`).

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
