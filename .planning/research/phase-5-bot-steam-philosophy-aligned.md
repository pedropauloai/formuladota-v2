# Phase 5 — Bot Steam Lobby Creator (filosofia-aligned)

> **Status:** Spec — não implementado. Aguarda conclusão do Milestone V2.5 Design Foundations.
> **Data desta spec:** 2026-05-23
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentação)

**Depende de:**
- `docs/foundations/PHILOSOPHY.md` (Agent G — em criação paralela)
- `docs/foundations/HONOR_SYSTEM.md` (Agent G — em criação paralela)
- `.planning/research/ixdl-lessons.md` (pesquisa IxDL — concluída)
- `.planning/research/integrations.md` (engenharia reversa meta-liga — concluída)
- Milestone V2.5-F2 Token Layer (GATE — bot UI usa design system)
- Phase 4 (Subscription Mensal — mensalidade ativa = pode entrar em fila)

---

## 1. Por que esta spec existe antes da implementação

Phase 5 foi originalmente especificada em `.planning/ROADMAP.md` apenas pelo ângulo técnico:
*"Bot Steam cria lobby Dota 2 customizado, alunos jogam, bot captura match data."*

Essa descrição é **correta mas incompleta**. Em 2026-05-23, Pedro articulou a filosofia central do FormulaDota — o sistema 2-eixos (SKILL + HONOR) que distingue a plataforma de qualquer league técnica existente.

Phase 5 não é apenas infra. É **o momento em que a filosofia vira realidade computável**. Cada partida in-house gera dados que alimentam os dois eixos. Sem essa intenção explícita no design do bot, os dados certos não são coletados, e o sistema 2-eixos vira apenas um leaderboard de MMR com badge cosmético de honor — exatamente o que não queremos.

Esta spec redesenha Phase 5 sob a filosofia 2-eixos antes que qualquer linha de código seja escrita.

---

## 2. Goal técnico (preservado do roadmap)

Bot Steam com conta dedicada cria lobby Dota 2 customizado quando 10 jogadores estão na fila. Bot captura Match ID pós-partida. Dados da partida alimentam sistema interno de SKILL rating (MMR FormulaDota).

Stack técnica:
```
Discord Bot (Node.js + Discord.js v14)
    ↓ fila confirmada (10 players)
Steam Bot Account (steam-user v5 + steam-totp + node-dota2 || go-dota2)
    ↓ cria lobby + convida SteamIDs
Game Coordinator Dota 2
    ↓ partida acontece
Stratz GraphQL API (match_id → stats completos)
    ↓
Supabase (tabelas match_data, honor_ledger, match_reviews)
    ↓ Realtime trigger
App Web (Next.js) — PostMatchScreen
```

---

## 3. Goal FILOSÓFICO (novo — central desta spec)

Phase 5 é onde o sistema 2-eixos vira **REALIDADE**. Antes de Phase 5:
- SKILL existe no papel (subscription ativa, Steam vinculado)
- HONOR existe no papel (doutrina aceita, onboarding completo)

**Após Phase 5**: cada partida gera eventos mensuráveis que movem os dois eixos.

O design do bot deve ser guiado pela pergunta: *"O que esta partida ensinou sobre este jogador — como jogador (SKILL) e como ser humano (HONOR)?"*

Essa pergunta tem resposta **dupla**. E o sistema captura as duas.

---

## 4. Captura de match data necessária

### 4.1 Dados para SKILL rating

| Campo | Fonte | Tabela |
|---|---|---|
| `match_id` | Dota 2 GC (bot cria lobby) | `matches` |
| `radiant_win` (boolean) | Stratz GraphQL | `matches` |
| `duration_seconds` | Stratz GraphQL | `matches` |
| `players[]` (steam_id64, team, hero_id) | Stratz GraphQL | `match_players` |
| `kills / deaths / assists` por player | Stratz GraphQL | `match_players` |
| `net_worth`, `gpm`, `xpm` | Stratz GraphQL (opcional V1) | `match_players` |
| `mmr_before / mmr_after` (interno) | Calculado pós-match (algoritmo Glicko-2) | `player_mmr_history` |

