# Phase 6 — MMR + Seasons (sistema 2-eixos)

> **Status:** Spec — não implementado. Aguarda Phase 5 (Bot Steam + PostMatchScreen + Honor Ledger).
> **Data desta spec:** 2026-05-23
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentação)

**Depende de:**
- `docs/foundations/PHILOSOPHY.md` (Agent G)
- `docs/foundations/HONOR_SYSTEM.md` (Agent G — define pesos e algoritmos)
- `.planning/research/phase-5-bot-steam-philosophy-aligned.md` (esta série)
- Phase 5 entregue: tabelas `matches`, `match_players`, `honor_ledger`, `match_reviews` existindo com dados reais
- Milestone V2.5-F2 Token Layer (design system para UI de leaderboard)

---

## 1. Por que esta spec existe antes da implementação

Phase 6 foi originalmente especificada no ROADMAP como:
*"Matchmaking interno (mesmo MMR alvo) + Seasons 3 meses + Reset parcial."*

Correto tecnicamente. Mas há uma decisão filosófica fundamental que não pode ser resolvida durante a implementação: **qual é a estrutura do ciclo competitivo quando dois eixos existem?**

Uma league com ranking único de MMR é um problema resolvido. Qualquer IHL open-source faz isso.

Uma league com dois eixos (SKILL + HONOR) como co-primários, com dois leaderboards públicos, dois reset cycles, e um título ("Imortal da Fórmula") que exige performance simultânea nos dois eixos — isso é design de produto inédito que precisa de spec antes de schema.

Esta spec define o ciclo competitivo completo do FormulaDota sob a filosofia 2-eixos.

---

## 2. Estrutura de uma Season

### 2.1 Ciclo de vida

```
Season criada (admin) → Calibração → Season ativa → Encerramento → Reset → Nova Season
     |                      |               |               |
   Pedro define          Players jogam   Leaderboard     Imortal da
   prêmio + datas        partidas de     fecha (leitura   Fórmula
   (pode ser R$0)        calibração      apenas)          concedido
```

**Duração padrão:** 3 meses. Justificativa: 1 mês é frenético demais (pouco tempo para HONOR se manifestar — o eixo de conduta precisa de múltiplas partidas para ser significativo). 6 meses (GamersClub CS) é longo demais para uma comunidade menor. 3 meses cria urgência sem pressão excessiva.

**Calibração:** primeiras 5 partidas da season não movem MMR oficial — ajustam a calibragem inicial a partir do MMR histórico do player (seed). Reason: evitar que players que jogaram pouco na season anterior comecem em posição muito defasada.

**Encerramento:** no último dia da season, leaderboard congela às 23h59 (horário de Brasília). Cálculo de "Imortal da Fórmula" roda no banco às 00h00 da meia-noite. Badge emitido automaticamente.

**Hall of Fame:** após encerramento, season e seus top 3 por categoria são arquivados no Hall of Fame permanente — nunca expiram no perfil do player.

### 2.2 Estados de uma Season

```typescript
type SeasonStatus =
  | 'planned'       // criada, ainda não começou
  | 'calibration'   // primeiras partidas (MMR oficial não muda)
  | 'active'        // season competitiva em andamento
  | 'closing'       // últimas 24h (leaderboard pode mudar)
  | 'ended'         // congelado, Imortal calculado
  | 'archived';     // histórico permanente
```

---

## 3. Estrutura de banco (sketch de migration)

