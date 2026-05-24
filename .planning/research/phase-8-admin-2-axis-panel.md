# Phase 8 — Painel Admin + Painel Player + Polish + Deploy (2-eixos)

> **Status:** Spec — não implementado. Aguarda Phase 7 (UI de ranking e perfil funcionando).
> **Data desta spec:** 2026-05-23
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentação)

**Depende de:**
- `docs/foundations/PHILOSOPHY.md` (Agent G)
- `docs/foundations/HONOR_SYSTEM.md` (Agent G — define critérios de strike e moderação)
- Milestone V2.5-F6 Component Primitives AAA-Grade
- Phase 5 completa: `honor_ledger`, `match_reviews` com dados reais
- Phase 6 completa: `seasons`, `player_season_mmr`, `player_season_honor`, `immortal_badges`
- Phase 7 completa: UI pública de ranking e perfil funcionando
- `.planning/research/phase-5-bot-steam-philosophy-aligned.md`
- `.planning/research/phase-6-mmr-seasons-2-axis.md`
- `.planning/research/phase-7-badges-2-axis-display.md`

---

## 1. Por que esta spec existe antes da implementação

Phase 8 no ROADMAP é "Painel Admin + Painel Player + Polish + Deploy" — a phase final antes do produto estar em produção.

O painel admin não é simplesmente "Pedro gerencia tudo". Com o sistema 2-eixos, Pedro tem **dois tipos de responsabilidade** distintos:

1. **Responsabilidade técnica (SKILL):** gerenciar seasons, visualizar dados de partidas, corrigir erros do bot
2. **Responsabilidade cultural (HONOR):** aplicar strikes comportamentais, revisar peer reviews, reconhecer conduta notável, ser o árbitro humano das situações que o algoritmo não resolve

O painel admin deve tornar os dois tipos de responsabilidade **claros, separados e eficientes**. Pedro não deve ter que navegar entre tabelas de banco de dados — o sistema deve apresentar decisões pendentes e ferramentas contextuais.

Esta spec define o painel admin como uma ferramenta de **moderação cultural com dados de suporte**, não apenas como CRUD de dados.

---

## 2. Filosofia do painel admin

### 2.1 Pedro não é um administrador de banco de dados

Pedro é o **coach e árbitro cultural** da comunidade FormulaDota. O painel admin deve ser uma ferramenta de trabalho, não um phpMyAdmin cosmético.

**Pergunta central do painel:** *"O que Pedro precisa saber e fazer hoje?"*

Não: "Como Pedro acessa todos os dados do sistema."

### 2.2 Decisões humanas onde o algoritmo para

O sistema 2-eixos é objetivo: MMR calculado por Glicko-2, HONOR calculado por peer reviews e eventos documentados. Mas há situações onde o algoritmo não tem resposta:

- Player abandonou a partida porque a internet caiu (Stratz marcou como abandono)
- Dois players tiveram conflito fora do jogo que contamina os reviews mútuos
- Um player fez algo notável que nenhum critério automático captura
- Um peer review parece retaliação (player A sempre dá negativo para player B independente do contexto)

Para esses casos, Pedro precisa de ferramentas de intervenção humana que:
1. São registradas (audit trail)
2. São reversíveis (com justificativa)
3. São transparentes para o player afetado (sem punições silenciosas)

### 2.3 Separação clara entre SKILL admin e HONOR admin

O painel tem duas seções claramente distintas. Misturar as responsabilidades gera confusão — Pedro precisa saber, ao abrir o painel, se está tomando uma decisão técnica (ajuste de MMR de um bug) ou uma decisão cultural (aplicar strike por conduta).

---

## 3. Dashboard admin — visão geral

### 3.1 Layout principal

