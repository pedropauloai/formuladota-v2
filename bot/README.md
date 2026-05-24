# FORMULADOTA Discord Bot (Phase 5)

Coordena voice channels Discord enquanto PRO e alunos jogam ranked Valve oficial.

O bot NÃO cria lobby Dota custom. Apenas organiza comunicação de voz no servidor Discord.

## Modelo de funcionamento

1. Sala geral (`FORMULADOTA — Fila`) — criada on-demand quando fila abre, apagada quando vazia
2. Sala temp (ex: `Sessao Sabado 19h`) — criada pelo PRO no painel ao iniciar partida, apagada ao finalizar

## Rodar local

```bash
cd bot
cp .env.example .env
# Preencha .env com DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, INTERNAL_API_KEY
pnpm install
pnpm dev
```

Verificar health:

```bash
curl http://localhost:8080/health
```

## Deploy no Railway

1. Criar projeto no [Railway](https://railway.app)
2. Conectar repositório, apontar para pasta `bot/`
3. Selecionar `Dockerfile` como builder (ou usar `railway.toml`)
4. Configurar variáveis de ambiente (ver `.env.example`)
5. Railway usa `railway.toml` para healthcheck automático

Custo estimado: ~$3-5/mês (Railway Hobby Plan)

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Sim | Token do bot (Discord Developer Portal → Applications) |
| `DISCORD_GUILD_ID` | Sim | ID do servidor Discord (clicar com direito no servidor → Copiar ID) |
| `INTERNAL_API_KEY` | Sim | Chave compartilhada com a plataforma Next.js (`openssl rand -hex 32`) |
| `PORT` | Nao | Porta HTTP (padrao: 8080) |
| `DISCORD_VOICE_CATEGORY_ID` | Nao | ID da categoria onde as salas sao criadas (deixar vazio = raiz do servidor) |

## Como configurar na plataforma (Next.js)

Adicionar ao `.env.local` e no Vercel:

```
BOT_API_URL=https://formuladota-bot-production.up.railway.app
BOT_INTERNAL_API_KEY=<mesmo valor de INTERNAL_API_KEY acima>
```

## Endpoints HTTP

Todas as rotas (exceto `/health`) exigem header `x-api-key: <INTERNAL_API_KEY>`.

```
GET  /health
  Verifica se bot esta conectado ao Discord e guild disponivel.

POST /api/general-room/ensure
  Garante que sala geral existe. Cria se nao existir.
  Resposta: { channelId, existed, created }

DELETE /api/general-room
  Apaga sala geral. Chamar apenas quando fila vazia + sem matches ativas.

POST /api/match-room/create
  Body: { customName: string, userDiscordIds: string[] }
  Cria voice channel temp + move usuarios pra la.
  Resposta: { channelId, movedCount }

DELETE /api/match-room/:channelId
  Move usuarios de volta pra sala geral + apaga canal temp.
  Resposta: { deleted }
```

## Permissoes necessarias no Discord

O bot precisa das seguintes permissoes no servidor:

- `View Channels` — ver canais
- `Manage Channels` — criar e apagar voice channels
- `Move Members` — mover usuarios entre voice channels

Configure no Discord Developer Portal → Applications → Bot → Permissions.