```sql
-- ============================================================
-- TABELA: seasons
-- Temporada competitiva (criada por admin)
-- ============================================================
create table if not exists seasons (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,               -- ex: "Season 1 — Fundação"
  slug            text unique not null,         -- ex: "s1-fundacao" (para URLs)
  status          text not null default 'planned'
                  check (status in ('planned','calibration','active','closing','ended','archived')),
  
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  
  prize_pool_brl  decimal(10,2) default 0,      -- R$0 = sem prêmio monetário
  prize_description text,                       -- descrição texto livre do prêmio
  
  -- Parâmetros do sistema de rating desta season
  mmr_start       int not null default 1000,    -- MMR inicial de todos os players
  mmr_per_win     int not null default 25,
  mmr_per_loss    int not null default 25,
  honor_start     int not null default 1000,
  
  -- Reset da season anterior (calculado no início)
  skill_reset_percent   decimal(5,2) default 30, -- -30% do MMR anterior
  honor_reset_percent   decimal(5,2) default 10, -- -10% do HONOR anterior
  
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABELA: player_season_mmr
-- EIXO SKILL — performance de cada player por season
-- ============================================================
create table if not exists player_season_mmr (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  season_id       uuid references seasons(id),
  
  mmr_inicio      int not null,               -- MMR ao entrar na season
  mmr_atual       int not null,               -- MMR corrente (atualizado após cada partida)
  mmr_peak        int not null,               -- Maior MMR já atingido nesta season
  
  partidas_jogadas    int not null default 0,
  vitorias            int not null default 0,
  derrotas            int not null default 0,
  abandonos           int not null default 0, -- saiu antes do fim
  no_shows            int not null default 0, -- fila confirmada, não entrou no lobby
  
  calibration_matches int not null default 0, -- partidas de calibração completadas (máx 5)
  calibrated          boolean not null default false, -- calibração completa?
  
  tier            text not null default 'herald',
                  -- 'herald'|'guardian'|'crusader'|'archon'|'legend'|'ancient'|'divine'|'immortal'
  tier_stars      int not null default 1 check (tier_stars between 1 and 5),
  
  -- Detalhes adicionais de performance (populados via Stratz)
  winrate_percent decimal(5,2),               -- calculado: vitorias/partidas_jogadas * 100
  streak_wins     int not null default 0,     -- sequência atual de vitórias
  streak_losses   int not null default 0,     -- sequência atual de derrotas
  
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, season_id)
);

-- ============================================================
-- TABELA: player_season_honor
-- EIXO HONOR — conduta de cada player por season
-- ============================================================
create table if not exists player_season_honor (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  season_id       uuid references seasons(id),
  
  honor_inicio    int not null,               -- HONOR ao entrar na season
  honor_atual     int not null,               -- HONOR corrente
  honor_peak      int not null,               -- Maior HONOR já atingido nesta season
  
  partidas_jogadas    int not null default 0,
  
  -- Componentes do HONOR score (para transparência no perfil)
  elogios_recebidos   int not null default 0, -- peer reviews positivos recebidos
  strikes_leves       int not null default 0, -- abandono tardio, no-show isolado
  strikes_graves      int not null default 0, -- abandono precoce, ban temporário
  
  -- Presença (independente de resultado)
  sessoes_confirmadas int not null default 0,
  sessoes_completadas int not null default 0,
  presence_percent    decimal(5,2),           -- calculado: completadas/confirmadas * 100
  
  -- Reviews recebidos (por tipo)
  reviews_positivos   int not null default 0, -- soma de todos "would_play_again = true"
  reviews_negativos   int not null default 0,
  
  -- Honor tier (separado do skill tier)
  honor_tier      text not null default 'discipulo',
                  -- 'iniciante'|'discipulo'|'honrado'|'exemplar'|'lendario'
  
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, season_id)
);

-- ============================================================
-- VIEW MATERIALIZADA: season_combined_leaderboard
-- Rankings combinados 2-eixos (atualizada via trigger ou cron)
-- ============================================================
create materialized view season_combined_leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  s.id as season_id,
  s.name as season_name,
  s.status as season_status,
  
  -- EIXO SKILL
  sm.mmr_atual,
  sm.tier as skill_tier,
  sm.tier_stars as skill_tier_stars,
  sm.partidas_jogadas as skill_partidas,
  sm.vitorias,
  sm.derrotas,
  sm.winrate_percent,
  
  -- EIXO HONOR
  sh.honor_atual,
  sh.honor_tier,
  sh.presence_percent,
  sh.elogios_recebidos,
  sh.strikes_graves,
  
  -- SCORE COMBINADO (ponderação igual — revisável por temporada)
  (
    (sm.mmr_atual::float / nullif(max(sm.mmr_atual) over (partition by s.id), 0)) * 50
    +
    (sh.honor_atual::float / nullif(max(sh.honor_atual) over (partition by s.id), 0)) * 50
  ) as combined_score,
  
  -- RANKS individuais por categoria (para leaderboard UI)
  rank() over (partition by s.id order by sm.mmr_atual desc) as rank_skill,
  rank() over (partition by s.id order by sh.honor_atual desc) as rank_honor,
  
  -- FLAG: Imortal da Fórmula (calculado no encerramento)
  false as imortal_da_formula  -- atualizado via trigger de season ended

from profiles p
inner join player_season_mmr sm on sm.user_id = p.id
inner join player_season_honor sh on sh.user_id = p.id and sh.season_id = sm.season_id
inner join seasons s on s.id = sm.season_id
where s.status in ('calibration', 'active', 'closing', 'ended', 'archived')

with no data;  -- populado pelo primeiro refresh

-- Index para performance de leaderboard queries
create unique index on season_combined_leaderboard (user_id, season_id);
create index on season_combined_leaderboard (season_id, rank_skill);
create index on season_combined_leaderboard (season_id, rank_honor);
create index on season_combined_leaderboard (season_id, combined_score desc);

-- Refresh function (chamada por trigger pós-partida ou cron 5 min)
create or replace function refresh_combined_leaderboard()
returns void
language sql security definer
as $$
  refresh materialized view concurrently season_combined_leaderboard;
$$;

-- ============================================================
-- TABELA: immortal_badges
-- Registro permanente dos "Imortais da Fórmula" por season
-- ============================================================
create table if not exists immortal_badges (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  season_id       uuid references seasons(id),
  
  badge_type      text not null check (badge_type in (
    'imortal_da_formula',  -- top 5% em ambos os eixos + critérios extra
    'top_skill',           -- top 3 no leaderboard de SKILL da season
    'top_honor',           -- top 3 no leaderboard de HONOR da season
    'presence_perfeita',   -- 100% de presença na season
    'mvp_season'           -- Pedro concede manualmente (opcional)
  )),
  
  -- Snapshot dos stats no momento do award
  mmr_final       int,
  honor_final     int,
  rank_skill      int,
  rank_honor      int,
  presence_pct    decimal(5,2),
  
  awarded_at      timestamptz not null default now(),
  unique (user_id, season_id, badge_type)
);
```