```
┌─ PAINEL ADMIN — FORMULADOTA ────────────────────────────────────────────────────┐
│                                                                                 │
│  [Top bar: Logo | Season X — Ativa | [Pedro avatar] Admin]                     │
│                                                                                 │
│  ┌─ ALERTAS PENDENTES ─────────────────────────────────────────────────────────┐│
│  │  ⚠ 2 reports pendentes de revisão                         [Ver reports]    ││
│  │  ⚠ Bot Steam desconectado há 12 minutos                    [Ver status]    ││
│  │  ✓ Season 1 encerra em 14 dias                             [Ver season]    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ COLUNA SKILL ──────────────────────────────────────────┐  ┌─ COLUNA HONOR ──┐│
│  │                                                         │  │                 ││
│  │  TOP 5 MMR — Season Atual                              │  │  TOP 5 HONOR    ││
│  │  1. Jogador A — 2.847                                  │  │  1. Jogador C — 1.892 ││
│  │  2. Jogador B — 2.703                                  │  │  2. Jogador D — 1.743 ││
│  │  3. Jogador E — 2.651                                  │  │  3. Jogador F — 1.691 ││
│  │  4. Jogador G — 2.590                                  │  │  4. Jogador H — 1.620 ││
│  │  5. Jogador I — 2.510                                  │  │  5. Jogador I — 1.580 ││
│  │                                                         │  │                 ││
│  │  Média MMR: 1.847  |  Partidas hoje: 3                │  │  Média HONOR: 1.123 ││
│  │  Players calibrados: 18/23                             │  │  Com strikes graves: 1 ││
│  │                                                         │  │                 ││
│  │  [Ver ranking completo SKILL]                          │  │  [Ver ranking completo HONOR] ││
│  │                                                         │  │                 ││
│  └─────────────────────────────────────────────────────────┘  └─────────────────┘│
│                                                                                 │
│  ┌─ ÚLTIMAS PARTIDAS ──────────────────────────────────────────────────────────┐│
│  │  Partida #89 — Ontem 21:47  |  Radiant venceu  |  45min  |  [Ver detalhes]││
│  │  Partida #88 — Ontem 20:03  |  Dire venceu     |  38min  |  [Ver detalhes]││
│  │  Partida #87 — Antes de ontem 19:55  |  Radiant venceu  |  52min  |  [Ver]││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Métricas do dashboard (dual column)

**Coluna SKILL (métricas técnicas):**
- MMR médio da comunidade (season atual)
- Número de players calibrados
- Partidas jogadas hoje / esta semana / total da season
- Players ativos (jogaram na última semana)
- Status do bot Steam (online/offline/reconectando)
- Fila atual (quantos players aguardando)

**Coluna HONOR (métricas culturais):**
- HONOR médio da comunidade
- Players com strikes graves (número — alarme se > 0)
- Reports pendentes de revisão
- Peer reviews completados hoje
- PostMatchScreens pendentes (players que não fizeram reflexão)
- Players na fila "Exemplar+" vs fila "Livre" (proporção de engajamento cultural)

---

## 4. Strike management UI

### 4.1 Filosofia dos strikes

Pedro tem autoridade para aplicar strikes comportamentais que movem o HONOR de um player fora do sistema automático de peer reviews. Isso é necessário porque:

- Peer reviews são anônimos — Pedro pode ver, mas players não veem quem votou
- Algumas situações exigem intervenção imediata (comportamento no Discord, fora do jogo)
- Algumas situações o algoritmo não captura (combinação sutil de comportamentos que individualmente parecem ok)

**O strike tem três princípios obrigatórios:**
1. **Registrado**: todo strike tem audit trail (Pedro quem aplicou, quando, por quê)
2. **Comunicado**: player recebe notificação com descrição do motivo (sem anonimato de punição)
3. **Reversível**: Pedro pode desfazer um strike com justificativa (ex: investigação revelou mal-entendido)

### 4.2 Tipos de strike

| Tipo | Delta HONOR | Quando usar |
|---|---|---|
| Leve | -20 | Comunicação hostil isolada, no-show repetido (3+), comportamento levemente tóxico |
| Grave | -60 | Abandono precoce intencional, assédio documentado, multiaccounting confirmado |
| Banimento temporário | -100 + suspend | Comportamento grave com risco à saúde da comunidade |
| Banimento permanente | N/A | Casos extremos — remove acesso à plataforma |

### 4.3 Tela de aplicação de strike

```
┌─ APLICAR STRIKE ────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Player: [avatar] Jogador X                                                    │
│  HONOR atual: 1.200 (Honrado)                                                  │
│  Strikes anteriores: 1 leve (2026-07-15 — comunicação hostil)                 │
│                                                                                 │
│  Tipo de strike:                                                               │
│  ○ Leve (-20 HONOR)                                                            │
│  ○ Grave (-60 HONOR)                                                           │
│  ○ Banimento temporário (-100 HONOR + suspensão)                              │
│  ○ Banimento permanente                                                        │
│                                                                                 │
│  Duração da suspensão (se aplicável): [7 dias] [15 dias] [30 dias]           │
│                                                                                 │
│  Motivo (será comunicado ao player):                                          │
│  [Campo de texto — mínimo 50 chars, máximo 500 chars]                        │
│                                                                                 │
│  Evidence (opcional — não mostrado ao player, apenas para arquivo interno):   │
│  [Campo de texto ou link]                                                      │
│                                                                                 │
│  ⚠ Este strike será comunicado ao player por notificação e email.            │
│  ⚠ O motivo digitado acima será enviado ao player integralmente.              │
│                                                                                 │
│  [CANCELAR]                    [APLICAR STRIKE]                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Regras de negócio:**
- Motivo é obrigatório (min 50 chars) — força Pedro a articular a razão
- Motivo é enviado ao player — sem punições misteriosas
- Player não pode contestar via plataforma em V1 — pode contatar Pedro diretamente via Discord
- Strike aparece no perfil do player como "Strike registrado — [data]" sem detalhe público do motivo
- Pedro vê detalhes de todos os strikes como admin

