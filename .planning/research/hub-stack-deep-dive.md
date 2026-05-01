# Hub Stack — Deep Dive Research

**Data:** 2026-04-30
**Domínio:** AbacatePay subscriptions, node-dota2 produção, Stratz GraphQL
**Confiança geral:** MEDIUM (AbacatePay HIGH via docs oficiais; node-dota2 MEDIUM via GitHub/npm; Stratz MEDIUM via fontes secundárias — API GraphQL bloqueada para fetch direto)

---

## Resumo Executivo

Três perguntas críticas para o pivô HUB do formuladota foram investigadas. A descoberta mais importante: **AbacatePay tem assinatura recorrente nativa com PIX** (`subscription.completed` / `subscription.renewed`), mas **usa checkout hospedado** (redireciona para URL AbacatePay) — sem opção "transparent" embedded como no PIX avulso. Para mensalidade R$ 47, isso é aceitável: o cliente é redirecionado uma vez para pagar o primeiro ciclo, e as renovações são automáticas. Para o bot Steam, a stack recomendada é `steam-user` + `steam-totp` + `node-dota2` com refresh tokens persistidos em volume Docker — o sentry hash foi substituído por JWT de ~200 dias. Para stats pós-partida, Stratz GraphQL é superior ao OpenDota para dados de rank progression, mas ambos complementam bem.

**Recomendação primária:** Usar AbacatePay Subscription nativo para a mensalidade. Bot Steam em Railway Hobby (~R$ 13/mês total). Stratz para rank data, OpenDota como fallback.

---

## 1. AbacatePay V2 — Billing Recorrente / Subscription

### 1.1 Existe assinatura nativa? Sim, mas com limitação importante.

**EXISTE.** AbacatePay tem produtos de assinatura com ciclos:
- `WEEKLY` | `MONTHLY` | `SEMIANNUALLY` | `ANNUALLY`

**LIMITAÇÃO CRÍTICA:** Assinaturas usam **Checkout hospedado** (página na AbacatePay) — não existe opção "Transparent" embedded para assinaturas como existe para PIX avulso. O cliente é redirecionado para `data.url` (domínio AbacatePay) para completar o primeiro pagamento.

**Renovações:** Após o primeiro pagamento, **o sistema renova automaticamente** conforme o ciclo. O cliente não precisa re-autorizar todo mês. A AbacatePay dispara webhook `subscription.renewed` a cada renovação bem-sucedida.

**Taxa:** R$ 0,80 por parcela (mesma do PIX avulso) — sem adicional de recorrência.

### 1.2 Fluxo de implementação

**Passo 1 — Criar Produto no Dashboard AbacatePay:**

Não há endpoint de criação de produto na API V2 (gerenciado pelo dashboard). Configurar manualmente:
- Nome: "FormulaDota HUB Mensal"
- Preço: R$ 47,00 (4700 centavos)
- Ciclo: `MONTHLY`
- O dashboard retorna um `prod_xxxx` ID — salvar esse ID.

**Passo 2 — Criar Checkout de Assinatura via API:**

```
POST https://api.abacatepay.com/v2/subscriptions/create
Authorization: Bearer {ABACATEPAY_API_KEY}
Content-Type: application/json
```

**Payload:**
```json
{
  "items": [
    {
      "id": "prod_xxxx",
      "quantity": 1
    }
  ],
  "externalId": "subscription-{user_id}",
  "completionUrl": "https://formuladota.com/hub/ativo",
  "returnUrl": "https://formuladota.com/hub",
  "methods": ["PIX"],
  "metadata": {
    "userId": "{user_uuid}",
    "plano": "hub-mensal"
  }
}
```

**Resposta:**
```json
{
  "data": {
    "id": "bill_abc123xyz",
    "externalId": "subscription-{user_id}",
    "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
    "amount": 4700,
    "status": "PENDING",
    "items": [{"id": "prod_xxxx", "quantity": 1}],
    "createdAt": "2026-04-30T..."
  },
  "success": true
}
```

**Passo 3 — Redirecionar cliente para `data.url`:**

O formuladota cria o checkout → redireciona o user para `data.url`. Usuário paga na página AbacatePay → é redirecionado para `completionUrl` após pagamento. Diferente do Transparent PIX (QR Code inline), aqui há redirecionamento.

