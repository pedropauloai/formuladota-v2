# Liga Imortal — FormulaDota

> **Data:** 2026-05-24
> **Status:** BLUEPRINT — implementar quando 10+ Imortais da Formula existirem.
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentacao)
> **Relacao:** PHILOSOPHY.md Pilar 14 | HONOR_SYSTEM.md secao "HONOR e o MMR Interno" |
> `.planning/research/ROADMAP_CAMADAS_GAMEPLAY.md` camada V3+

---

## Por que a Liga Imortal existe

### A tensao classica

Toda plataforma competitiva enfrenta uma tensao estrutural entre dois valores:

- **Valorizar vitoria** — atrai publico competitivo, cria stakes reais, gera narrativas
- **Valorizar conduta** — e a filosofia central do FormulaDota, Pilar 4 e 11

O problema: quando os dois valores coexistem no mesmo espaco sem separacao, um sempre corroi
o outro. Ou vitoria passa a ser conquistada a qualquer custo (destruindo conduta), ou conduta
vira criterio que relativiza vitoria (destruindo competitividade).

A solucao do FormulaDota nao e balancear os dois valores. E **separa-los por gate de
elegibilidade.**

### A solucao arquitetonica

```
FORA da Liga: HONOR e a metrica unica que importa
              Conduta constroi reputacao, acesso, identidade cultural

GATE da Liga: Imortal da Formula (tier 8 HONOR, 2+ seasons consecutivas)
              So entra quem provou nao se corromper por ego

DENTRO da Liga: Vitorias contam
                Competicao e saudavel porque os jogadores ja sao doutrinados
```

Quem entra na Liga ja demonstrou, ao longo de temporadas, que nao se corrompe por ego.
Competir contra quem te respeita e fundamentalmente diferente de competir contra quem
te tolera. A Liga e onde os doutrinados se medem entre si — sem risco de contaminar a
filosofia, porque o gate ja fez a filtragem.

**Referencia filosofica:** PHILOSOPHY.md Pilar 14 — "Competicao entre Iguais".

---

## Gate de Elegibilidade

Um jogador pode participar da Liga Imortal apenas se satisfizer **todos** os criterios
simultaneamente:

| Criterio | Descricao | Verificacao tecnica |
|----------|-----------|---------------------|
| Imortal da Formula ativo | Tier 8 HONOR na temporada corrente | `honor_scores.tier = 'imortal-da-formula'` |
| Sustentacao de 2+ seasons | Manteve tier Honrado+ por 2 seasons consecutivas | `honor_tier_history` — ultimas 2 seasons |
| Historico limpo | Zero strikes graves em todo historico permanente | `honor_ledger` — nenhum `severity = 'grave'` |
| Presenca minima | Minimo 90% de presenca na last season | `player_season_honor.presence_percent >= 90` |
| Mentoria comprovada | Minimo 3 commendations do tipo "mentor" recebidas na carreira | `peer_commendations` tipo "mentor", all-time |

**Nota sobre Imortal Valve:** jogador pode ser Imortal da Valve (top 0.5% MMR) sem
ser elegivel para a Liga FormulaDota. Os criterios da Liga sao internos — Imortal Valve
e uma conquista da Valve, nao do FormulaDota. O gate e Imortal da Formula (tier 8 HONOR
do FormulaDota), nao a medalha da Valve.

---

## As 3 Ligas Paralelas

FormulaDota mantem 3 ligas simultaneas, cada uma atendendo um perfil de participante.
As 3 ligas existem em paralelo — nao sao substitutivas.

### Liga dos Nao-PROs

**Pool:** alunos que atingiram Imortal da Formula mas ainda nao foram promovidos a PRO.

**Filosofia:** alunos competem entre iguais — provam merito interno antes de elegibilidade
a PRO. Serve como vitrine de capacidade competitiva para o processo de promocao PRO.

**Objetivo:** identificar quem dentro dos Imortais da Formula demonstra consistencia
competitiva alem da conduta.

**Season:** 3 meses, alinhada com seasons de HONOR.