### 4.2 Dados para HONOR score (novo — esta spec)

Esses dados não são apenas bonus — são **co-primários** do sistema FormulaDota:

| Campo | Fonte | Tabela | Nota |
|---|---|---|---|
| `abandoned` (boolean) | Stratz (leaver_status) | `match_players` | Abandono = delta honor negativo imediato |
| `in_game_reports` | Stratz (behavior fields se disponível) | `match_reports_raw` | Complementa peer review |
| `communication_score` | Stratz (se disponível via behavior API) | `match_players` | Opcional V1 |
| `peer_review_data[]` | App (PostMatchScreen — aluno preenche) | `match_reviews` | Core V1 |
| `self_reflection_data` | App (PostMatchScreen — aluno preenche) | `match_self_reviews` | Core V1 |
| `coach_validation` | App (Pedro valida via admin) | `match_reviews` | Override qualificado |

**Nota sobre Stratz vs OpenDota:** Stratz tem acesso a campos de comportamento do Dota 2 (communication_score, behavior_score) que a OpenDota não expõe. Essa é a razão principal de usar Stratz como fonte primária para Phase 5+.

### 4.3 Dados de presença e comprometimento

| Campo | Lógica | Tabela |
|---|---|---|
| `confirmed_at` | Timestamp que player confirmou na fila | `queue_entries` |
| `lobby_joined_at` | Timestamp que player aceitou convite Steam | `match_players` |
| `no_show` | confirmou fila mas não entrou no lobby | `queue_entries` |
| `abandon_type` | early (< 10min) / mid / late | `match_players` |

Presença e comprometimento contribuem para HONOR score mas são calculados pelo sistema — não dependem de peer review.

---

## 5. Flow completo da partida (técnico + filosófico)

```
[1] FILA
  Player entra na fila via app web (/jogar) ou Discord (!queue)
  Sistema verifica: subscription ativa? Steam vinculado? Sem ban ativo?
  Fila exibe: "X/10 jogadores" + nomes + presença histórica de cada um
  
[2] MATCH FOUND
  10 players confirmados → Discord notifica (@mention todos)
  App web dispara toast + som de notificação (Howler)
  Timer: 3 minutos para aceitar convite Steam
  
[3] LOBBY CREATION (Steam Bot)
  Bot Steam (conta dedicada) cria lobby via Game Coordinator:
    - Modo: All Pick ou Captains Mode (configurável por temporada)
    - Servidor: South America (SA) — menor latência BR
    - Password: hash aleatório 8 chars
    - Nome: "FORMULADOTA-{season_id}-{lobby_n}"
  Bot convida cada SteamID via GC
  Popup aparece no cliente Dota 2 de cada player
  
[4] LOBBY FILL
  Bot rastreia quais players aceitaram o convite
  Se player não aceita em 3 min → marcado como no-show
  No-show: penalidade de presença (não entra em fila por 30 min)
  
[5] DRAFT + PARTIDA
  Draft acontece normalmente no Dota 2
  Bot monitora estado do lobby (criado → draft → ativo)
  
[6] PARTIDA ENCERRA
  Bot recebe evento de fim de partida via GC
  Match ID capturado automaticamente
  Sistema faz request Stratz GraphQL (aguarda 5 min pós-fim — Stratz delay)
  Dados parseados e inseridos em: matches, match_players
  
[7] POST-MATCH RITUAL (ver seção 6)
  Trigger Supabase Realtime → app notifica todos os 10 players
  PostMatchScreen abre obrigatoriamente no app de cada player
  
[8] PEER REVIEWS (ver seção 7)
  Após completar auto-review: formulário de peer review de cada companheiro
  Anônimo entre players; Pedro vê como admin
  
[9] SCORE UPDATE
  Todos reviews coletados (ou timeout 24h) → triggers calculam:
    - SKILL delta (Glicko-2) → inserido em player_season_mmr
    - HONOR delta → inserido em honor_ledger
  Leaderboard atualizado (materialized view refresh)
```