---

## 4. Algoritmo de MMR (SKILL eixo)

### 4.1 Base: Glicko-2

O FormulaDota usa **Glicko-2** como sistema de rating para o eixo SKILL. Justificativa:

- **Valve migrou de ELO para Glicko** em abril de 2023 (patch 7.33) — sinal de que Glicko é o estado da arte para jogos team-based
- **Glicko-2 lida bem com irregularidade** — players que jogam pouco têm maior variância (RD = Rating Deviation). Isso é correto para uma inhouse league onde nem todos jogam toda semana
- **ELO simples superestima performance recente** — um player que vence 5 seguidas com oponentes fracos sobe demais. Glicko-2 corrigi isso via RD

```typescript
// player_season_mmr — após cada partida

interface GlickoPlayer {
  rating:    number;  // MMR (escala interna: 1000 base)
  deviation: number;  // RD — incerteza sobre o rating (começa 200, decresce com partidas)
  volatility: number; // σ — volatilidade (muda pouco em V1 — usar 0.06 padrão)
}

// Após uma partida: atualizar ratings de ambos os times com base no resultado
// Implementação: usar biblioteca `glicko2-typescript` ou port próprio do algoritmo
// Referência: http://www.glicko.net/glicko/glicko2.pdf

// Calibração (5 primeiras partidas):
// - RD começa em 200 (máxima incerteza)
// - Após calibração: RD cai para ~80-100
// - MMR muda mais durante calibração (sistema aprendendo)

// Seed inicial de cada season:
// - Se player jogou season anterior: mmr_inicio = mmr_anterior * (1 - skill_reset_percent/100)
// - Se player é novo: mmr_inicio = seasons.mmr_start (1000 padrão)
// - RD reset a cada season: 150 (memória parcial do rating anterior)
```