### Liga dos PROs

**Pool:** PROs ativos (Pedro + Imortais da Formula promovidos a PRO).

**Filosofia:** mestres competindo entre mestres. A hierarquia interna do corpo PRO
e definida aqui — nao por antiguidade ou relacionamento, mas por performance entre
os pares.

**Objetivo:** reconhecimento de merito dentro do corpo PRO + narrativa publica de
que os PROs sao os melhores do ecossistema FormulaDota.

**Season:** 3 meses.

### Liga Combinada (eventos especiais)

**Pool:** Imortais da Formula (alunos) + PROs juntos no mesmo torneio.

**Filosofia:** evento de comunidade que une todos os doutrinados. Mostra que PRO
e Nao-PRO podem competir no mesmo espaco com respeito mutuo — algo impossivel no
matchmaking publico anonimo.

**Frequencia:** sob demanda de Pedro (mensal? trimestral? eventos especiais?).
Nao e season continua — e torneio de curacao.

**Objetivo:** celebracao coletiva, narrativa de comunidade, visibilidade publica
dos melhores de cada grupo.

---

## Mecanica de Pontuacao (todas as 3 ligas)

### Metrica primaria: Win-rate dentro da Liga durante a season

Apenas partidas dentro da Liga contam para o ranking. Partidas do ranked Valve
oficial (fora da Liga) nao afetam o ranking da Liga.

### Tiebreaker: HONOR delta na season

Quando dois jogadores tem win-rate identico, o tiebreaker e quem teve maior
ganho de HONOR na season corrente.

**Por que HONOR como tiebreaker e nao quantidade de partidas:**

- Reforça que conduta continua importando dentro da Liga (nao apenas fora)
- Anti-corrupcao: jogador que tenta ganhar a qualquer custo perde HONOR — vitoria
  pirrica (alto W mas baixo HONOR) nao e vitoria legitima na Liga FormulaDota
- Filosofia: a Liga e diferente do ranked Valve exatamente porque HONOR continua
  importando mesmo onde vitorias contam

### Formula de pontuacao (sketch para implementacao futura)

```
score_liga = win_rate_liga * 1000 + honor_delta_season * 0.1

ranking_liga = order by score_liga desc
tiebreaker_absoluto = mais partidas jogadas na Liga (maior amostra = mais valida)
```

*Valores sujeitos a calibragem com dados reais da Season 1 da Liga.*

---

## Temporadas da Liga

- **Duracao:** 3 meses (alinhada com seasons de HONOR)
- **Ciclo de vida:** `scheduled → active → ended → archived`
- **Inicio:** coincide com o inicio da season de HONOR (ou pode ser defasada — decisao
  de Pedro quando Liga for implementada)
- **Encerramento:** Hall of Fame perpétuo guarda top 10 por liga por season
- **Reset:** nao ha reset de win-rate — cada season começa do zero dentro da Liga

---

## Rebaixamento e Reingresso

Um jogador que perde o tier Imortal da Formula durante uma season da Liga:

- **Completa a season atual** — nao e expulso no meio de uma season ativa
- **Nao e elegivel para a proxima season** ate voltar a Imortal da Formula por
  2+ seasons consecutivas
- **Historico e permanente** — participacoes anteriores na Liga ficam no perfil
  e no Hall of Fame, mesmo que o jogador regrida depois

---

## Hall of Fame Perpetuo

Top 10 de cada liga por season + Top 1 absoluto de cada liga = badges permanentes
no perfil do jogador.

### Nomenclatura de badges

```
liga-pros-s{N}-champion         → Top 1 Liga PROs Season N
liga-pros-s{N}-top10            → Top 10 Liga PROs Season N
liga-naopros-s{N}-champion      → Top 1 Liga Nao-PROs Season N
liga-naopros-s{N}-top10         → Top 10 Liga Nao-PROs Season N
liga-combinada-{slug}-champion  → Top 1 evento Liga Combinada (ex: liga-combinada-2026-fundacao-champion)
liga-combinada-{slug}-top10     → Top 10 evento Liga Combinada
```