---

## 6. PostMatchScreen — ritual pós-partida

PostMatchScreen é a inovação central de Phase 5 em relação a qualquer IHL existente. Não é um "recibo de resultado". É um **ritual de aprendizado estruturado**.

### 6.1 Design filosófico

O ritual existe porque:
- **Derrota ensina** (Princípio FormulaDota) — mas só se houver reflexão estruturada
- **HONOR não pode ser inferido só de dados** — o player conhece sua própria conduta melhor que qualquer algoritmo
- **A tela é um gate** — sem completá-la, o player não pode entrar em nova fila (sem punição moral, é proteção de qualidade)

O nome "PostMatchScreen" intencional replica a terminologia do próprio Dota 2 (pós-jogo scoreboard). Familiar ao jogador, mas com camada de reflexão adicional.

### 6.2 Estrutura da tela

```
┌─ REFLEXÃO PÓS-PARTIDA ──────────────────────────────────────────────────────┐
│                                                                              │
│  [logo FORMULADOTA]           [data e hora]     [Season 1 — Partida #247]  │
│                                                                              │
│  ┌─ RESULTADO ─────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  [Ícone Vitória/Derrota]   VITÓRIA / DERROTA                           ││
│  │                                                                          ││
│  │  SKILL: +25 MMR FormulaDota    (verde positivo / vermelho negativo)     ││
│  │  Seu MMR atual: 1.247                                                   ││
│  │                                                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐││
│  │  │  Princípio em destaque:                                              │││
│  │  │  "A derrota não é o fim da jornada — é onde a aprendizagem          │││
│  │  │   começa. Quem perde e reflete vence mais que quem vence             │││
│  │  │   e não aprende."                                                    │││
│  │  └──────────────────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ AUTO-REFLEXÃO — SUA CONDUTA ────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  Marque o que aconteceu nesta partida (honestidade importa):            ││
│  │                                                                          ││
│  │  [ ] Comuniquei objetivos claramente para o time                        ││
│  │  [ ] Mantive a calma em momentos difíceis                               ││
│  │  [ ] Assumi um erro que cometi                                          ││
│  │  [ ] Ajudei um aliado em dificuldade                                    ││
│  │  [ ] Evitei culpar outros pelos problemas do time                       ││
│  │  [ ] Completei a partida mesmo em desvantagem                           ││
│  │                                                                          ││
│  │  O que eu poderia ter feito diferente?                                  ││
│  │  [Campo de texto opcional — máx 280 chars]                              ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ IMPACTO HONOR ──────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  HONOR delta estimado: será calculado após peer reviews (próx. 24h)     ││
│  │  Seu HONOR atual: 892                                                   ││
│  │                                                                          ││
│  │  Recomendação do coach:                                                 ││
│  │  [Pedro (ou sistema) adiciona nota personalizada opcionalmente]          ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [CONTINUAR PARA PEER REVIEWS]                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Regras de negócio da PostMatchScreen

**Gate de fila:** Player não pode entrar em nova fila enquanto PostMatchScreen pendente. Isso é comunicado no onboarding — não é surpresa.

**Timeout:** 24 horas para completar PostMatchScreen. Após isso, sistema assume conduta neutra (nem positiva nem negativa) e libera fila. Não punir ausência de review com HONOR negativo — seria punição dupla.

**Honestidade como valor:** o sistema não pode verificar se o player está sendo honesto na auto-reflexão. A pressão é social (peer review valida ou invalida) e cultural (doutrina). Não adicionar gamificação que incentive marcar tudo positivo para ganhar mais HONOR — isso distorce o dado.

**Princípio exibido:** rotacionado aleatoriamente entre os 14 princípios. Preferencialmente princípio relevante para o resultado (vitória → princípio sobre humildade; derrota → princípio sobre aprendizado).

**Derrota não é punição:** a tela exibe derrota com a mesma dignidade que exibe vitória. Nenhum elemento visual dramático negativo. A derrota é um dado neutro. A reflexão é o ponto.

---

## 7. Peer review pós-partida

### 7.1 Design filosófico

O peer review existe porque:
- Dados objetivos (Stratz) capturam *o que aconteceu* no jogo
- A auto-reflexão captura *como o player se sentiu* sobre sua conduta
- O peer review captura *como os outros viram* a conduta do player

Três fontes de dado distintas constroem um retrato mais completo de HONOR.

O peer review é **anônimo entre jogadores** (Pedro vê identificado como admin). Anonimato reduz retaliação e reciprocidade forçada ("vou dar positivo pra ele porque ele deu positivo pra mim"). O peer review deve refletir observação genuína.

### 7.2 Estrutura do formulário

Para cada um dos 4 companheiros de time (ou 5, se incluir adversários — decisão de Phase 6):

```
┌─ PEER REVIEW — [Nome exibido / Discord handle] ─────────────────────────────┐
│                                                                              │
│  Avalie a conduta de [Nome] nesta partida:                                  │
│                                                                              │
│  [ ] Comunicou bem os objetivos para o time                                 │
│  [ ] Manteve a calma em momentos de pressão                                 │
│  [ ] Contribuiu positivamente para a dinâmica do time                       │
│  [ ] Mostrou disciplina tática                                              │
│  [ ] Eu voltaria a jogar com este player                                    │
│                                                                              │
│  Observação (opcional — anônima):                                           │
│  [Campo texto — máx 200 chars]                                              │
│                                                                              │
│  [SALVAR E PRÓXIMO]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Regras de negócio do peer review