### 4.2 Tiers e estrelas (mapeamento MMR → tier visual)

Inspirado no sistema visual do Dota 2 mas com escala interna:

| Tier | MMR mínimo | MMR máximo | Estrelas |
|---|---|---|---|
| Herald | 0 | 999 | 1-5 (por 200 pts) |
| Guardian | 1000 | 1399 | 1-5 |
| Crusader | 1400 | 1799 | 1-5 |
| Archon | 1800 | 2199 | 1-5 |
| Legend | 2200 | 2599 | 1-5 |
| Ancient | 2600 | 2999 | 1-5 |
| Divine | 3000 | 3399 | 1-5 |
| Immortal | 3400+ | — | Rank numérico |

*Nota: escala calibrada para uma season de 3 meses com ~3 partidas/semana. Revisar após Season 1 com dados reais.*

### 4.3 Reset parcial entre seasons

```
MMR season N+1 início = max(mmr_start, floor(mmr_final_season_N * (1 - skill_reset_percent/100)))

Exemplo:
- Player fechou Season 1 com 2.800 MMR (Ancient 5)
- skill_reset_percent = 30%
- MMR início Season 2 = floor(2800 * 0.70) = 1.960 (Archon 2)

Isso cria:
1. Urgência de manter posição a cada season
2. Oportunidade para novos players alcançarem veteranos
3. Não apaga completamente o histórico (player bom começa acima da média)
```

---

## 5. Algoritmo de HONOR (HONOR eixo)

### 5.1 Estrutura do cálculo

HONOR score é a soma dos eventos registrados em `honor_ledger` para o player na season ativa. É um número inteiro que começa em `seasons.honor_start` (1000 padrão) e move para cima ou para baixo conforme eventos.

```
HONOR atual = honor_inicio + Σ(honor_ledger.delta)
             onde honor_ledger.season_id = season_atual
             e honor_ledger.user_id = player
```

O cálculo é feito em tempo real via trigger PostgreSQL que reage a inserts em `honor_ledger`:

```sql
create or replace function update_honor_atual()
returns trigger
language plpgsql
security definer
as $$
begin
  update player_season_honor
  set
    honor_atual = honor_inicio + (
      select coalesce(sum(delta), 0)
      from honor_ledger
      where user_id = new.user_id
        and season_id = new.season_id
    ),
    updated_at = now()
  where user_id = new.user_id
    and season_id = new.season_id;

  return new;
end;
$$;

create trigger honor_ledger_after_insert
  after insert on honor_ledger
  for each row
  execute function update_honor_atual();
```

### 5.2 Tabela de deltas de HONOR

Os valores abaixo são **defaults sugeridos**. Os valores finais são definidos em `docs/foundations/HONOR_SYSTEM.md` (Agent G responsável). Esta spec registra a lógica de negócio, não os pesos finais.

| Evento (source) | Delta sugerido | Justificativa |
|---|---|---|
| `self_review` — 4+ critérios positivos | +8 | Reflexão honesta e positiva |
| `self_review` — 2-3 critérios positivos | +4 | Reflexão parcialmente positiva |
| `self_review` — 0-1 critérios positivos | 0 | Neutro — sem punição por honestidade |
| `peer_review` — would_play_again = true (1 player) | +5 | Cada colega que quer jogar de novo |
| `peer_review` — would_play_again = false (1 player) | -3 | Colega que não quer repetir |
| `peer_review` — 4+ critérios positivos recebidos (avg) | +3 | Avaliação global positiva |
| `abandon` — early (< 10 min) | -40 | Abandono precoce: piora significativamente a partida |
| `abandon` — mid (10-30 min) | -25 | Abandono médio |
| `abandon` — late (> 30 min) | -10 | Abandono tardio: inconveniente mas partida já decidida |
| `no_show` | -15 | Confirmou fila, não apareceu |
| `presence` — 90%+ na season (calculado mensalmente) | +20 | Comprometimento de longo prazo |
| `presence` — 70-89% na season | +5 | Presença razoável |
| `streak_positive` — 5+ reviews positivos consecutivos | +10 | Consistência de conduta |
| `admin_bonus` | variável | Pedro reconhece conduta notável fora do sistema |
| `admin_strike` — leve | -20 | Strike comportamental leve (Pedro decide) |
| `admin_strike` — grave | -60 | Strike comportamental grave (Pedro decide) |
| `coach_note` — positiva | +5 | Pedro deixa nota positiva no PostMatchScreen |
| `coach_note` — negativa | -5 | Pedro deixa nota negativa no PostMatchScreen |