### 4.4 Lista de strikes pendentes / histórico

```typescript
// Rota: /admin/honor/strikes

interface StrikeListProps {
  strikes: Strike[];
  filter: 'active' | 'reversed' | 'all';
}

interface Strike {
  id: string;
  userId: string;
  playerName: string;
  type: 'leve' | 'grave' | 'ban_temp' | 'ban_perm';
  delta: number;
  reason: string;           // público para o player
  evidence?: string;        // privado, só admin
  appliedAt: Date;
  reversedAt?: Date;        // null se não foi revertido
  reversalReason?: string;
  suspensionEndsAt?: Date;  // null se não é suspensão
}
```

---

## 5. Peer review aggregator

### 5.1 Propósito

O peer review aggregator permite que Pedro identifique **padrões** nos reviews recebidos por alunos, não apenas números isolados.

Um player com HONOR score 900 que recebeu 12 reviews negativos do mesmo player (A sempre dá negativo para B) é diferente de um player com HONOR score 900 que recebeu negativos de 12 players distintos. O primeiro é potencial retaliação. O segundo é padrão de conduta real.

Pedro não consegue ver isso olhando apenas o score. Precisa de ferramenta de análise.

### 5.2 Tela de aggregator

```
┌─ REVIEWS PEER — ANÁLISE ADMIN ─────────────────────────────────────────────────┐
│                                                                                 │
│  Season 1 — Fundação  |  Selecionar season: [dropdown]                        │
│                                                                                 │
│  Buscar player: [Jogador X]                                                   │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════════ │
│  REVIEWS RECEBIDOS POR Jogador X — Season 1                                   │
│                                                                                 │
│  HONOR atual: 1.200  |  Reviews totais: 42  |  Positivos: 31  |  Negativos: 11 │
│                                                                                 │
│  ┌─ BREAKDOWN POR CRITÉRIO ─────────────────────────────────────────────────── ┐│
│  │  Comunicou bem:          ████████████████░░░░  80%  (34/42)               ││
│  │  Manteve a calma:        ██████████████░░░░░░  67%  (28/42)               ││
│  │  Contribuiu positivo:    ████████████████░░░░  76%  (32/42)               ││
│  │  Mostrou disciplina:     ████████████░░░░░░░░  57%  (24/42)               ││
│  │  Would play again:       ██████████████████░░  88%  (37/42)               ││
│  └───────────────────────────────────────────────────────────────────────────── ┘│
│                                                                                 │
│  ┌─ PADRÕES DETECTADOS ─────────────────────────────────────────────────────── ┐│
│  │  ⚠ Jogador Y deu reviews negativos em 5 de 6 partidas com Jogador X.      ││
│  │    Potencial padrão de retaliação. Verificar histórico de interações.      ││
│  │                                                                             ││
│  │  ✓ Nenhum player repetiu pattern de reviews negativos consistentes         ││
│  │    além de Jogador Y.                                                       ││
│  └───────────────────────────────────────────────────────────────────────────── ┘│
│                                                                                 │
│  ┌─ REVIEWS INDIVIDUAIS (identificados para admin) ───────────────────────── ┐ │
│  │  [lista de reviews por partida, com reviewer identificado]                │ │
│  │  Partida #87 — 2026-08-10                                                 │ │
│  │    Jogador Y → Jogador X: [todos negativos] "Sem comentário"              │ │
│  │    Jogador Z → Jogador X: [4 positivos, 1 negativo] "Boa comunicação"    │ │
│  └─────────────────────────────────────────────────────────────────────────── ┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Detecção automática de padrões

O sistema detecta automaticamente e alerta Pedro sobre padrões suspeitos:

```typescript
// Detectar possível retaliação
// Se reviewer A deu review negativo para reviewed B em >= 60% das partidas juntos:
// alertar Pedro com contexto