**Apenas teammates:** V1 só avalia companheiros de time. Avaliar adversários adiciona complexidade e pode gerar retaliação. Revisitar em Phase 6.

**Mínimo de itens:** não é obrigatório marcar todos os critérios positivos. Mas é obrigatório *enviar* o formulário (mesmo que todos desmarcados). Isso garante que a ausência de positivos é dado intencional, não preguiça.

**Peso de cada critério no HONOR:** definido em `docs/foundations/HONOR_SYSTEM.md` (Agent G). Não é responsabilidade desta spec definir os pesos — só garantir que o dado seja capturado.

**Review do próprio review:** se aluno recebe consistentemente reviews negativos que contrariam sua auto-avaliação positiva, Pedro recebe alerta de inconsistência. Não punição automática — investigação humana.

---

## 8. Tabelas Supabase necessárias (sketch de migration)

```sql
-- ============================================================
-- TABELA: matches
-- Partida in-house registrada
-- ============================================================
create table if not exists matches (
  id              uuid primary key default gen_random_uuid(),
  season_id       uuid references seasons(id),
  match_id_dota   bigint unique not null,        -- Match ID do Dota 2 (Stratz)
  lobby_name      text not null,
  game_mode       text not null default 'all_pick', -- 'all_pick' | 'captains_mode'
  server_region   text not null default 'sa',
  radiant_win     boolean,
  duration_sec    int,
  started_at      timestamptz,
  ended_at        timestamptz,
  stratz_parsed   boolean not null default false, -- Stratz data foi buscada?
  stratz_parsed_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABELA: match_players
-- Participação de cada player na partida
-- ============================================================
create table if not exists match_players (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references matches(id),
  user_id         uuid references profiles(id),
  steam_id64      text not null,
  team            text not null check (team in ('radiant', 'dire')),
  hero_id         int,
  hero_name       text,
  kills           int,
  deaths          int,
  assists         int,
  net_worth       int,
  gpm             int,
  xpm             int,
  abandoned       boolean not null default false,
  abandon_type    text check (abandon_type in ('early', 'mid', 'late', null)),
  no_show         boolean not null default false,
  mmr_before      int,
  mmr_after       int,
  mmr_delta       int,
  created_at      timestamptz not null default now(),
  unique (match_id, user_id)
);

-- ============================================================
-- TABELA: match_self_reviews
-- Auto-reflexão do player sobre sua conduta na partida
-- ============================================================
create table if not exists match_self_reviews (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references matches(id),
  user_id         uuid references profiles(id),
  
  -- Checkboxes de conduta (boolean por critério)
  communicated_objectives   boolean default false,
  maintained_calm           boolean default false,
  admitted_mistake          boolean default false,
  helped_ally               boolean default false,
  avoided_blaming           boolean default false,
  completed_match           boolean default false,
  
  -- Reflexão textual opcional
  reflection_text text check (char_length(reflection_text) <= 280),
  
  completed_at    timestamptz,                -- null = ainda não completou
  created_at      timestamptz not null default now(),
  unique (match_id, user_id)
);

-- ============================================================
-- TABELA: match_reviews
-- Peer review anônimo entre teammates
-- ============================================================
create table if not exists match_reviews (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references matches(id),
  reviewer_id     uuid references profiles(id),
  reviewed_id     uuid references profiles(id),
  
  -- Critérios avaliados (boolean por critério)
  communicated_well     boolean default false,
  maintained_calm       boolean default false,
  contributed_positively boolean default false,
  showed_discipline     boolean default false,
  would_play_again      boolean default false,
  
  -- Observação anônima opcional
  observation_text text check (char_length(observation_text) <= 200),
  
  is_anonymous    boolean not null default true,  -- sempre true V1
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (match_id, reviewer_id, reviewed_id),
  check (reviewer_id != reviewed_id)            -- não pode se auto-revisar
);

-- ============================================================
-- TABELA: honor_ledger
-- Registro de cada evento que move o HONOR score
-- Imutável (append-only) — nunca fazer UPDATE em rows antigas
-- ============================================================
create table if not exists honor_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  season_id       uuid references seasons(id),
  
  -- Origem do evento
  source          text not null check (source in (
    'self_review',     -- auto-reflexão positiva coletiva
    'peer_review',     -- peer reviews recebidos
    'abandon',         -- abandono de partida
    'no_show',         -- entrou na fila, não apareceu
    'admin_bonus',     -- Pedro reconhece conduta notável
    'admin_strike',    -- Pedro aplica strike comportamental
    'presence',        -- presença consistente (calculado periodicamente)
    'streak_positive', -- sequência de reviews positivos
    'coach_note'       -- anotação do coach no PostMatchScreen
  )),
  
  match_id        uuid references matches(id),    -- null para eventos fora de partida
  delta           int not null,                   -- positivo = HONOR ganho; negativo = HONOR perdido
  reason          text,                           -- descrição human-readable (exibida no perfil)
  applied_by      uuid references profiles(id),   -- null = sistema; uuid = Pedro ou admin
  
  created_at      timestamptz not null default now()
);

-- Trigger: atualizar honor_atual em player_season_honor após insert em honor_ledger
-- (definido em migration junto com player_season_honor — ver Phase 6 spec)

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- matches: qualquer authenticated pode ler; apenas service_role escreve
alter table matches enable row level security;
create policy "matches_select_authenticated"
  on matches for select
  to authenticated
  using (true);

-- match_self_reviews: player vê só os seus; admin vê todos
alter table match_self_reviews enable row level security;
create policy "self_reviews_own"
  on match_self_reviews for all
  to authenticated
  using (user_id = auth.uid());

-- match_reviews: reviewer vê os que fez; reviewed NÃO vê (anônimo); admin vê todos
-- Nota: admin access via service_role (não via RLS policy — bypass RLS)
alter table match_reviews enable row level security;
create policy "peer_reviews_reviewer_only"
  on match_reviews for all
  to authenticated
  using (reviewer_id = auth.uid());

-- honor_ledger: player vê seus próprios eventos; admin vê todos
alter table honor_ledger enable row level security;
create policy "honor_ledger_own"
  on honor_ledger for select
  to authenticated
  using (user_id = auth.uid());
```