### 5.3 Tiers de HONOR

```
Honor tier = função(honor_atual):

'iniciante'   :   0 ≤ honor < 700    — player novo ou com muitos strikes
'discipulo'   : 700 ≤ honor < 1000   — baseline (onde todos começam)
'honrado'     : 1000 ≤ honor < 1400  — acima da média, bom comportamento
'exemplar'    : 1400 ≤ honor < 1800  — referência de conduta na comunidade
'lendario'    : 1800+                 — condutor cultural raro
```

*Nota: escala calibrada para season de 3 meses. Player que joga toda semana com conduta média deve fechar em "honrado". "Exemplar" requer esforço consistente. "Lendário" deve ser raro (< 5% dos players).*

### 5.4 Reset parcial entre seasons

```
HONOR season N+1 início = max(honor_start, floor(honor_final_season_N * (1 - honor_reset_percent/100)))

Exemplo:
- Player fechou Season 1 com 1.600 HONOR (exemplar)
- honor_reset_percent = 10% (memória mais persistente que skill)
- HONOR início Season 2 = floor(1600 * 0.90) = 1.440 (ainda exemplar)

Por que 10% e não 30%?
- Conduta é cultural — se formou durante meses de comunidade
- Não faz sentido "punir" boa conduta tão agressivamente quanto skill
- Player que foi "exemplar" tem DNA de boa conduta — começa a frente dos novatos
- Dá incentivo de longo prazo: "construir reputação de conduta vale o investimento"
```

---

## 6. Matchmaking 2-eixos

### 6.1 Filosofia do matchmaking

O matchmaking do FormulaDota não é apenas sobre equilibrar skill. É sobre equilibrar *cultura*. Dois jogadores com mesmo MMR mas comportamentos opostos não deveriam necessariamente jogar juntos — não como punição, mas como seleção natural que protege a qualidade da experiência.

### 6.2 Algoritmo de formação de lobby

```
Quando 10+ players na fila:

PASSO 1 — Pool de candidatos
  Todos os players com subscription ativa + sem ban ativo

PASSO 2 — Filtro de honor_tier mínimo da fila
  Cada fila tem um honor_tier_minimo configurável (admin define por season):
    - Fila "Livre": honor_tier >= 'iniciante' (qualquer um)
    - Fila "Honrada": honor_tier >= 'honrado'
    - Fila "Exemplar": honor_tier >= 'exemplar'
  Novos players sempre têm acesso à fila livre.
  Fila mais restrita = convivência mais homogênea.

PASSO 3 — Agrupamento por MMR similar
  Dentro do pool filtrado, selecionar 10 players com MMR mais próximos:
  - Range aceitável: ±300 MMR entre o mais alto e o mais baixo do lobby
  - Se não há 10 dentro do range: expandir para ±500
  - Se ainda insuficiente: notificar players que fila está aguardando mais jogadores

PASSO 4 — Balanceamento de times (Radiant vs Dire)
  Com os 10 selecionados, encontrar a combinação 5v5 que minimize:
  diferença_total_mmr = |soma_mmr_radiant - soma_mmr_dire|
  
  Algoritmo: brute force é viável para 10 players (C(10,5) = 252 combinações)
  Tempo estimado: < 1ms em Node.js.

PASSO 5 — Consideração de presença histórica
  Tie-break entre players de MMR equivalente: priorizar players com
  presence_percent >= 90% (mais comprometidos primeiro na fila)
  
  Reason: faz sentido que players mais comprometidos joguem mais — não como favor,
  mas como consequência natural de aparecerem mais.
```