### 1.3 Webhooks de Assinatura — nomes exatos

| Evento | Quando dispara | Ação no banco |
|--------|---------------|---------------|
| `subscription.completed` | Assinatura ativada (primeiro pagamento pago) | Criar `subscription` com status `ativa`, liberar acesso HUB |
| `subscription.renewed` | Renovação mensal paga com sucesso | Atualizar `next_billing_at`, manter acesso ativo |
| `subscription.cancelled` | Assinatura cancelada | Marcar como `cancelada`, revogar acesso |

**Payload padrão de todos os eventos:**
```json
{
  "event": "subscription.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_abc123",
      "status": "ACTIVE",
      "canceledAt": null
    },
    "customer": {
      "email": "...",
      "name": "..."
    },
    "checkout": {
      "externalId": "subscription-{user_id}"
    }
  }
}
```

**Observação:** O `externalId` que passamos no create (`subscription-{user_id}`) fica disponível em `data.checkout.externalId` nos webhooks — usar para identificar qual usuário ativou.

### 1.4 Alternativa: PIX manual mensal (se rejeitar checkout hospedado)

Se Pedro não quiser redirecionar para página AbacatePay para a mensalidade, a alternativa é **PIX manual mensal**:

1. Todo dia 1 do mês: Vercel Cron gera Transparent PIX (`/v2/transparents/create`) para cada assinante ativo
2. Envia email via Resend com QR Code e link
3. Usuário paga manualmente até dia 5
4. Webhook `transparent.completed` ativa mais um mês
5. Não-pagou até dia 5: suspender acesso

**Trade-off:**
- Subscription nativa: automático, sem fricção, mais profissional — mas redireciona para página AbacatePay uma vez
- PIX manual: zero redirecionamento mas exige ação do usuário todo mês + infra de cron + tratamento de inadimplência

**Recomendação:** Usar subscription nativa. O redirecionamento para AbacatePay é aceitável para pagamento mensal (não é transação frequente). Economia de infra e complexidade.

### 1.5 Schema DB sugerido para subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  abacatepay_subscription_id TEXT UNIQUE,  -- subs_abc123
  status TEXT NOT NULL DEFAULT 'pendente',  -- pendente | ativa | cancelada | expirada
  started_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: user pode ver própria subscription; service_role atualiza via webhook
```

---

## 2. node-dota2 — Setup de Produção 24/7

### 2.1 Stack correta (2026)

O ecossistema evoluiu. A stack atual não usa mais "sentry hash" como o research antigo sugeria. O módulo moderno é:

| Pacote | Versão | Papel |
|--------|--------|-------|
| `steam-user` | ^5.x (DoctorMcKay) | Login Steam + comunicação com rede Steam |
| `steam-totp` | ^2.1.0 (DoctorMcKay) | Gera código TOTP automaticamente do `shared_secret` |
| `node-dota2` | ^5.x (Arcana) ou fork `dotabod/node-dota2-fork` | Protocolo Game Coordinator Dota 2 |
| `steam-session` | ^2.x (DoctorMcKay) | Gerencia refresh tokens de longa duração |

**Repositório principal:** `steam-user` de `DoctorMcKay` é o mais ativo e mantido (não o `node-steam` antigo).

### 2.2 Steam Guard / 2FA — como funciona em produção

**Sentry hash está deprecated.** O mecanismo moderno são **refresh tokens** (JWTs Steam válidos por ~200 dias).

**Fluxo de setup inicial (único, manual):**

1. Criar conta Steam dedicada
2. Instalar Steam no desktop e habilitar Steam Guard Mobile (obter `shared_secret` e `identity_secret`)
3. O `shared_secret` é a chave TOTP — gerar código com `steam-totp`
4. Fazer primeiro login com `steam-user`, fornecer `twoFactorCode` gerado pelo `steam-totp`
5. `steam-user` recebe e emite evento `refreshToken` — salvar esse JWT em arquivo/env
6. Próximos logins: usar apenas o `refreshToken` (sem exigir TOTP novamente até ~200 dias)

**Código de setup:**

```javascript
// setup-once.js — rodar manualmente na primeira vez
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');

const client = new SteamUser({ dataDirectory: '/data/steam' });

const code = SteamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET);

client.logOn({
  accountName: process.env.STEAM_ACCOUNT_NAME,
  password: process.env.STEAM_PASSWORD,
  twoFactorCode: code,
});