---

## 9. Lógica do Steam Bot (sketch técnico)

### 9.1 Stack do bot

```
bot/
├── src/
│   ├── lobby/
│   │   ├── SteamBot.ts          # Conexão ao Steam GC via steam-user + node-dota2
│   │   ├── LobbyManager.ts      # CRUD de lobbies, estado, reconexão
│   │   └── LobbyStates.ts       # Enum: IDLE | CREATING | FILLING | DRAFT | ACTIVE | ENDED
│   ├── queue/
│   │   ├── QueueManager.ts      # Gerencia fila de 10 players
│   │   └── QueueValidator.ts    # Verifica subscription + Steam + ban
│   ├── match/
│   │   ├── StratzClient.ts      # GraphQL client para Stratz
│   │   ├── MatchParser.ts       # Parse dos dados Stratz → formato interno
│   │   └── MatchProcessor.ts    # Orquestra: Stratz fetch → Supabase insert → trigger PostMatch
│   └── discord/
│       └── QueueCommands.ts     # !queue, !sair, !fila (Discord slash commands)
├── package.json
└── Dockerfile
```

### 9.2 Reconexão automática (crítico)

O Game Coordinator do Dota 2 é notoriamente instável. O bot precisa de lógica robusta:

```typescript
// SteamBot.ts
class SteamBot {
  private reconnectDelay = 5000;        // 5s inicial
  private maxReconnectDelay = 300000;   // 5 min máximo
  private reconnectAttempts = 0;

  async connect() {
    this.client.logOn({
      accountName: process.env.STEAM_BOT_USERNAME,
      password:   process.env.STEAM_BOT_PASSWORD,
      twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET)
    });
  }

  onDisconnected(eresult: number) {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    console.error(`[SteamBot] Desconectado (${eresult}). Tentativa ${this.reconnectAttempts} em ${delay}ms`);
    setTimeout(() => this.connect(), delay);
  }

  onConnected() {
    this.reconnectDelay = 5000; // reset
    this.reconnectAttempts = 0;
    this.client.setPersona(SteamUser.EPersonaState.Online);
    this.dota2Client.launch(); // conectar ao GC
  }
}
```

