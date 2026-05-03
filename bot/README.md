# FORMULADOTA Bot — Steam Lobby Creator (Phase 5)

Bot Steam que roda 24/7 em Railway Hobby (~$3/mês). Cria lobbies Dota 2 customizados via Game Coordinator (GC), captura match_id ao final, comunica com app FORMULADOTA via API interna key-auth.

## Setup Pedro (manual — uma vez)

### 1. Conta Steam dedicada

**NÃO use a conta pessoal do Pedro** — conta dedicada protege.

1. Criar conta Steam nova (não-Pedro pessoal): https://store.steampowered.com/join/
2. Comprar Dota 2 (free) + 1 jogo R$ 1-5 (anti-botting policy Steam exige conta paga)
3. **Maturar 30+ dias** — login esporádico, jogar 1-2 partidas, evitar lock
4. Habilitar **Steam Guard Mobile** — ESSENCIAL pra TOTP
5. Extrair `shared_secret` + `identity_secret` do app Steam Mobile (jailbreak/root necessário, OU usar SDA — Steam Desktop Authenticator)

### 2. Variáveis de ambiente Railway

No painel Railway, criar projeto FORMULADOTA-BOT e setar:

```bash
STEAM_ACCOUNT_NAME=formuladota_bot
STEAM_PASSWORD=...                  # senha conta Steam dedicada
STEAM_SHARED_SECRET=...             # base64 do shared_secret (TOTP)
SUPABASE_URL=https://nyvbfdsxjpiwgdroptdi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...       # mesmo key do app Next
BOT_API_KEY=<openssl rand -hex 32>  # gera novo, copia tambem pro app .env como BOT_API_KEY
```

### 3. Volume persistente

Criar volume Railway montado em `/data` — armazena refresh tokens (200d JWT Steam).

### 4. Deploy inicial

```bash
cd bot
git push railway main           # ou via UI Railway "Connect repo"
```

Primeiro boot vai logar com password+TOTP, gerar refresh token, salvar em volume. Próximos boots usam refresh token automaticamente.

### 5. Atualizar app Next .env.local + Vercel

Adicionar:
```
BOT_API_URL=https://formuladota-bot-production.up.railway.app
BOT_API_KEY=<mesmo gerado acima>
```

## API endpoints

### POST /lobby/create
Cria lobby Dota 2 no GC.

**Headers:** `Authorization: Bearer ${BOT_API_KEY}`

**Body:**
```json
{
  "lobbyId": "<uuid lobbies row>",
  "name": "FORMULADOTA #123",
  "password": "abc12345",
  "gameMode": "all_pick"
}
```

**Response:**
```json
{ "ok": true, "steamLobbyId": "104242..." }
```

### POST /lobby/capture-match
Captura match_id ao final + atualiza row `lobbies.dota_match_id`.

**Body:**
```json
{ "lobbyId": "<uuid>" }
```

### GET /health
Health check Railway. Retorna 200 se Steam+Dota GC conectados.

## Custo

- Railway Hobby: $5/mês inclui 500h compute + 100GB egress (mais que suficiente)
- Steam: gratuito (após maturação inicial)
- Total: ~R$ 13/mês

## Pendências Pedro

1. ☐ Criar conta Steam dedicada (não-Pedro)
2. ☐ Comprar Dota 2 free + 1 jogo R$ 1-5
3. ☐ Maturar 30+ dias
4. ☐ Habilitar Steam Guard Mobile
5. ☐ Extrair `shared_secret` via SDA
6. ☐ Criar projeto Railway + volume `/data`
7. ☐ Setar env vars no Railway
8. ☐ Deploy inicial
9. ☐ Adicionar `BOT_API_URL` + `BOT_API_KEY` em `.env.local` do app + Vercel prod
10. ☐ Smoke test: criar lobby via UI app `/criar-lobby` → confirmar lobby aparece no Dota 2 client

## Notas técnicas

- **Sentry hash deprecated** — ecossistema atual usa refresh JWT (200 dias) via `steam-user` v5
- **`createPracticeLobby`** — node-dota2 API
- **GC reconnection** — `steam-user.autoRelogin: true` + `dota.on('unready')` segue tentando
- **Multiple bots V2** — pra escalar, criar pool de bots com round-robin (V2)