client.on('refreshToken', (token) => {
  // Salvar este token! Válido por ~200 dias
  require('fs').writeFileSync('/data/steam/refresh_token.txt', token);
  console.log('Refresh token salvo. Usar em STEAM_REFRESH_TOKEN.');
  client.logOff();
});
```

**Login em produção (sem interação manual):**

```javascript
// bot/src/steam.js — login de produção
const SteamUser = require('steam-user');
const fs = require('fs');

const client = new SteamUser({
  dataDirectory: '/data/steam',      // volume Docker persistente
  renewRefreshTokens: true,          // renova automaticamente
  autoRelogin: true,                 // reconecta se cair
});

const refreshToken = fs.readFileSync('/data/steam/refresh_token.txt', 'utf8').trim();

client.logOn({ refreshToken });

client.on('loggedOn', () => {
  console.log('Steam logado como', client.steamID);
});

client.on('refreshToken', (newToken) => {
  // Persiste token renovado
  fs.writeFileSync('/data/steam/refresh_token.txt', newToken);
});

client.on('error', (err) => {
  console.error('Steam erro:', err.message);
  // Implementar retry com backoff exponencial
});
```

### 2.3 Variáveis de ambiente necessárias para bot Steam

```
STEAM_ACCOUNT_NAME=formuladota_bot
STEAM_PASSWORD=...
STEAM_SHARED_SECRET=...      # Base64 — necessário apenas pro setup inicial e TOTP
STEAM_REFRESH_TOKEN=...      # JWT gerado no primeiro login — primário em produção
```

**Segurança:** `STEAM_SHARED_SECRET` dá controle total da conta. Armazenar em Railway environment vars (não commitar). O `STEAM_REFRESH_TOKEN` pode ser rotacionado periodicamente.

### 2.4 Estrutura do projeto — separar do Next.js

```
formuladota-v2/
├── src/                     # Next.js (existente)
├── bot/                     # Bot Steam (SEPARADO)
│   ├── package.json
│   ├── src/
│   │   ├── index.js         # Entry point
│   │   ├── steam.js         # Login + reconexão Steam
│   │   ├── dota.js          # Game Coordinator Dota 2
│   │   ├── lobby.js         # Criação e gestão de lobbies
│   │   └── db.js            # Supabase service_role para ler/escrever
│   ├── Dockerfile           # Deploy Railway independente
│   └── .env.example
```

**Por que separar:** Node.js + Discord.js já ficará no `bot/`. O bot Steam tem runtime diferente (UDP/TCP Steam network), deps pesadas (protobuf), e falhas que não devem afetar o app Next.js.

### 2.5 Comandos node-dota2 para lobbies

```javascript
const Dota2 = require('dota2');

const dota = new Dota2.Dota2Client(steamClient, true, false);
dota.launch();

dota.on('ready', () => {
  // GC conectado — pode criar lobbies
  
  // 1. Criar lobby
  dota.createPracticeLobby({
    game_name: `FormulaDota #${sessionId}`,
    pass_key: gerarSenhaAleatoria(),
    server_region: Dota2.ServerRegion.SOUTHAMERICA,
    game_mode: Dota2.GameMode.DOTA_GAMEMODE_AP, // All Pick
    visibility: Dota2.LobbyVisibility.DOTA_LOBBY_VISIBILITY_PUBLIC,
    allow_spectating: true,
    fill_with_bots: false,
  }, (result) => {
    console.log('Lobby criado, lobby_id:', dota.Lobby.lobby_id.toString());
  });
  
  // 2. Configurar opções adicionais
  // dota.configPracticeLobby(lobbyId, options, callback)
  
  // 3. Monitorar jogadores entrando
  dota.on('practiceLobbyUpdate', (lobby) => {
    // lobby.members — lista de slots ocupados
    // lobby.game_state — estado atual
    // lobby.match_id — disponível QUANDO partida começa (não antes)
  });
  
  // 4. Iniciar partida quando todos prontos
  dota.launchPracticeLobby();
  
  // 5. Capturar match_id — estratégia
  // O match_id fica disponível em lobby.match_id assim que a partida começa
  // Bot deve FICAR NO LOBBY até a partida terminar para capturar resultado
  // Alternativa: usar OpenDota/Stratz para buscar match depois pelo steamid do bot
});