### 9.3 Criação de lobby

```typescript
// LobbyManager.ts
async createLobby(players: QueuedPlayer[], seasonId: string): Promise<Lobby> {
  const passKey = crypto.randomBytes(4).toString('hex').toUpperCase();
  const lobbyN  = await this.getNextLobbyNumber(seasonId);

  const config = {
    game_name:   `FORMULADOTA-${seasonId.slice(0,8)}-${lobbyN}`,
    pass_key:    passKey,
    server_region: Dota2.ServerRegion.SOUTHAMERICA,
    game_mode:   Dota2.DOTA_GameMode.DOTA_GAMEMODE_AP,  // All Pick
    allow_cheats:  false,
    fill_with_bots: false,
    allow_spectating: true,
  };

  return new Promise((resolve, reject) => {
    this.dota2Client.createPracticeLobby(config, (err, body) => {
      if (err) return reject(err);

      // Convidar cada player pelo SteamID
      for (const player of players) {
        this.dota2Client.inviteToLobby(player.steam_id64);
      }

      resolve({ lobbyId: body.lobby_id, passKey, config });
    });
  });
}
```

### 9.4 Fetch Stratz pós-partida

```typescript
// StratzClient.ts
const MATCH_QUERY = gql`
  query GetMatch($matchId: Long!) {
    match(id: $matchId) {
      id
      radiantWin
      durationSeconds
      startDateTime
      players {
        steamAccountId
        isRadiant
        heroId
        hero { shortName }
        kills
        deaths
        assists
        networth
        goldPerMinute
        experiencePerMinute
        leaverStatus    # ABANDONED = 1
      }
    }
  }