### 6.3 Isolamento de pools por conduta

Um efeito colateral desejado do filtro de honor_tier é que **players com histórico ruim naturalmente gravitam para a fila livre**, enquanto players de boa conduta migram para filas mais restritivas.

Isso não é punição pública. É seleção natural silenciosa. Um player com HONOR baixo não recebe mensagem de "você está banido da fila honrada" — apenas não aparece no filtro dela.

O impacto a longo prazo: players tóxicos acabam em pool próprio, jouant entre si. Isso resolve o problema que ixmike88 descreveu como "ego clashes e cliques internos" sem moderação ativa.

---

## 7. Três leaderboards públicos

Phase 6 entrega três leaderboards distintos visíveis para qualquer visitante (não precisa de login para ver):

### 7.1 Leaderboard SKILL

```
Ranking SKILL — Season 1 — Fundação
Posição | Player | MMR | Tier | Partidas | Winrate
   1    | Jogador A | 2847 | Ancient 5 | 34 | 68%
   2    | Jogador B | 2703 | Ancient 4 | 41 | 61%
   ...
```

Mostra os top performers em habilidade técnica pura.

### 7.2 Leaderboard HONOR

```
Ranking HONOR — Season 1 — Fundação
Posição | Player | HONOR | Honor Tier | Presença | Elogios
   1    | Jogador C | 1892 | Lendário | 97% | 23
   2    | Jogador D | 1743 | Exemplar | 94% | 19
   ...
```

Mostra os pilares culturais da comunidade. É intencionalmente diferente do ranking SKILL — o mesmo nome no topo dos dois rankings é raro (seria o Imortal da Fórmula em potencial).

### 7.3 Leaderboard IMORTAL DA FÓRMULA

```
Imortal da Fórmula — Season 1 — Fundação
(Lista apenas quem cumpre todos os critérios)

Player | MMR | HONOR | Presença | Combined Score
  A    | 2600 | 1700 |   95%   |     98.3
```

Este é o leaderboard mais restrito. Pode ter 0 players em temporadas exigentes. Não há vergonha nisso — o título é raro por design.

---

## 8. Algoritmo Imortal da Fórmula

### 8.1 Critérios (calculados no encerramento de season)

```typescript
interface ImmortalDaFormulaCheck {
  user_id: string;
  season_id: string;
}

async function isImmortalDaFormula(check: ImmortalDaFormulaCheck): Promise<boolean> {
  const [mmrData, honorData, totalPlayers] = await Promise.all([
    getPlayerSeasonMMR(check),
    getPlayerSeasonHonor(check),
    getTotalActivePlayers(check.season_id)
  ]);

  const topFivePercentMmrThreshold = await getMmrPercentileThreshold(check.season_id, 5);
  const topFivePercentHonorThreshold = await getHonorPercentileThreshold(check.season_id, 5);

  return (
    mmrData.mmr_atual >= topFivePercentMmrThreshold &&         // top 5% em SKILL
    honorData.honor_atual >= topFivePercentHonorThreshold &&   // top 5% em HONOR
    honorData.presence_percent >= 90 &&                         // 90%+ de presença
    honorData.elogios_recebidos >= 5 &&                         // mínimo 5 elogios reais
    honorData.strikes_graves === 0                              // zero strikes graves
  );
}
```

### 8.2 Filosofia por trás dos critérios

**Top 5% em SKILL:** não é o número 1 absoluto — é o elite. Numa comunidade de 40 players, são os top 2. Acessível para quem joga com dedicação e evolui.

**Top 5% em HONOR:** ainda mais difícil que SKILL, porque HONOR não pode ser "farmado" rapidamente — é construído ao longo de meses de interações genuínas.

**90%+ de presença:** um player que some por 6 semanas e volta para as últimas 2 não pode ser Imortal da Fórmula. O comprometimento de longo prazo é parte do título.

**5+ elogios recebidos:** garante que o HONOR score não veio de uma ausência de negativos. O player deve ter ativamente inspirado colegas a o elogiarem.