// 6. Após partida terminar — lobby.game_state vai para estado 5 (POSTGAME)
// Usar match_id capturado + OpenDota/Stratz para buscar stats completos
```

### 2.6 Captura de match_id — estratégia definitiva

**Problema:** O bot precisa ficar conectado ao lobby até o jogo terminar para receber o `match_id` via `practiceLobbyUpdate`. Se o bot desconectar antes, perde o match_id.

**Estratégia recomendada para formuladota:**

1. Bot fica no lobby como espectador (slot spectator, não joga)
2. Escuta `practiceLobbyUpdate` — quando `game_state` mudar para pós-jogo (estado 5), `match_id` está disponível em `lobby.match_id`
3. Salva `match_id` no DB (`sessions.match_id`)
4. Usa OpenDota/Stratz para buscar stats completos depois (com delay de 5-10min para parse)

**Fallback simples:** Pedro insere match_id manualmente no painel admin. Para V1, isso é aceitável — a URL da página de resultados do Dota 2 contém o match_id.

### 2.7 Checklist — conta Steam dedicada

| Item | Detalhe |
|------|---------|
| Conta nova | Criar em store.steampowered.com — email dedicado (não pessoal) |
| Dota 2 instalado | Gratuito — ativar pela loja. Bot conecta via protocolo, não instala jogo |
| Steam Guard Mobile | Obrigatório para produção — ativar 2FA, anotar `shared_secret` |
| Idade mínima recomendada | 30+ dias antes de usar intensamente (reduz flags de new account) |
| Jogo comprado | Recomendado ter 1 jogo comprado (~US$1 qualquer jogo) — eleva trust level da conta. Sem compras, conta tem restrições de trading e comunidade |
| Nome neutro | Não usar "formuladota-bot" — nome genérico de jogador |
| Não usar conta do Pedro | Jamais. Se o bot for banido, a conta vai junto |
| Restrições new account (Dota 2) | Contas novas têm "Custom Game Restricted" até completarem ~30 partidas. Lobby privado de prática pode ser afetado — testar antes de produção |

**Importante sobre "Custom Game Restricted":** Valve aplica restrições em contas novas no Arcade. Lobbies de prática padrão (não custom game) parecem ser menos afetados, mas a conta bot deve ter histórico mínimo antes de ser usada em produção.

### 2.8 Hosting — decisão de custo

**Comparativo (preço mensal para container Node.js 256MB RAM, 24/7):**

| Plataforma | Custo estimado | Complexidade ops | Melhor para |
|------------|---------------|-----------------|-------------|
| **Railway Hobby** | ~$5/mês (inclui créditos) + uso | Zero config, push e roda | V1 — desenvolvimento ativo |
| **Fly.io** | ~$3-5/mês (micro VM 256MB) | fly.toml, Docker-native | V1 alternativa |
| **Hetzner CX11** | ~€3,49/mês (VPS dedicado) | SSH, Docker self-managed | V2+ — mais controle e barato |

**Recomendação para Pedro (não-dev):**

**Railway** para começar. Custo real para container 256MB RAM rodando 24/7:

```
RAM: 0.25 GB × $0.000231/GB·min × 43.200 min/mês ≈ $2,50/mês
CPU: mínimo (bot é IO-bound, não CPU-bound) ≈ $0,50-1,00/mês
Total estimado: $3-4/mês — dentro dos $5 de crédito do plano Hobby
```

Se ultrapassar $5/mês, paga apenas o excedente. Para um bot leve, os créditos cobrem.

**Dockerfile mínimo para Railway:**

```dockerfile
FROM node:22-alpine
WORKDIR /app

# Deps
COPY bot/package*.json ./
RUN npm ci --only=production

# Código
COPY bot/src ./src

# Volume para dados Steam persistentes
VOLUME ["/data/steam"]

CMD ["node", "src/index.js"]
```

**railway.json:**

```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### 2.9 Failure modes e respostas