interface ReviewPatternAlert {
  type: 'possible_retaliation' | 'consistent_positive' | 'consistent_negative';
  reviewerId: string;
  reviewedId: string;
  matchCount: number;           // partidas juntos
  negativeCount: number;
  positiveCount: number;
  negativeRate: number;         // 0-1
  suggestedAction: string;      // texto explicativo para Pedro
}
```

A detecção é um alerta — não ação automática. Pedro decide o que fazer com a informação.

---

## 6. Honor adjustment manual

### 6.1 Propósito

Pedro pode dar bonus de HONOR (positivo ou negativo) fora do sistema automático, para situações que o algoritmo não captura:

**Exemplos de uso legítimo:**
- Player fez algo notável fora do jogo (ajudou 3 novatos a aprender Dota, organizou sessão de estudos)
- Player teve circunstância atenuante documentada (internet caiu, família em emergência)
- Pedro quer reconhecer publicamente um comportamento que foi além do esperado

**Não usar para:**
- Compensar derrota de MMR (os eixos são independentes)
- Punição duplicada (se já aplicou strike, não aplicar honor_adjustment negativo adicional sobre o mesmo evento)

### 6.2 Interface

```
┌─ AJUSTE MANUAL DE HONOR ────────────────────────────────────────────────────────┐
│                                                                                 │
│  Player: [avatar] Jogador X  |  HONOR atual: 1.200                            │
│                                                                                 │
│  Tipo: ○ Bônus HONOR (positivo)   ○ Penalidade HONOR (negativo)               │
│                                                                                 │
│  Delta: [+10] [+20] [+50] [personalizado: ___]                                │
│                                                                                 │
│  Motivo público (player verá no seu honor_ledger):                            │
│  [Campo de texto — máx 200 chars]                                              │
│  Exemplo: "Reconhecimento por organizar sessão de estudo S1 — Aug 2026"       │
│                                                                                 │
│  ☑ Notificar player via Discord                                               │
│  ☑ Registrar como admin_bonus/admin_strike em honor_ledger                   │
│                                                                                 │
│  [CANCELAR]                          [CONFIRMAR AJUSTE]                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Reports queue (sistema de denúncias)

### 7.1 Flow de report

```
[Player A reporta Player B no app]
         ↓
Report entra em fila "pendente"
         ↓
Pedro recebe alerta no painel admin
         ↓
Pedro investiga:
  - Ver histórico de partidas juntos
  - Ver peer reviews mútuos
  - Ver honor_ledger de B
  - Ver chat do Discord (se relevante — fora da plataforma)
         ↓
Pedro decide:
  - Arquivar (sem fundamento)
  - Aplicar strike (fundamento confirmado)
  - Aplicar ban (caso grave)
  - Aguardar mais evidências
```

### 7.2 Tabela de reports

```sql
create table if not exists player_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references profiles(id),
  reported_id   uuid references profiles(id),
  
  -- Contexto do report
  match_id      uuid references matches(id),    -- null se fora de partida
  category      text not null check (category in (
    'comportamento_toxico',
    'abandono_intencional',
    'multiaccounting',
    'assedio',
    'outro'
  )),
  description   text not null check (char_length(description) between 50 and 1000),
  
  -- Resolução
  status        text not null default 'pending'
                check (status in ('pending', 'investigating', 'resolved', 'archived')),
  resolution    text check (resolution in (
    'no_action',          -- sem fundamento
    'strike_leve',        -- strike leve aplicado
    'strike_grave',       -- strike grave aplicado
    'ban_temp',           -- banimento temporário
    'ban_perm',           -- banimento permanente
    'awaiting_evidence'   -- aguardando mais informação
  )),
  resolution_note text,  -- nota interna (só admin vê)
  resolved_by   uuid references profiles(id),
  resolved_at   timestamptz,
  
  created_at    timestamptz not null default now(),
  check (reporter_id != reported_id)
);

-- RLS: reporter vê seus reports. Admin vê todos.
alter table player_reports enable row level security;
create policy "reports_own" on player_reports for select
  to authenticated
  using (reporter_id = auth.uid());
```

### 7.3 Tela de report queue

