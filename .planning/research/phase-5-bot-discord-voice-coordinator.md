# Phase 5 — Bot Discord Voice Coordinator (modelo real)

> **Modelo confirmado 2026-05-24 (Pedro):** Bot NÃO cria lobby Dota custom. Coordena
> voice channels Discord enquanto party joga ranked oficial Valve. Stack: discord.js v14 +
> Node.js + Railway hospedagem. Sem Steam GC, sem node-dota2.

> **Status:** Implementado (Wave 7 — 2026-05-24)

---

## 1. Goal técnico

Bot Discord coordena voice channels (sala geral + temp) durante fluxo de fila. PRO e alunos
jogam Dota ranked oficial Valve normalmente — o bot apenas organiza a comunicação de voz
no Discord enquanto isso acontece.

**Por que NÃO lobby in-house custom V1:**
O lobby in-house custom exige conta Steam bot, node-dota2 (arquivado), e dependência do
Game Coordinator da Valve (instável). Para V1 com 1 PRO e grupos de 4 alunos, custo de
infra não justifica. Lobby in-house custom fica como opção futura para quando houver massa
crítica de PROs ativos justificando liga própria FormulaDota separada da Valve.

**Stack:**
- discord.js v14 + express + zod
- Node.js 20 + TypeScript
- Railway Hobby (~$3/mês) — pasta `bot/` standalone

---

## 2. Diagrama de fluxo (texto)

```
[FILA]
  Jogadores entram em fila na plataforma web → status 'waiting'
  Bot: garante que sala geral Discord existe (cria on-demand se não existir)
  Se user tem discord_id vinculado: bot move automaticamente pra sala geral

[SALA GERAL — pré-partida]
  PRO entra na sala geral, conversa com alunos, confirma presença
  Fila atinge 4 alunos confirmados

[INICIAR PARTIDA — PRO clica no painel /pro]
  PRO seleciona 4 alunos + define nome custom da sala temp
  Server Action → HTTP POST → bot API
  Bot cria voice channel temporário (nome custom)
  Bot tenta mover 5 users (PRO + 4 alunos) pra sala temp
  match_session inserida com status='in_match' + voice_channel_id_discord

[JOGO — Dota client oficial]
  Party de 5 se forma manualmente no Dota 2 client
  PRO convida alunos pelo Steam
  Fila ranked Valve — partida acontece normalmente
  Bot NÃO interfere nesta etapa

[FINALIZAR PARTIDA — PRO clica no painel]
  PRO informa dota_match_id (captura no client pós-partida)
  Plataforma valida via OpenDota API:
    - 4+ dos 5 SteamIDs realmente estão na partida
    - Partida é recente (< 4h)
  Se válido: match marcada como 'realizada'
  Fichas consumidas (trigger existente consume_pt_fichas)
  HTTP DELETE → bot API: move users de volta pra sala geral + apaga sala temp

[CLEANUP]
  Quando fila fica vazia + sem matches ativas:
  HTTP DELETE /api/general-room → bot apaga sala geral
```

---

## 3. Endpoints HTTP do bot (auth: INTERNAL_API_KEY header)

```
GET  /health
  response: { ok: true, discord: true, guildId: "..." }

POST /api/general-room/ensure
  body: {}
  response: { channelId: "...", existed: bool, created: bool }
  ação: garante que sala geral existe (cria se não existir)

DELETE /api/general-room
  ação: apaga sala geral (PRE-CONDITION: sem matches ativas + fila vazia)

POST /api/match-room/create
  body: { customName: string, userDiscordIds: string[] }
  response: { channelId: "...", movedCount: number }
  ação: cria voice channel temp + move users pra lá

DELETE /api/match-room/:channelId
  ação: move users de volta pra sala geral + apaga voice channel temp
```

---

## 4. Server Actions na plataforma

- `startCoordinatedMatch` — valida alunos, cria match_session, chama bot
- `finishCoordinatedMatch` — valida OpenDota match_id, consome fichas, chama bot cleanup

---

## 5. OpenDota validation

Após PRO informar dota_match_id:
1. Fetch `api.opendota.com/api/matches/{match_id}`
2. Converter SteamID 64-bit → 32-bit (OpenDota usa account_id 32-bit)
3. Verificar que >= 4/5 participantes esperados estão na partida
4. Verificar que match.start_time é recente (< 4h)
5. Se OpenDota retornar 404: aceitar mas marcar dota_match_id_verified=false

---

## 6. Migration 033 — colunas adicionadas em matches

```sql
ALTER TABLE matches ADD COLUMN IF NOT EXISTS voice_channel_id_discord text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS voice_channel_name text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS dota_match_id_verified boolean DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS voice_channel_archived_at timestamptz;
```

*Nota: dota_match_id já existia na tabela matches desde migrations anteriores.*

---

## 7. Estrutura do bot

```
bot/
├── package.json           # discord.js@^14, express, dotenv, zod
├── tsconfig.json
├── Dockerfile
├── railway.toml
├── .env.example
├── README.md
└── src/
   ├── index.ts            # bot login + HTTP server
   ├── discord/
   │   ├── client.ts       # Discord client setup (intents)
   │   ├── general-room.ts # ensureGeneralRoom / destroyGeneralRoom
   │   ├── match-room.ts   # createMatchRoom / destroyMatchRoom
   │   └── move-users.ts   # moveUser helper
   ├── api/
   │   ├── server.ts       # express HTTP server
   │   ├── middleware/
   │   │   └── auth.ts     # validate INTERNAL_API_KEY
   │   └── routes/
   │       ├── general-room.ts
   │       └── match-room.ts
   └── types.ts            # Zod schemas
```

---

## 8. UAT (critérios de validação)

- [ ] `GET /health` retorna `{ ok: true }` quando bot está conectado ao Discord
- [ ] `POST /api/general-room/ensure` cria canal se não existir; retorna existed=true se já existir
- [ ] `DELETE /api/general-room` apaga canal com sucesso
- [ ] `POST /api/match-room/create` cria canal temp + retorna channelId
- [ ] `DELETE /api/match-room/:channelId` apaga canal (move users se presente)
- [ ] startCoordinatedMatch valida PRO ativo + 4 alunos em fila com fichas
- [ ] finishCoordinatedMatch valida OpenDota match_id (participant overlap)
- [ ] pnpm typecheck zero erros na plataforma
- [ ] cd bot && pnpm tsc --noEmit zero erros

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| OpenDota indexing delay (2-10 min pós-partida) | PRO aguarda alguns minutos antes de clicar Finalizar; se 404, plataforma aceita mas marca verified=false |
| User não vinculou Discord → bot não consegue mover | Bot tenta mover; se falhar (user não está em voice), ignora silenciosamente |
| discord.js breaking changes | Versão pinada em package.json; atualizar em branch separada |
| Railway downtime | Bot stateless — restart automático; match continua no Dota normalmente |

---

*Spec criada 2026-05-24 — substituiu phase-5-bot-steam-philosophy-aligned.md*
*Implementado em Wave 7 (Bot Discord V1 + OpenDota validation + /pro modals)*