| Falha | Causa | Resposta |
|-------|-------|---------|
| Steam logout / timeout | Sessão expirou, rede instável | `autoRelogin: true` reconecta automaticamente. Refresh token válido ~200 dias |
| GC offline | Valve maintenance | Retry com backoff exponencial. Dota GC costuma voltar em minutos. Logar em tabela `bot_events` |
| Conta banida (Game Ban) | Valve detectou botting excessivo | Fallback manual — Pedro cria lobby na mão. Ter conta backup. Mitigação: rate limit de lobbies criados |
| Refresh token expirado (~200 dias) | JWT venceu | Railway alert via webhook + email. Pedro roda `setup-once.js` novamente para gerar novo token |
| `practiceLobbyUpdate` não dispara | GC instável | Timeout de 30min → marcar sessão como `sem_match_id`, Pedro insere manualmente |

---

## 3. Stratz GraphQL API — Queries de Stats Pós-Partida

### 3.1 Autenticação

**Obter token:**
1. Acessar `https://stratz.com/api`
2. Fazer login com conta Steam
3. Seção "My Tokens" → copiar token (Bearer JWT)

**Usar no header:**
```
Authorization: Bearer {STRATZ_TOKEN}
```

**Endpoint GraphQL:** `https://api.stratz.com/graphql`

**Explorador interativo:** `https://api.stratz.com/graphiql` (acesso via browser com token)

### 3.2 Rate Limits por tier

| Tier | Como obter | Limite por hora | Limite por dia |
|------|-----------|----------------|----------------|
| Default (Tier 1) | Login no Stratz.com | 2.000 req/hora | — |
| Individual (Tier 2) | Solicitar via Stratz | 4.000 req/hora | 20.000/dia |
| Multi-Token (Tier 3) | Solicitar (projetos multi-machine) | Ilimitado | 100 req/usuário/dia |

**Para formuladota:** Tier 1 (Default) é mais que suficiente. Uma partida = 1 query. Com max 3 partidas/dia, uso de 3 req/dia.

**Latência:** Stratz usa seu próprio parser (SkadiStats/Clarity) + inhouse. Dados ficam disponíveis ~5-15min após partida terminar (parse de replay). Não é instantâneo.

### 3.3 Query GraphQL para match stats completo

```graphql
# Endpoint: POST https://api.stratz.com/graphql
# Header: Authorization: Bearer {token}

query MatchDetails($matchId: Long!) {
  match(id: $matchId) {
    id
    didRadiantWin
    durationSeconds
    startDateTime
    gameMode
    lobbyType
    
    players {
      steamAccountId
      isRadiant
      position
      heroId
      kills
      deaths
      assists
      networth
      goldPerMinute
      experiencePerMinute
      numLastHits
      heroDamage
      towerDamage
      heroHealing
      
      # MMR / rank
      steamAccount {
        id
        name
        avatar
        rankTier        # rank_tier em int (e.g. 80 = Immortal, 75 = Divine 5)
        leaderboardRank # posição no leaderboard (Immortal)
      }
      
      # Itens finais (6 slots + neutral)
      item0Id
      item1Id
      item2Id
      item3Id
      item4Id
      item5Id
      backpack0Id
      backpack1Id
      backpack2Id
      neutral0Id
    }
  }
}
```

**Variáveis:**
```json
{
  "matchId": 7936401234
}
```

**Resposta parcial esperada:**
```json
{
  "data": {
    "match": {
      "id": 7936401234,
      "didRadiantWin": true,
      "durationSeconds": 2340,
      "startDateTime": 1746000000,
      "players": [
        {
          "steamAccountId": 123456789,
          "isRadiant": true,
          "heroId": 1,
          "kills": 8,
          "deaths": 2,
          "assists": 12,
          "networth": 24500,
          "steamAccount": {
            "rankTier": 75,
            "leaderboardRank": null
          },
          "item0Id": 1,
          "item1Id": 36,
          ...
        }
      ]
    }
  }
}
```

**Implementação TypeScript:**

