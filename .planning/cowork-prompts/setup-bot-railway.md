# Prompt Cowork — Deploy Bot Steam FORMULADOTA no Railway

> **Cole tudo abaixo no Cowork.** O agente vai executar o setup end-to-end do bot Steam que cria/gerencia lobbies Dota 2 pra plataforma FORMULADOTA.
>
> **Antes de iniciar, Pedro precisa fornecer ao Cowork:**
> 1. Credenciais Steam da conta dedicada (já maturada): `STEAM_ACCOUNT_NAME`, `STEAM_PASSWORD`
> 2. Acesso ao Steam Desktop Authenticator (SDA) instalado no PC pra extrair `shared_secret`
> 3. Login no Railway (`https://railway.com`) — Pedro faz login interativo no browser quando solicitado

---

## Contexto do projeto

Você está trabalhando no repositório `C:\Users\ADM\projects\formuladota-v2` — uma plataforma web FORMULADOTA (HUB de comunidade Dota 2 estilo GamersClub). O bot Steam vive em `bot/` (Node.js + steam-user + node-dota2) e precisa ser deployado no Railway pra funcionar end-to-end.

**Branch:** `main`
**Tech do bot:** Node 22, TypeScript, Supabase service-role client, HTTP API key-auth.
**Custo Railway:** ~$5/mês (Hobby plan).

## Tarefa principal

Deploy do bot pra produção e configuração das integrações:
- Setup conta Railway + projeto + volume `/data` + env vars
- Extrair `STEAM_SHARED_SECRET` via SDA (TOTP da conta dedicada)
- Atualizar `.env.local` do app Next com `BOT_API_URL` + `BOT_API_KEY`
- Smoke test end-to-end

## Passo a passo

### Passo 1 — Extrair `STEAM_SHARED_SECRET` via SDA

Pedro já tem Steam Desktop Authenticator instalado e a conta dedicada importada.