**Regra critica:** badges de Hall of Fame sao **permanentes**. Nao expiram. Nao
sao retirados se o jogador regredir de HONOR em seasons futuras. A conquista foi
real. A comunidade que testemunhou e real.

Isso diferencia o Hall of Fame do FormulaDota de listas de ranking estaticas:
cada conquista tem peso historico porque quem conquistou provou merito no momento
em que foi conquistada.

---

## Implementacao Tecnica (futuro)

Esta secao e referencia para quando a Liga Imortal for implementada.
Nao implementar antes de 10+ Imortais da Formula existirem — Liga vazia e
contra-producente.

### Tabelas necessarias

```sql
-- Temporadas da Liga (separadas das seasons de HONOR, mas alinhadas)
create table public.liga_seasons (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pros', 'naopros', 'combinada')),
  name text not null,             -- ex: "Liga PROs — Season 1 — Fundacao"
  slug text unique not null,      -- ex: "pros-s1-fundacao"
  season_id uuid references seasons(id), -- season de HONOR correspondente
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'ended', 'archived')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Participantes de cada Liga (validacao de gate na inscricao)
create table public.liga_participants (
  liga_season_id uuid references liga_seasons(id),
  user_id uuid references profiles(id),
  joined_at timestamptz not null default now(),
  -- Snapshot do HONOR tier no momento de inscricao (auditoria)
  honor_tier_at_join text not null,
  honor_score_at_join int not null,
  -- Metricas durante a Liga
  total_matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  win_rate decimal(5,2) generated always as (
    case when total_matches = 0 then 0
    else (wins::decimal / total_matches) * 100 end
  ) stored,
  -- HONOR delta desde o inicio da Liga (tiebreaker)
  honor_delta_since_join int not null default 0,
  -- Score calculado (atualizado por trigger pos-partida)
  liga_score decimal(10,2) generated always as (
    (case when total_matches = 0 then 0
    else (wins::decimal / total_matches) * 1000 end)
    + (honor_delta_since_join * 0.1)
  ) stored,
  primary key (liga_season_id, user_id)
);

-- Partidas registradas dentro de uma Liga (complementar a tabela matches)
create table public.liga_matches (
  id uuid primary key default gen_random_uuid(),
  liga_season_id uuid references liga_seasons(id),
  match_id uuid references matches(id), -- partida Dota registrada no FormulaDota
  played_at timestamptz not null,
  -- Participantes da Liga nesta partida (subset de match_players)
  radiant_liga_players uuid[] not null default '{}',
  dire_liga_players uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Hall of Fame perpetuo
create table public.liga_hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  liga_season_id uuid references liga_seasons(id),
  user_id uuid references profiles(id),
  badge_slug text not null, -- ex: "liga-pros-s1-champion"
  position int not null,    -- 1 = campiao, 2-10 = top10
  -- Snapshot dos stats na conquista
  wins_final int not null,
  losses_final int not null,
  win_rate_final decimal(5,2) not null,
  honor_delta_final int not null,
  liga_score_final decimal(10,2) not null,
  awarded_at timestamptz not null default now(),
  unique (liga_season_id, user_id, badge_slug)
);
```

### Server Actions futuras

- `enrollInLiga(ligaSeasonId)` — valida gate de elegibilidade e inscreve jogador
- `recordLigaMatch(ligaSeasonId, matchId)` — registra partida na Liga e atualiza metricas
- `calculateLigaRanking(ligaSeasonId)` — retorna ranking atual com score e posicao
- `endLigaSeason(ligaSeasonId)` — encerra Liga, calcula ranking final, concede badges
  Hall of Fame, arquiva

### Validacao de gate (pseudocodigo)