```
┌─ REPORTS PENDENTES ─────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Filtros: [Todos] [Pendentes] [Investigando] [Resolvidos]                     │
│                                                                                 │
│  Report #12 — Pendente — 2h atrás                                             │
│  Categoria: Comportamento tóxico                                               │
│  Reportado: Jogador X (HONOR: 850 — Discípulo)                                │
│  Reporter: Jogador Y (HONOR: 1.400 — Exemplar)                                │
│  Partida: #87 (2026-08-10 21:47)                                               │
│  Descrição: "Player ficou insultando o time durante todo o jogo..."            │
│                                                                                 │
│  [Ver partida]  [Ver perfil do reportado]  [Ver peer reviews mútuos]          │
│  [ARQUIVAR]     [INVESTIGAR]     [APLICAR STRIKE]                             │
│                                                                                 │
│  ──────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│  Report #11 — Investigando — 1 dia atrás                                      │
│  ...                                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Painel player (player-facing)

Além do painel admin, Phase 8 entrega o painel do próprio player (`/me`) — sua visão pessoal dos dois eixos.

### 8.1 Diferença entre perfil público e painel player

**Perfil público (`/player/[id]`):** qualquer visitante vê. Dados agregados. Reviews privados.

**Painel player (`/me`):** só o próprio player vê. Mais detalhes. Histórico de honor_ledger. Status de PostMatchScreens pendentes.

### 8.2 Layout do painel `/me`

```
┌─ MEU PAINEL — FORMULADOTA ─────────────────────────────────────────────────────┐
│                                                                                 │
│  [avatar]  Olá, Jogador A                                                      │
│  Season 1 — Fundação  |  23 partidas  |  Membro há 60 dias                   │
│                                                                                 │
│  ┌─ PENDENTE ────────────────────────────────────────────────────────────────┐ │
│  │  ⚠ PostMatchScreen pendente — Partida #89 (ontem)         [Completar]    │ │
│  │  ⚠ Peer reviews pendentes — 3 companheiros da Partida #89  [Revisar]    │ │
│  └────────────────────────────────────────────────────────────────────────── ┘ │
│                                                                                 │
│  ┌─ MEU EIXO SKILL ────────────────────────────────────┐ ┌─ MEU EIXO HONOR ─┐ │
│  │  [DotaRankMedal Ancient 5 lg]                      │ │ [HonorRankMedal  │ │
│  │  2.847 MMR                                         │ │  Exemplar lg]    │ │
│  │  Rank #1 na season                                 │ │  1.743 HONOR     │ │
│  │  34 partidas  |  68% winrate                       │ │  Rank #2 HONOR   │ │
│  │  Streak: 3 vitórias                                │ │  Presença: 95%   │ │
│  │                                                    │ │  Elogios: 19     │ │
│  │  [Gráfico MMR — última semana]                     │ │  Strikes: 1 leve │ │
│  │                                                    │ │                  │ │
│  └────────────────────────────────────────────────────┘ └──────────────────┘ │
│                                                                                 │
│  ┌─ HISTÓRICO HONOR LEDGER (privado) ──────────────────────────────────────── ┐ │
│  │  2026-08-12  peer_review  +10  "Reviews recebidos na Partida #88"         │ │
│  │  2026-08-12  self_review  +4   "Auto-reflexão positiva — Partida #88"     │ │
│  │  2026-08-10  abandon      -25  "Abandono mid na Partida #85"              │ │
│  │  2026-08-08  presence     +5   "Presença 80%+ na semana"                  │ │
│  │  ...                                                                       │ │
│  │  [Ver histórico completo]                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ PRÓXIMAS PARTIDAS (se na fila) ────────────────────────────────────────── ┐ │
│  │  [Status da fila atual]                                                   │ │
│  │  [Botão: Entrar na fila]  (desabilitado se PostMatchScreen pendente)      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Honor ledger no painel player

O painel `/me` é o único lugar onde o player vê **detalhe de como seu HONOR está sendo movido**. Cada linha do `honor_ledger` é exibida como:

```
[data]  [source]  [delta]  [reason]
```

Exemplos:
```
2026-08-12  Peer Reviews    +10  "Avaliado positivamente por 2 companheiros na Partida #88"
2026-08-12  Auto-reflexão   +4   "4 critérios de conduta marcados na Partida #88"
2026-08-10  Abandono       -25   "Abandono mid-game registrado na Partida #85"
2026-08-01  Presença        +5   "Presença acima de 80% na primeira semana de agosto"
2026-07-28  Admin bônus    +15   "Reconhecimento: organizou sessão de estudo da Season 1"
```

Isso é **educativo** — o player entende exatamente o que move seu HONOR, podendo ajustar comportamento conscientemente.

**O que NÃO aparece:** textos dos peer reviews individuais (quem escreveu o quê). Apenas o delta e o motivo agregado.

---