`;

async function fetchMatchData(matchId: bigint): Promise<StratzMatch> {
  // Aguardar 5 minutos após fim da partida (Stratz precisa de tempo pra parsear)
  await new Promise(r => setTimeout(r, 5 * 60 * 1000));

  const response = await fetch('https://api.stratz.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRATZ_TOKEN}`
    },
    body: JSON.stringify({ query: MATCH_QUERY, variables: { matchId } })
  });

  const data = await response.json();
  return data.data.match;
}
```

---

## 10. Anti-padrões a evitar

### 10.1 PostMatchScreen como punição por derrota

**Errado:** exibir elementos visuais negativos dramáticos em derrota (efeito de "morte", cores esmagadas, texto punitivo).

**Correto:** derrota e vitória têm o mesmo tratamento visual. O princípio "Derrota ensina" não é condolência — é filosofia genuína. O design deve comunicar isso.

### 10.2 Reviews públicos

**Errado:** exibir quem avaliou o quê para outros jogadores. Isso cria retaliação ("você me deu negativo, eu te dou negativo") e destrói a qualidade do dado.

**Correto:** anonimato entre players. Pedro vê identificado como moderador responsável. O perfil público exibe apenas o HONOR score agregado, não os reviews individuais.

### 10.3 Esconder dados de skill após derrota

**Errado:** não mostrar MMR delta negativo ou suavizá-lo artificialmente. Isso nega a realidade e impede aprendizado.

**Correto:** MMR delta visível sempre. HONOR delta também visível. Os dois eixos são co-primários — nenhum é suavizado.

### 10.4 Recompensar vitórias acima de conduta

**Errado:** MMR positivo + HONOR positivo em vitória, MMR negativo + HONOR negativo em derrota. Isso faz HONOR ser proxy de MMR.

**Correto:** MMR e HONOR têm fontes distintas. É possível ganhar MMR e perder HONOR (vitória com abandono parcial de aliados, comunicação hostil). É possível perder MMR e ganhar HONOR (derrota com excelente conduta e auto-reflexão honesta).

### 10.5 PostMatchScreen como formulário longo e cansativo

**Errado:** 15+ critérios, texto obrigatório, 10 min de preenchimento por partida.

**Correto:** V1 tem 6 critérios de auto-reflexão + 5 critérios por peer (4 players = 20 checks). Máx 5 minutos. Texto sempre opcional. Se Phase 6 mostrar que os dados são bons, expandir moderadamente.

### 10.6 Depender do bot Steam para lógica de negócio crítica

**Errado:** cálculo de MMR e HONOR dentro do bot Discord/Steam.

**Correto:** bot coleta dados brutos. Todo cálculo de SKILL e HONOR acontece em Supabase (triggers PG e Edge Functions). Bot é coletor, não decisor.

---

## 11. Edge cases e comportamentos excepcionais

| Situação | Comportamento esperado |
|---|---|
| Stratz não retorna dados em 30 min | Admin notificado. Match marcado como `stratz_failed`. Pedro pode inserir resultado manualmente via painel admin. |
| Player sai do lobby antes do jogo começar | No-show = flag `no_show=true`. Penalidade de fila 30 min. Honor delta pequeno negativo de presença. |
| Partida cancelada antes de iniciar (erro de draft, etc.) | Match cancelado no DB. Nenhum MMR/HONOR delta. Players retornam à fila. |
| Player completa PostMatchScreen mas não faz peer reviews | Self-review conta. Peer reviews ficam pendentes até timeout 24h. Sem penalidade por peer review incompleto em V1. |
| Dois lobbies simultâneos criados por erro | LobbyManager deve ter lock/mutex. Um dos lobbies é cancelado, players reassinalados ou convidados novamente. |
| Bot Steam desconectado durante partida ativa | Partida continua no Dota 2 normalmente (bot só criou o lobby — não controla a partida). Bot reconecta, busca Match ID via Stratz pelo nome do lobby ou Steam Web API. |
| Player abandonou e quer contestar | Stratz `leaverStatus` é dado objetivo — não há contestação de abandono registrado por Stratz. Se Stratz errou (player caiu da net), Pedro avalia e pode remover penalidade manualmente. |

---

## 12. UAT (critérios de validação futura)

Quando Phase 5 for implementada, os seguintes testes devem passar antes de marcar como complete:

- [ ] Bot Steam cria lobby com sucesso e envia convites para 10 SteamIDs
- [ ] Convite aparece como popup no cliente Dota 2 de pelo menos 2 testers
- [ ] Match ID capturado pelo bot após fim da partida
- [ ] Stratz retorna dados completos para o Match ID capturado
- [ ] Dados inseridos corretamente em `matches` + `match_players`
- [ ] Trigger Supabase Realtime dispara PostMatchScreen no app de todos os 10 players
- [ ] PostMatchScreen exibe resultado, MMR delta, princípio correto
- [ ] Gate de fila funciona: player com PostMatchScreen pendente não consegue entrar em nova fila
- [ ] Peer review completo para 4 companheiros; dados inseridos em `match_reviews`
- [ ] Honor ledger recebe eventos de `self_review` e `peer_review` após conclusão
- [ ] Admin (Pedro) consegue ver reviews de todos os players identificados
- [ ] Abandono registrado corretamente como `abandoned=true` + honor delta negativo em `honor_ledger`
- [ ] Reconexão do bot Steam funciona após desconexão simulada (kill -9 processo)

---

## 13. Dependências externas e riscos

| Dependência | Risco | Mitigação |
|---|---|---|
| Steam Game Coordinator (GC) | Instável, API não oficial, pode mudar | Exponential backoff, monitoramento de health, fallback: Pedro cria lobby manualmente enquanto bot recupera |
| Stratz GraphQL API | Rate limit (2000 req/h Free Tier) | 10 req/partida × máx 3 partidas/dia = 30 req/dia — bem dentro do limite |
| node-dota2 (arquivado 2022) | Sem manutenção ativa | Opção A: go-dota2 (Go, ativo). Opção B: fork próprio de node-dota2 para manutenção pontual |
| Conta Steam dedicada | VAC ban em conta errada | Conta separada, sem jogos pagos valiosos, sem histórico sensível. Dota 2 free = risco mínimo |
| Docker no Railway | Custo ~$3/mês (Hobby) | Aceitável. Escalar para $5-10 conforme crescimento |

---

## 14. Próximos passos (quando Phase 5 iniciar)

1. Criar conta Steam dedicada para o bot (seguir checklist em `project_pivot_hub_dota.md`)
2. Avaliar go-dota2 vs node-dota2 fork — teste de conexão GC com conta de teste
3. Definir pesos dos critérios de HONOR em `docs/foundations/HONOR_SYSTEM.md` (Agent G)
4. Criar migration com tabelas desta spec (matches, match_players, match_self_reviews, match_reviews, honor_ledger)
5. Implementar bot Discord básico com fila (!queue, !sair, !fila)
6. Implementar SteamBot com createPracticeLobby + reconexão
7. Implementar PostMatchScreen (componente client-side, gate de fila)
8. Implementar peer review flow
9. Implementar triggers honor_ledger
10. UAT completo com Pedro e 4-9 testers reais

---

*Spec criada em 2026-05-23 para alimentar execução futura de Phase 5.*
*Não modifica código existente — apenas documenta visão.*
*Agent G cuida de PHILOSOPHY.md e HONOR_SYSTEM.md que esta spec referencia.*