**Zero strikes graves:** um strike grave (abandono precoce, comportamento grave documentado por Pedro) é suficiente para desqualificar. O título é de excelência — não tem "mas".

### 8.3 Badge permanente

```typescript
// Executado por Edge Function Supabase no fim de cada season

async function awardImmortalBadges(seasonId: string) {
  const activePlayers = await getActiveSeasonPlayers(seasonId);

  for (const player of activePlayers) {
    if (await isImmortalDaFormula({ user_id: player.id, season_id: seasonId })) {
      await supabase.from('immortal_badges').insert({
        user_id: player.id,
        season_id: seasonId,
        badge_type: 'imortal_da_formula',
        mmr_final: player.mmr_atual,
        honor_final: player.honor_atual,
        rank_skill: player.rank_skill,
        rank_honor: player.rank_honor,
        presence_pct: player.presence_percent,
        awarded_at: new Date().toISOString()
      });
    }
  }

  // Também award top 3 skill e top 3 honor
  await awardTopSkillBadges(seasonId);
  await awardTopHonorBadges(seasonId);
}
```

O badge é inserido em `immortal_badges` e **nunca expira**. Aparece no perfil do player para sempre, com season de referência: "Imortal da Fórmula — Season 1 — Fundação".

---

## 9. Hall of Fame

O Hall of Fame é uma página pública do FormulaDota que exibe o histórico de todas as seasons encerradas.

### 9.1 Estrutura

```
HALL OF FAME — FORMULADOTA

Season 1 — Fundação (Jun-Set 2026) [ENCERRADA]
  
  IMORTAL DA FÓRMULA:
  [badge dourado] Jogador A — MMR 2600 | HONOR 1700 | Presença 95%

  TOP 3 SKILL:           TOP 3 HONOR:
  1. Jogador A — 2.847   1. Jogador C — 1.892
  2. Jogador B — 2.703   2. Jogador D — 1.743
  3. Jogador E — 2.651   3. Jogador F — 1.691

  Prêmio: [Descrição do prêmio ou "Season sem premiação monetária"]
  Partidas jogadas na season: 89
  Players ativos: 23

---

Season 2 — [Em andamento ou futura]
```

### 9.2 Filosofia do Hall of Fame

O Hall of Fame é a **memória cultural da comunidade**. Não é vanity wall — é registro histórico de quem ajudou a construir o FormulaDota.

Um player que foi Imortal da Fórmula na Season 1 carrega esse título para sempre, mesmo que em seasons futuras sua performance decline. O esforço foi real. A comunidade que testemunhou é real.

---

## 10. Anti-padrões a evitar

### 10.1 Leaderboard único combinado que mascara os dois eixos

**Errado:** exibir apenas `combined_score` e esconder MMR e HONOR separados.

**Correto:** três leaderboards distintos. Combined score é apenas para calcular "Imortal da Fórmula" — não é o leaderboard principal.

### 10.2 HONOR como punição por derrota

**Errado:** sistema onde perder MMR automaticamente implica perder HONOR.

**Correto:** os dois eixos têm fontes de dados completamente separadas. Uma derrota com ótima conduta pode resultar em: MMR -25, HONOR +15. Isso é pedagogicamente correto.

### 10.3 Usar HONOR como proxy de MMR para matchmaking

**Errado:** só matchmake por MMR e ignorar HONOR tier.

**Correto:** matchmaking filtra por honor_tier_minimo da fila ANTES de equalizar por MMR. A ordem importa — conduta é filtro primário, skill é filtro secundário dentro do pool resultante.

### 10.4 Season de 1 mês

**Errado:** season muito curta impede que o HONOR se manifeste adequadamente. 30 dias = ~12 partidas se jogar 3x/semana. Insuficiente para o sistema de conduta mostrar padrões.

**Correto:** 3 meses = ~36 partidas. HONOR tem tempo para construir padrão estatisticamente relevante.

### 10.5 Reset de HONOR igual ao reset de SKILL