## 9. Admin: gestão de season

### 9.1 Criação e configuração de season

```
┌─ CONFIGURAR SEASON ─────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Nome: [Season 1 — Fundação]                                                  │
│  Slug: [s1-fundacao] (auto-gerado, editável)                                  │
│                                                                                 │
│  Período:                                                                      │
│  Início: [01/06/2026]  Fim: [31/08/2026]                                      │
│                                                                                 │
│  Prêmio:                                                                       │
│  Valor: R$ [0,00]  (0 = season sem premiação monetária)                       │
│  Descrição: [ex: "Season sem premiação. O título é o prêmio."]               │
│                                                                                 │
│  Parâmetros de rating:                                                        │
│  MMR inicial players novos: [1000]                                            │
│  Variação por partida: ±[25] (base Glicko-2 — ajustado por MMR dos times)   │
│  HONOR inicial: [1000]                                                         │
│  Reset SKILL (season anterior): [30]%                                         │
│  Reset HONOR (season anterior): [10]%                                         │
│                                                                                 │
│  Filas disponíveis:                                                            │
│  ☑ Fila Livre (honor_tier: iniciante+)                                       │
│  ☑ Fila Honrada (honor_tier: honrado+)                                       │
│  ☐ Fila Exemplar (honor_tier: exemplar+)  (desabilitar se poucos players)   │
│                                                                                 │
│  [SALVAR RASCUNHO]           [ATIVAR SEASON]                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Encerramento de season

Pedro encerra a season manualmente (não automático por data — pode atrasar se houver problemas):

```
┌─ ENCERRAR SEASON 1 ─────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Season 1 — Fundação  |  Início: 01/06  |  Fim previsto: 31/08               │
│  Partidas jogadas: 89  |  Players ativos: 23                                  │
│                                                                                 │
│  ⚠ Candidatos a Imortal da Fórmula (pré-cálculo):                            │
│    - Jogador A: ✓ top 5% SKILL | ✓ top 5% HONOR | ✓ 95% presença | ✓ 7 elogios | ✓ 0 strikes graves │
│    - Jogador B: ✓ top 5% SKILL | ✗ top 5% HONOR (rank 8) | ...              │
│                                                                                 │
│  1 candidato qualificado para Imortal da Fórmula.                             │
│                                                                                 │
│  Ao confirmar:                                                                 │
│  - Season muda para status 'ended'                                            │
│  - Badges emitidos automaticamente (imortal + top 3 skill + top 3 honor)     │
│  - Leaderboard congela (read-only)                                            │
│  - Hall of Fame atualizado                                                    │
│  - Jogadores notificados via Discord                                          │
│                                                                                 │
│  [CANCELAR]                          [CONFIRMAR ENCERRAMENTO]                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Admin: status do bot Steam

### 10.1 Dashboard de health do bot

```
┌─ STATUS DO BOT STEAM ───────────────────────────────────────────────────────────┐
│                                                                                 │
│  Bot: FORMULADOTA_BOT  |  Status: ● ONLINE  |  Uptime: 6h 42min             │
│                                                                                 │
│  Steam GC: CONECTADO  |  Última mensagem GC: 2 min atrás                     │
│  Conta Steam: [account name]  |  Dota 2: instalado ✓                         │
│                                                                                 │
│  ┌─ ÚLTIMAS OPERAÇÕES ──────────────────────────────────────────────────────── ┐ │
│  │  21:47 — Lobby criado (Partida #89) — Senha: A3F7 — 10/10 jogadores       │ │
│  │  21:52 — Match ID capturado: 8234567890                                    │ │
│  │  21:53 — Stratz fetch iniciado (aguardando 5 min)                          │ │
│  │  21:58 — Stratz fetch bem-sucedido — dados inseridos                       │ │
│  │  21:58 — PostMatchScreen disparado para 10 players                         │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ ERROS RECENTES ─────────────────────────────────────────────────────────── ┐ │
│  │  [Nenhum erro nas últimas 24h]                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Fila atual: 3/10 players                                                      │
│  Jogadores na fila: Jogador A | Jogador B | Jogador C                         │
│                                                                                 │
│  [FORÇAR RECONEXÃO]  [VER LOGS COMPLETOS]  [CRIAR LOBBY MANUAL]              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Fallback: criar lobby manual

Se o bot estiver offline e houver uma sessão agendada, Pedro pode criar o lobby manualmente no Dota 2 e registrar o Match ID diretamente:

```
┌─ REGISTRAR PARTIDA MANUAL ─────────────────────────────────────────────────────┐
│                                                                                 │
│  (Use quando o bot Steam está offline)                                        │
│                                                                                 │
│  Match ID Dota 2: [_____________]                                              │
│                                                                                 │
│  Players (Steam ID 64):                                                       │
│  [________________________] Jogador 1                                         │
│  [________________________] Jogador 2                                         │
│  ... até 10 players                                                            │
│                                                                                 │
│  [BUSCAR DADOS DO STRATZ]    [REGISTRAR PARTIDA]                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Polish e preparação para deploy