1. Pergunta ao Pedro: "Qual o caminho do diretório `maFiles/` do SDA no seu PC?" (geralmente `C:\Program Files\Steam Desktop Authenticator\maFiles\` ou `~/SDA/maFiles/`)
2. Lista arquivos `.maFile` nesse diretório — deve haver 1 por SteamID
3. Identifica qual é da conta dedicada (Pedro confirma o `Steam_login_name` dentro do JSON)
4. Lê o JSON e extrai o valor de `shared_secret` (string base64)
5. Salva esse valor temporariamente — vai usar no Passo 4

**⚠ Crítico:** o valor `revocation_code` no mesmo JSON é a única forma de recuperar a conta se o SDA quebrar. Pergunta ao Pedro se ele já fez backup desse valor em local seguro (1Password, arquivo offline). Se ainda não, **insiste** que ele faça antes de prosseguir.

### Passo 2 — Login Railway via CLI

```powershell
# Instala Railway CLI se ainda não tem
npm install -g @railway/cli

# Login (vai abrir browser — Pedro faz auth manual)
railway login
```

Confirma sucesso: `railway whoami` retorna o email do Pedro.

### Passo 3 — Criar projeto Railway + linkar repo

```powershell
cd C:\Users\ADM\projects\formuladota-v2\bot
railway init
# Quando perguntar "Project name", usa: formuladota-bot
# Quando perguntar "Empty project ou Deploy from GitHub", escolhe GitHub
```

Se o `railway init` não aceitar repo GitHub via CLI, faz manual no browser:
1. Abre https://railway.com/new
2. Click "Deploy from GitHub repo"
3. Seleciona `pedropauloai/formuladota-v2`
4. **Root Directory:** `bot/` (CRÍTICO — senão Railway vai tentar buildar o app Next)
5. Branch: `main`

### Passo 4 — Setar env vars no Railway

```powershell
cd C:\Users\ADM\projects\formuladota-v2\bot
railway link  # se ainda não está linkado

# Gera nova BOT_API_KEY (64 chars hex)
$BOT_API_KEY = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "BOT_API_KEY gerada: $BOT_API_KEY"
# Salva esse valor — vai usar tambem no .env.local do app

# Pega valores do .env.local do app (ler arquivo)
# SUPABASE_URL=https://nyvbfdsxjpiwgdroptdi.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=<copia do .env.local>

# Setar todas envs no Railway:
railway variables --set "STEAM_ACCOUNT_NAME=<pergunta_ao_pedro>"
railway variables --set "STEAM_PASSWORD=<pergunta_ao_pedro>"
railway variables --set "STEAM_SHARED_SECRET=<extraido_no_passo_1>"
railway variables --set "STEAM_DATA_DIR=/data"
railway variables --set "SUPABASE_URL=https://nyvbfdsxjpiwgdroptdi.supabase.co"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=<copia_do_env_local>"
railway variables --set "BOT_API_KEY=$BOT_API_KEY"
railway variables --set "PORT=8080"
```

**⚠ Pergunta ao Pedro:**
- `STEAM_ACCOUNT_NAME`: login da conta Steam dedicada (não pode ser conta pessoal)
- `STEAM_PASSWORD`: senha da conta Steam dedicada
- O resto pega dos arquivos.

### Passo 5 — Criar Volume `/data` no Railway

Volume armazena o refresh JWT (200 dias) — sem ele, todo restart precisa de TOTP.

Via dashboard (CLI Railway não suporta volumes ainda):
1. https://railway.com/project/<seu-id>/service/<seu-id>
2. Settings → Volumes → New Volume
3. Mount Path: `/data`
4. Size: 1 GB

### Passo 6 — Deploy

```powershell
cd C:\Users\ADM\projects\formuladota-v2\bot
railway up
```

Monitora logs via `railway logs --deployment` ou no dashboard.

**Espera por:**
- `[steam] logged on as <account>` — Steam login OK
- `[dota] GC connection ready` — Game Coordinator conectado
- `[bot] HTTP API listening :8080` — pronto pra receber requests

**Se falhar:**
- `Steam login timeout` → `STEAM_SHARED_SECRET` errado, valida o base64 do maFile
- `EBUSY/locked` → conta logada em outro lugar; faz logoff do Steam client local
- Outros erros → pega trace completo em `railway logs` e reporta

### Passo 7 — Pegar URL pública + atualizar `.env.local` do app

```powershell
railway domain  # gera domínio se ainda não tem
# Copia URL retornada (ex: https://formuladota-bot-production.up.railway.app)
```

Edita `C:\Users\ADM\projects\formuladota-v2\.env.local` adicionando ao final (não substituir conteúdo existente):

```
# Phase 5 — Bot Steam Railway
BOT_API_URL=https://<url-do-railway>.up.railway.app
BOT_API_KEY=<MESMO valor do passo 4>
```

### Passo 8 — Smoke test end-to-end

```powershell
cd C:\Users\ADM\projects\formuladota-v2
pnpm dev
```

Pedro abre no browser:
1. http://localhost:3000/dashboard
2. Click botão verde **JOGAR**
3. Click "Salas Personalizadas" → "Criar"
4. Preenche nome + modo → "Criar sala"
5. Confirma: a sala criada deve ter `steamLobbyId` real (não `DEV-xxx`)
6. Pedro abre Dota 2 com sua conta pessoal (não a dedicada)
7. Salão de Jogos → Salas Personalizadas → busca pelo nome ou senha do lobby
8. Entra na sala — bot deve estar lá hospedando
9. (Opcional) Pedro entra num slot na web → bot deve enviar invite GC pro Dota 2

## Critérios de sucesso

- [ ] Railway logs mostram `[steam] logged on` + `[dota] GC connection ready`
- [ ] Endpoint `https://<url>/health` retorna `{ ok: true, steam: true, dota: true }`
- [ ] Criação de lobby na UI retorna `steamLobbyId` real
- [ ] Lobby aparece no client Dota 2 (Salão de Jogos → Salas Personalizadas)
- [ ] `.env.local` atualizado com `BOT_API_URL` + `BOT_API_KEY`

## Reportar de volta ao Pedro

Quando terminar, reporta:
1. URL pública do Railway (`BOT_API_URL`)
2. Status final dos logs (resumo: bot online?)
3. Smoke test resultado (lobby criado real OU erro específico)
4. `BOT_API_KEY` gerada (Pedro vai querer guardar — confirma que está no `.env.local` E no Railway)
5. Se algum passo falhou, qual e por quê

## Caveats / segurança

- **Nunca** commita `STEAM_PASSWORD`, `STEAM_SHARED_SECRET`, `BOT_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` no git. Tudo isso fica só em `.env.local` (já no `.gitignore`) e no Railway dashboard.
- A `STRATZ_API_KEY` que Pedro adicionou no `.env.local` foi compartilhada num chat anterior — sugere que ele revogue e gere nova em `stratz.com/api` (não bloqueia o setup do bot).
- Steam pode pedir confirmação por email no primeiro login do bot a partir de IP novo (Railway). Se aparecer, Pedro confirma no email da conta dedicada.