```typescript
// src/lib/stratz.ts
const STRATZ_ENDPOINT = 'https://api.stratz.com/graphql';

interface StratzMatchPlayer {
  steamAccountId: number;
  isRadiant: boolean;
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  networth: number;
  goldPerMinute: number;
  steamAccount: {
    rankTier: number | null;
    leaderboardRank: number | null;
    name: string;
  };
  item0Id: number;
  item1Id: number;
  item2Id: number;
  item3Id: number;
  item4Id: number;
  item5Id: number;
}

interface StratzMatch {
  id: number;
  didRadiantWin: boolean;
  durationSeconds: number;
  startDateTime: number;
  players: StratzMatchPlayer[];
}

export async function getMatchDetails(matchId: number): Promise<StratzMatch | null> {
  const query = `
    query MatchDetails($matchId: Long!) {
      match(id: $matchId) {
        id
        didRadiantWin
        durationSeconds
        startDateTime
        players {
          steamAccountId
          isRadiant
          heroId
          kills
          deaths
          assists
          networth
          goldPerMinute
          steamAccount {
            name
            rankTier
            leaderboardRank
          }
          item0Id item1Id item2Id item3Id item4Id item5Id
        }
      }
    }
  `;

  const response = await fetch(STRATZ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRATZ_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { matchId } }),
  });

  if (!response.ok) return null;

  const json = await response.json() as { data?: { match: StratzMatch } };
  return json.data?.match ?? null;
}
```

### 3.4 MMR Change — como estimar

**Importante:** Dota 2 mudou para sistema Glicko em 2023. **Não existe mais MMR fixo de +25/-25**. O ganho/perda varia por:
- Rank confidence do jogador (calibrado vs não-calibrado)
- Ranks dos outros jogadores na partida
- Performance relativa

**O que as APIs retornam:**
- `rankTier` (inteiro codificado, ex: 75 = Divine 5, 80 = Immortal)
- `leaderboardRank` (posição para Immortal)
- MMR numérico **não é exposto publicamente** pela Valve em APIs third-party

**Stratz vs OpenDota para rank data:**

| Aspecto | OpenDota | Stratz |
|---------|----------|--------|
| Dados de rank/medal | `rank_tier` por match, mas limitado (muitos players ocultam) | Mais abrangente — coleta mesmo de perfis privados (dados anônimos) |
| MMR numérico | Disponível se perfil público | Não disponível (Valve não expõe) |
| Parse replay | Manual (`POST /matches/{id}`) | Automático com parser próprio |
| Rank progression | Simples — snapshot pré/pós partida | Melhor — histórico de rank ao longo do tempo |
| Dados de itens | Sim, por match | Sim, com nomes (não só IDs) |
| Latência | 5-30min (replay parse) | 5-15min (parser próprio mais rápido) |

**Recomendação para formuladota:**

Para o HUB de mentoria:
- **OpenDota**: já integrado (PRD), usar para match stats básicos (KDA, heróis, itens)
- **Stratz**: adicionar para `rankTier` histórico do player (progressão de rank ao longo das sessões)
- **MMR numérico**: não disponível via API — não tentar exibir. Usar `rankTier` + progressão visual (badge do rank)

### 3.5 Stratz vs OpenDota — quando usar cada um

| Caso de uso | Usar | Motivo |
|-------------|------|--------|
| Match básico (KDA, heróis, duração) | OpenDota | REST simples, já integrado |
| Rank atual do player | Stratz | Mais abrangente para contas privadas |
| Progressão de rank ao longo do tempo | Stratz | GraphQL flexível, dados históricos |
| Dados de draft/picks/counters | Stratz | Mais rico em análise de heróis |
| Rate limits gratuitos | Stratz (2000/hora) ou OpenDota (1200/mês sem key) | OpenDota Premium já pago (STATE.md) |
| Fallback se Stratz offline | OpenDota | Redundância |

**Para V1 do HUB:** OpenDota para match details básicos (já no PRD). Adicionar Stratz apenas para `rankTier` do player quando disponível.

---

## Constraintss do Projeto (CLAUDE.md — aplicáveis a estas integrações)

| Constraint | Aplicação |
|------------|-----------|
| TypeScript strict, zero `any` | Types explícitos para payloads AbacatePay subscription e Stratz GraphQL |
| Funções max 50 linhas | Webhook handler de subscription deve ser modularizado |
| Zod em todos os inputs | Schema Zod para `subscription.*` webhooks |
| RLS em todas as tables | Tabela `subscriptions` com RLS — user vê apenas a própria |
| Webhook HMAC | Mesma validação do `transparent.*` para `subscription.*` |
| Bot separado em `bot/` | Steam bot em `bot/` — não no app Next.js |
| Sem aprovação Pedro | Mudanças em billing/payments exigem aprovação — mensalidade R$ 47 precisa sign-off |

---

## Questões em Aberto