### 11.1 Checklist de polish pré-deploy

**Performance:**
- [ ] Lighthouse score >= 90 em `/ranking` e `/player/[id]`
- [ ] First Contentful Paint (FCP) <= 1.5s em 4G simulado
- [ ] Leaderboard com 100 players: carrega < 500ms (Server Component + materialized view)
- [ ] PostMatchScreen: abre em < 300ms via Supabase Realtime

**Acessibilidade:**
- [ ] Todos os componentes navegáveis via teclado
- [ ] WCAG 2.1 AA para contraste de cores (verificar paleta vermelha/preta FORMULADOTA)
- [ ] `aria-label` em todos os ícones interativos
- [ ] `<HonorRankMedal>` e `<DotaRankMedal>` têm texto alternativo descritivo

**Responsive:**
- [ ] Mobile (375px): ranking, perfil, painel admin — sem overflow
- [ ] Tablet (768px): perfil em duas colunas funciona
- [ ] Desktop (1280px+): layout full testado

**SEO:**
- [ ] `<title>` e `<meta description>` por página
- [ ] `/ranking` e `/player/[id]` são páginas públicas com metadata adequada
- [ ] Robots.txt e sitemap.xml gerados

**Segurança:**
- [ ] RLS policies verificadas em todas as tabelas novas (Phases 5-8)
- [ ] Admin routes (`/admin/*`) verificam role='admin' no middleware
- [ ] Webhook de Season encerramento valida origem interna (não rota pública)
- [ ] Honor ledger e match_reviews: service_role para escrita (nunca client-side)

### 11.2 Variáveis de ambiente adicionais (Phase 5-8)

```
# Steam Bot
STEAM_BOT_USERNAME=         # conta Steam dedicada
STEAM_BOT_PASSWORD=         # senha da conta
STEAM_SHARED_SECRET=        # para steam-totp (2FA automático)
STEAM_IDENTITY_SECRET=      # para confirmações Steam

# Stratz
STRATZ_TOKEN=               # token Stratz GraphQL (Free Tier)

# Bot Docker
BOT_RAILWAY_URL=            # URL interna do bot no Railway
BOT_INTERNAL_SECRET=        # secret para comunicação app ↔ bot
```

### 11.3 Deploy architecture

```
Vercel (Next.js App)
  ↕ HTTPS
Supabase (PostgreSQL + Auth + Realtime + Storage)
  ↕ REST/GraphQL
Railway (Docker — Discord Bot + Steam Bot)
  ↕ GC
Steam Game Coordinator
  ↕ GraphQL
Stratz API
```

**Railway:** plano Hobby (~$3-5/mês) cobre um container Docker com o bot. Memory: 512MB deve ser suficiente para node-dota2 + Discord.js com até 50 players simultâneos.

---

## 12. Anti-padrões a evitar

### 12.1 Painel admin como CRUD disfarçado

**Errado:** painel admin é uma tabela de dados com botões de editar/deletar.

**Correto:** painel admin é uma ferramenta de trabalho contextual. Cada ação tem impacto claro comunicado. Cada decisão é registrada.

### 12.2 Strikes silenciosos

**Errado:** Pedro aplica strike, player descobre vendo seu HONOR diminuir.

**Correto:** todo strike tem notificação ativa (Discord + email) com motivo explícito. Player pode não concordar — mas não é surpreendido.

### 12.3 Peer review aggregator sem proteção de privacidade

**Errado:** o aggregator exibe os textos completos dos reviews individuais de forma que Pedro possa identificar padrões de quem escreveu o quê de forma trivial.

**Correto:** o aggregator exibe padrões mas requer investigação deliberada para chegar a conclusões sobre reviews individuais. Pedro não deve conseguir "vazar" a identidade de um reviewer para o reviewed — o anonimato entre players é protocolo, não feature.

### 12.4 Honor adjustment sem audit trail

**Errado:** Pedro ajusta HONOR de um player e a mudança não tem rastro legível.