```typescript
async function validateLigaEligibility(userId: string): Promise<{
  eligible: boolean;
  reasons: string[];
}> {
  const [honorCurrent, tierHistory, strikes, presence, mentorComm] = await Promise.all([
    getHonorScore(userId, currentSeasonId),
    getHonorTierHistory(userId, 2), // ultimas 2 seasons
    getGraveStrikes(userId),
    getPresenceLastSeason(userId),
    getMentorCommendations(userId),
  ]);

  const reasons: string[] = [];

  if (honorCurrent.tier !== 'imortal-da-formula')
    reasons.push('HONOR tier atual nao e Imortal da Formula');

  if (!tierHistory.every(t => t.tier >= 'honrado'))
    reasons.push('Nao manteve tier Honrado+ por 2+ seasons consecutivas');

  if (strikes.length > 0)
    reasons.push('Historico contem strike(s) grave(s)');

  if (presence < 90)
    reasons.push('Presenca na ultima season abaixo de 90%');

  if (mentorComm < 3)
    reasons.push('Menos de 3 commendations do tipo mentor na carreira');

  return { eligible: reasons.length === 0, reasons };
}
```

### UI futura

- `/liga` — hub das 3 ligas (PROs / Nao-PROs / Combinada)
- `/liga/pros` — leaderboard Liga PROs temporada ativa
- `/liga/naopros` — leaderboard Liga Nao-PROs temporada ativa
- `/liga/combinada` — eventos especiais combinados
- `/liga/hall-of-fame` — historico perpetuo de campeoes por liga e season
- Perfil do jogador: secao "Ligas" com badges Hall of Fame permanentes

---

## Quando Implementar

**Criterio objetivo:** 10+ Imortais da Formula ativos simultaneamente.

**Justificativa:** com menos de 10, a Liga vira um torneio de 2-3 pessoas — sem
narrativa, sem competitividade real, sem incentivo de participacao. Documentar agora
como blueprint canonico. Implementar quando a massa critica existir.

**Rastreamento:** `honor_tier_history` ja guarda o historico de tiers por season.
Quando Pedro notar que 10+ jogadores tem status `imortal-da-formula`, e o momento
de ativar a Liga.

---

## Anti-Padroes Proibidos

| Anti-padrao | Por que e proibido |
|-------------|-------------------|
| Liga aberta sem gate HONOR | Quebra Pilar 14 — competicao entre iguais exige gate |
| Pontuacao apenas por skill sem tiebreaker HONOR | Perde conexao filosofica com os 2 eixos |
| Rebaixamento por criterio subjetivo | Deve ser criterio objetivo (tier HONOR) |
| Hall of Fame "soft" que apaga conquistas | Deve ser permanente — conquista historica e real |
| Importar mecanicas Valve (Glicko-2, Elo) para a Liga | Liga FormulaDota e diferente — HONOR delta e o diferencial |
| Admitir Imortal Valve sem ser Imortal da Formula | Gate e interno do FormulaDota, nao da Valve |
| Liga de 1 pessoa (sem massa critica) | Aguardar 10+ Imortais antes de ativar |

---

## Relacao com Outros Documentos

**PHILOSOPHY.md — Pilar 14:** Fundamento filosofico — "Competicao entre Iguais".
Ler antes de qualquer trabalho na Liga.

**HONOR_SYSTEM.md:** Define os 8 tiers e o algoritmo de HONOR. Liga usa tier 8 como
gate e HONOR delta como tiebreaker.

**MULTIPLICATION_MODEL.md:** A Liga dos PROs e onde o corpo PRO demonstra hierarquia
interna. Conecta com o modelo de multiplicacao por PROs.

**PRO_PROMOTION.md:** Elegibilidade PRO requer, entre outros criterios, Imortal da
Formula sustentado. Liga Nao-PROs e o espaco onde futuros PROs provam capacidade
competitiva antes da promocao.

**`.planning/research/ROADMAP_CAMADAS_GAMEPLAY.md`:** Liga Imortal e a camada V3+
do roadmap de gameplay. Ler para contexto completo de evolucao do produto.

---

*Blueprint criado em 2026-05-24 como documento fundacional canonico.*
*Nao implementar antes da massa critica de 10+ Imortais da Formula.*
*Versao 1.0 — 2026-05-24.*