**Errado:** ambos os eixos resetam 30%. Isso trata conduta e skill como equivalentes em volatilidade — o que filosoficamente é incorreto.

**Correto:** SKILL reseta 30% (habilidade pode regredir sem prática). HONOR reseta apenas 10% (conduta é mais estável — quem foi exemplar provavelmente continua sendo).

### 10.6 Imortal da Fórmula calculado manualmente por Pedro

**Errado:** Pedro decide subjetivamente quem é Imortal da Fórmula.

**Correto:** algoritmo objetivo. Pedro não decide — os dados decidem. Pedro pode adicionar `admin_bonus` no honor_ledger durante a season, mas o cálculo final é automático. Isso preserva credibilidade do título.

---

## 11. RLS e segurança

```sql
-- Leaderboards são públicos (sem RLS restritiva)
alter table player_season_mmr enable row level security;
create policy "mmr_public_read"
  on player_season_mmr for select
  to anon, authenticated
  using (true);

create policy "mmr_system_write"
  on player_season_mmr for all
  to service_role
  using (true);

-- HONOR: score público, mas detalhes de reviews são do próprio player
alter table player_season_honor enable row level security;
create policy "honor_public_read"
  on player_season_honor for select
  to anon, authenticated
  using (true);  -- score agregado é público

-- immortal_badges: totalmente públicos
alter table immortal_badges enable row level security;
create policy "badges_public"
  on immortal_badges for select
  to anon, authenticated
  using (true);

-- seasons: públicas para leitura
alter table seasons enable row level security;
create policy "seasons_public"
  on seasons for select
  to anon, authenticated
  using (true);

create policy "seasons_admin_write"
  on seasons for all
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
```

---

## 12. UAT (critérios de validação futura)

- [ ] Season criada por Pedro com status 'planned' → muda para 'calibration' na data de início
- [ ] MMR de todos os players calculado corretamente com Glicko-2 após 3 partidas de teste
- [ ] Tier visual atualiza automaticamente após mudança de MMR
- [ ] HONOR score atualiza em tempo real após insert em honor_ledger
- [ ] Três leaderboards públicos carregam sem erro na rota `/ranking`
- [ ] Fila "Honrada" rejeita player com honor_tier 'discipulo' ou inferior
- [ ] Fila "Livre" aceita qualquer player com subscription ativa
- [ ] Algoritmo Imortal da Fórmula identifica corretamente players que cumprem todos os critérios
- [ ] Badge 'imortal_da_formula' inserido em immortal_badges ao encerrar season
- [ ] Hall of Fame exibe season encerrada com dados corretos
- [ ] Reset de season calcula MMR início = floor(mmr_final * 0.70) corretamente
- [ ] Reset de season calcula HONOR início = floor(honor_final * 0.90) corretamente
- [ ] Materialized view refresh_combined_leaderboard atualiza após partida

---

## 13. Referências e próximos passos

**Para implementação:**
1. Aguardar Phase 5 completa (dados de match_players e honor_ledger com dados reais)
2. Validar pesos de HONOR com Pedro e Agent G (HONOR_SYSTEM.md)
3. Criar migration completa (seasons, player_season_mmr, player_season_honor, immortal_badges)
4. Implementar triggers PostgreSQL (update_honor_atual, refresh_combined_leaderboard)
5. Implementar Edge Function de fim de season (award_immortal_badges)
6. Criar Season 1 "Fundação" com Pedro como admin (datas TBD)
7. Implementar páginas de leaderboard (Phase 7 cuida do frontend)

**Referências:**
- Glicko-2 paper: http://www.glicko.net/glicko/glicko2.pdf
- IxDL matchmaking histórico: `.planning/research/ixdl-lessons.md` §3.2
- Meta-liga implementação BR: `.planning/research/integrations.md` §1.3
- HONOR System weights: `docs/foundations/HONOR_SYSTEM.md` (Agent G)
- Filosofia 2-eixos: `docs/foundations/PHILOSOPHY.md` (Agent G)

---

*Spec criada em 2026-05-23 para alimentar execução futura de Phase 6.*
*Não modifica código existente — apenas documenta visão.*