**Correto:** todo ajuste manual insere linha em `honor_ledger` com `source='admin_bonus'` ou `source='admin_strike'`, `applied_by=pedro_uuid`, e `reason` legível. O player vê em `/me` que houve ajuste admin e qual o motivo.

### 12.5 Painel player mostrando quem o avaliou negativamente

**Errado:** `/me` exibe "Jogador Y avaliou você negativamente em 3 partidas".

**Correto:** `/me` exibe "Reviews recebidos na Partida #88: +10 HONOR" — delta agregado sem identificação de quem contribuiu positiva ou negativamente.

### 12.6 Deploy sem Stratz fallback

**Errado:** sistema de partidas não funciona se Stratz ficar offline.

**Correto:** se Stratz timeout após 30 min, match é marcado como `stratz_failed`. Pedro recebe alerta. Pode registrar resultado manualmente via painel admin. Nenhuma partida fica sem resultado indefinidamente.

---

## 13. UAT (critérios de validação futura)

**Painel Admin — Dashboard:**
- [ ] Dashboard exibe métricas SKILL e HONOR em duas colunas distintas
- [ ] Alertas de reports pendentes aparecem no topo
- [ ] Status do bot Steam exibe corretamente (online/offline/reconectando)
- [ ] Acesso a `/admin/*` bloqueado para role != 'admin' (retorna 403)

**Strike management:**
- [ ] Pedro aplica strike leve a um player de teste — HONOR delta negativo registrado em honor_ledger
- [ ] Player de teste recebe notificação Discord com o motivo do strike
- [ ] Strike aparece no histórico do painel admin com audit trail completo
- [ ] Pedro consegue reverter o strike com justificativa — delta é corrigido

**Peer review aggregator:**
- [ ] Aggregator exibe breakdown por critério com percentuais corretos
- [ ] Pattern de retaliação detectado quando um reviewer dá 5+ negativos para o mesmo reviewed
- [ ] Reviews individuais visíveis para admin com identificação do reviewer
- [ ] Nenhum reviewer identificado é exibido ao reviewed (verificar `match_reviews` RLS)

**Honor adjustment manual:**
- [ ] Admin bonus de +15 inserido em honor_ledger com `source='admin_bonus'`
- [ ] Player vê o ajuste em `/me` com o motivo
- [ ] HONOR score atualizado imediatamente via trigger PostgreSQL

**Reports:**
- [ ] Player consegue submeter report com categoria + descrição >= 50 chars
- [ ] Report aparece na fila do admin como 'pending'
- [ ] Pedro muda status para 'resolved' + aplica strike — ambas as ações registradas
- [ ] Reporter não vê detalhes de resolução (apenas status: "resolvido")

**Painel Player `/me`:**
- [ ] Honor ledger exibe todas as entradas em ordem cronológica
- [ ] Peer review textos NÃO aparecem (apenas deltas)
- [ ] Botão "Entrar na fila" desabilitado se PostMatchScreen pendente
- [ ] Gráfico de MMR exibe pontos da season atual corretamente

**Season management:**
- [ ] Pedro cria season com parâmetros customizados — season salva com status 'planned'
- [ ] Ativação de season muda status para 'calibration'
- [ ] Encerramento de season: badges emitidos, leaderboard congelado, Hall of Fame atualizado
- [ ] Imortal da Fórmula corretamente identificado e badgeado (verificar com dados de teste)

**Deploy:**
- [ ] Build Vercel sem erros TypeScript (`tsc --noEmit`)
- [ ] Lighthouse score >= 90 em `/ranking`
- [ ] Todas as rotas admin retornam 403 para usuário não-admin
- [ ] Variáveis de ambiente de produção validadas via health check route

---

## 14. Referências

- Honor ledger design: `.planning/research/phase-5-bot-steam-philosophy-aligned.md` §8
- Algoritmo Imortal da Fórmula: `.planning/research/phase-6-mmr-seasons-2-axis.md` §8
- UI de leaderboard e perfil: `.planning/research/phase-7-badges-2-axis-display.md`
- HONOR weights finais: `docs/foundations/HONOR_SYSTEM.md` (Agent G)
- Design system visual: Milestone V2.5-F2 Token Layer, V2.5-F6 Component Primitives
- IxDL burnout lessons (anti-burnout do admin): `.planning/research/ixdl-lessons.md` §6.1

---

*Spec criada em 2026-05-23 para alimentar execução futura de Phase 8.*
*Não modifica código existente — apenas documenta visão.*
*A conclusão de Phase 8 marca o FormulaDota HUB V2 completo em produção.*