### Q1: Stratz rankTier — confiabilidade para contas privadas
- **O que sabemos:** Stratz afirma coletar dados mesmo de perfis privados de forma anônima
- **O que está incerto:** Qual % de jogadores têm `rankTier` disponível em partidas de lobby privado (não ranked)
- **Recomendação:** Testar com match_id de partida de lobby real antes de depender do campo

### Q2: Custom Game Restricted em conta bot nova
- **O que sabemos:** Valve restringe custom games em contas novas
- **O que está incerto:** Se lobbies de prática padrão (não arcade) são afetados
- **Recomendação:** Criar conta bot, deixar maturar 30+ dias, testar criar lobby privado antes de produção

### Q3: AbacatePay — checkout de assinatura com `methods: ["PIX"]`
- **O que sabemos:** Subscription aceita PIX e CARD. Payload permite especificar `methods`
- **O que está incerto:** O PIX recorrente é verdadeiro débito automático (cliente autoriza uma vez) ou gera QR Code novo por ciclo?
- **Recomendação:** Testar no sandbox AbacatePay com produto `MONTHLY`. O behavior de renovação não está documentado explicitamente — contatar suporte (`ajuda@abacatepay.com`) antes de implantar em produção.

### Q4: match_id em lobby sem bot no slot
- **O que sabemos:** Bot precisa ficar no lobby para receber `practiceLobbyUpdate` com match_id
- **O que está incerto:** Se bot pode entrar como espectador e ainda receber GC updates
- **Recomendação:** Para V1, Pedro insere match_id manualmente (zero risco). Bot automatizado é V3.

---

## Fontes

### Primárias (HIGH confidence — verificadas via docs oficiais)
- `https://docs.abacatepay.com/llms.txt` — índice completo de endpoints
- `https://docs.abacatepay.com/pages/subscriptions/create.md` — endpoint, payload, resposta
- `https://docs.abacatepay.com/pages/subscriptions/reference.md` — referência técnica
- `https://docs.abacatepay.com/pages/webhooks/events/subscriptions.md` — eventos `subscription.*`
- `https://docs.abacatepay.com/pages/products/create.md` — criação de produto com `cycle: MONTHLY`
- `https://github.com/DoctorMcKay/node-steam-user` — autenticação, refresh tokens, produção
- `https://github.com/DoctorMcKay/node-steam-totp` — TOTP para Steam Guard Mobile
- `https://railway.com/pricing` — custo por uso, créditos plano Hobby

### Secundárias (MEDIUM confidence — WebSearch verificado com múltiplas fontes)
- `https://github.com/Arcana/node-dota2` — comandos de lobby, eventos GC
- `https://dota2.readthedocs.io/en/stable/dota2.features.lobby.html` — métodos de lobby (Python equivalente)
- `https://stratz.medium.com/stratz-api-major-update-5557335dbdfd` — rate limits, tiers de token
- WebSearch "Railway vs Fly.io 2025" — comparativo de custos confirmado em múltiplas fontes
- WebSearch "Stratz GraphQL rate limits" — 2000 req/hora Tier 1, verificado em múltiplas fontes

### Terciárias (LOW confidence — WebSearch + inferência, marcar para validação)
- Query GraphQL Stratz no formato acima — baseado em schema inferido de projetos terceiros + Medium article. **Validar no playground `api.stratz.com/graphiql` antes de implementar**
- Custo exato Railway para 256MB 24/7 (~$2,50/mês) — calculado a partir da tabela de preços, não medido
- Restrição "Custom Game Restricted" em bots Dota 2 — baseado em relatos de usuários, não documentação oficial Valve

---

## Metadata

**Confidence breakdown:**
- AbacatePay subscription: HIGH — docs oficiais verificados, payload e webhooks confirmados
- node-dota2 produção (steam-user/steam-totp): MEDIUM — GitHub oficial verificado, mas stack de produção Docker não tem guia oficial
- Stratz GraphQL query: MEDIUM-LOW — endpoint confirmado, schema inferido, exemplos de campo requerem validação no playground
- Hosting costs: MEDIUM — calculado a partir de preços públicos, não medido em produção

**Data da pesquisa:** 2026-04-30
**Válido até:** 2026-07-30 (AbacatePay V2 estável; railway pricing pode mudar; Stratz GraphQL schema muda com patches Dota 2)
