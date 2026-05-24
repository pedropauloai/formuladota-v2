# Phase 7 — Badges + Ranking + Perfil Expandido (exibição 2-eixos)

> **Status:** Spec — não implementado. Aguarda Phase 6 (dados de MMR + HONOR por season existindo no banco).
> **Data desta spec:** 2026-05-23
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentação)

**Depende de:**
- `docs/foundations/PHILOSOPHY.md` (Agent G)
- `docs/foundations/HONOR_SYSTEM.md` (Agent G)
- `docs/foundations/VISUAL_PHILOSOPHY.md` (V2.5-F1 — já criado)
- `docs/foundations/DESIGN_LANGUAGE.md` (V2.5-F1 — já criado)
- Milestone V2.5-F6 Component Primitives AAA-Grade (tokens, motion, sound)
- Phase 6 completa: `player_season_mmr`, `player_season_honor`, `immortal_badges`, `season_combined_leaderboard`
- `.planning/research/phase-5-bot-steam-philosophy-aligned.md`
- `.planning/research/phase-6-mmr-seasons-2-axis.md`

---

## 1. Por que esta spec existe antes da implementação

Phase 7 no ROADMAP é "Badges + Ranking + Perfil Expandido" — tecnicamente suficiente como título.

Mas a decisão filosófica mais importante de Phase 7 é: **como você exibe dois eixos co-primários sem hierarquizar um acima do outro?**

UI tem viés implícito. Se SKILL aparece maior, mais colorido, mais proeminente — o usuário aprende que SKILL é mais importante. Se HONOR aparece como badge pequeno ao lado do MMR — o usuário aprende que HONOR é decoração.

A forma como os dois eixos são **exibidos** é tão importante quanto como são **calculados**. Phase 7 é a face pública da filosofia 2-eixos. Esta spec define essa face antes que qualquer componente seja codificado.

---

## 2. Princípios de design para exibição 2-eixos

### 2.1 Paridade visual entre os dois eixos

Os dois eixos devem ocupar espaço visual equivalente em todos os contextos. Se SKILL tem um ícone de medal, HONOR tem um ícone de medal. Se SKILL exibe um número com tooltip, HONOR exibe um número com tooltip. Tamanho, cor e posição devem comunicar **co-primários, não principal e secundário**.

A tentação de designer inexperiente é fazer SKILL o card principal e HONOR um "detalhe adicional". Resistir ativamente a isso.

### 2.2 Cada eixo tem linguagem visual própria

**SKILL (eixo técnico):**
- Cor: azul/ciano — frio, preciso, objetivo
- Ícone: medal/escudo (referência direta aos ranks do Dota 2)
- Fonte: números grandes, monospace
- Metáfora visual: gráfico de MMR ao longo do tempo (linha ascendente/descendente)

**HONOR (eixo cultural):**
- Cor: dourado/âmbar — quente, humano, conquistado
- Ícone: chama/estrela/brasão (algo que remeta a conduta e comunidade, não a competição técnica)
- Fonte: texto mais suave, não apenas números
- Metáfora visual: pilares ou barras de critérios (comunicação, calma, disciplina...)

### 2.3 O Imortal da Fórmula tem tratamento especial único

Nas telas onde aparece "Imortal da Fórmula", o visual deve comunicar raridade e conquista combinada — não apenas skill ou apenas honor. É um terceiro estado visual que só aparece quando ambos os eixos atingiram excelência.

Inspiração: como o Dota 2 trata o Rank Imortal vs Divine — há uma distinção clara, visual imediata, que comunica "este é diferente".

### 2.4 Dados contextuais, não data dumps

Cada tela deve responder a uma pergunta central:
- Perfil: *"Quem é este jogador?"*
- Leaderboard: *"Quem está no topo e em qual dimensão?"*
- PostMatchScreen: *"O que aconteceu nesta partida e o que posso aprender?"*

Não adicionar dados porque "seria útil para alguém". Cada dado na tela deve responder à pergunta central da tela.

---

## 3. Componentes a criar

### 3.1 `<PlayerRankingRow>`

Exibe um player em listas de leaderboard. Compõe `<DotaRankMedal>` e `<HonorRankMedal>` lado a lado.

```typescript
interface PlayerRankingRowProps {
  rank: number;                    // posição no leaderboard
  player: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  skill: {
    mmr: number;
    tier: SkillTier;              // 'herald' | 'guardian' | ... | 'immortal'
    tierStars: number;
    partidas: number;
    winrate: number;
  };
  honor: {
    score: number;
    tier: HonorTier;             // 'iniciante' | 'discipulo' | 'honrado' | 'exemplar' | 'lendario'
    presence: number;
    elogios: number;
  };
  isImmortalDaFormula?: boolean;  // badge especial se true
  highlightAxis?: 'skill' | 'honor' | 'combined'; // qual eixo está sendo rankeado
  isCurrentUser?: boolean;        // destaque sutil se for o player logado
}
```

**Visual:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  #1  [avatar]  Jogador A                                                       │
│                                                                                │
│       [SKILL medal Ancient 5]  2.847 MMR    [HONOR chama Exemplar]  1.743 ⭐   │
│                                34 partidas | 68% winrate                       │
│                                            95% presença | 19 elogios           │
│                                                                                │
│  [badge dourado: Imortal da Fórmula]  (visível apenas se isImmortalDaFormula)  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Notas de implementação:**
- `highlightAxis='skill'` destaca o bloco SKILL com borda ciano mais intensa
- `highlightAxis='honor'` destaca o bloco HONOR com borda dourada mais intensa
- `highlightAxis='combined'` trata os dois com peso igual (leaderboard Imortal da Fórmula)
- `isCurrentUser` adiciona fundo sutil (não cor gritante — o player deve se identificar, não se destacar acima dos outros)
- Toda a row tem hover state com som de UI (Howler) e transição smooth (via `<FadeIn>` primitives do V2.5-F4)

### 3.2 `<DotaRankMedal>`

Componente que exibe o tier SKILL no estilo visual dos ranks do Dota 2, mas com identidade FORMULADOTA.

```typescript
interface DotaRankMedalProps {
  tier: SkillTier;
  stars: number;      // 1-5 (Herald até Divine); irrelevante para Immortal
  mmr?: number;       // exibido em tooltip
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean; // exibe texto "Ancient 5" abaixo do ícone
}
```

**Visual:** SVG ou imagem estática por tier. Inspiração: visual do Dota 2 mas com paleta FORMULADOTA (vermelho/preto/branco da brand). Não é cópia — é reimaginação no contexto da plataforma.

**Tiers visuais (da ordem de grandeza):**
- Herald: escudo simples com ornamento básico
- Guardian: escudo com detalhe duplo
- Crusader: escudo com espada cruzada
- Archon: escudo com ornamento de batalha
- Legend: escudo elaborado com detalhes dourados
- Ancient: armadura de campeão
- Divine: armadura radiante
- Immortal: coroa + estrela (estilo próprio FORMULADOTA — não replicar Valve)

### 3.3 `<HonorRankMedal>`

Análogo ao `<DotaRankMedal>` mas para o eixo HONOR. Linguagem visual diferente — não deve parecer um rank de game tradicional.

```typescript
interface HonorRankMedalProps {
  tier: HonorTier;     // 'iniciante' | 'discipulo' | 'honrado' | 'exemplar' | 'lendario'
  score?: number;      // exibido em tooltip
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showComponents?: boolean; // se true, exibe mini-barras de presença/elogios
}
```

**Visual:** chama ou símbolo de conduta, não escudo de guerra. A metáfora visual é "cuidado e crescimento", não "combate e conquista". A hierarquia HONOR deve sentir diferente da hierarquia SKILL.

**Tiers visuais:**
- Iniciante: chama pequena, cinza-fria
- Discípulo: chama branca estável
- Honrado: chama dourada
- Exemplar: chama dourada com aura
- Lendário: chama dourada com coroa de luz

### 3.4 `<HallOfFameSection>`

Seção que exibe o histórico de seasons encerradas com top 3 por categoria.

```typescript
interface HallOfFameSectionProps {
  seasons: Season[];          // seasons com status 'ended' | 'archived'
  limit?: number;             // quantas seasons exibir (default: todas)
  defaultExpanded?: boolean;  // se false, começa colapsado (default: false)
}

interface Season {
  id: string;
  name: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  prizeDescription: string | null;
  totalMatches: number;
  totalPlayers: number;
  topSkill: PlayerSnapshot[];    // top 3
  topHonor: PlayerSnapshot[];    // top 3
  immortais: PlayerSnapshot[];   // pode ser 0
}
```

**Visual:**

```
┌─ HALL OF FAME ─────────────────────────────────────────────────────────────────┐
│                                                                                │
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║  Season 1 — Fundação  |  Jun–Set 2026  |  89 partidas  |  23 players    ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                │
│  [badge dourado grande]                                                        │
│  IMORTAL DA FÓRMULA                                                           │
│  Jogador A — MMR 2.600 | HONOR 1.700 | Presença 95%                          │
│                                                                                │
│  TOP 3 SKILL              TOP 3 HONOR                                         │
│  🥇 Jogador A — 2.847     🥇 Jogador C — 1.892                               │
│  🥈 Jogador B — 2.703     🥈 Jogador D — 1.743                               │
│  🥉 Jogador E — 2.651     🥉 Jogador F — 1.691                               │
│                                                                                │
│  [Se sem Imortal: "Nenhum jogador atingiu os critérios de Imortal esta season"] │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Sem ícones emoji em produção — usar componentes SVG (conforme CLAUDE.md: "NUNCA emojis em UI")
- Hall of Fame pode ter seasons sem Imortal — isso é válido e deve ser comunicado com dignidade, não como falha
- O título "Imortal da Fórmula" deve ter tratamento visual de destaque — maior, mais dourado, mais espaço — mas sem kitsch

### 3.5 `<PlayerProfile>`

Perfil expandido de um player — a tela mais rica de Phase 7. Divide-se em dois painéis co-primários: SKILL e HONOR.

```typescript
interface PlayerProfileProps {
  playerId: string;
  currentSeason: Season;
  isOwnProfile: boolean;   // exibe controles extras se for o próprio player
}
```

**Layout do perfil:**

```
┌─ PERFIL ───────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  [avatar grande]  Jogador A           [badge: Imortal da Fórmula S1]          │
│  Membro desde: Junho 2026  |  Discord: @jogadorA  |  Steam: link              │
│                                                                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │ SKILL — Season 1               │  │ HONOR — Season 1                   │ │
│  │                                │  │                                     │ │
│  │ [DotaRankMedal Ancient 5 lg]   │  │ [HonorRankMedal Exemplar lg]       │ │
│  │ 2.847 MMR                      │  │ 1.743 HONOR                        │ │
│  │                                │  │                                     │ │
│  │ Partidas:    34               │  │ Presença:       95%                │ │
│  │ Vitórias:    23               │  │ Elogios:        19                 │ │
│  │ Derrotas:    11               │  │ Strikes leves:   1                 │ │
│  │ Winrate:     68%              │  │ Strikes graves:  0                 │ │
│  │ Peak MMR:    2.902            │  │ Peak HONOR:     1.800              │ │
│  │                               │  │                                     │ │
│  │ [Gráfico MMR ao longo do tempo]│  │ [Breakdown componentes HONOR]      │ │
│  │    ^                          │  │  Peer reviews positivos:  ████ 19  │ │
│  │    |    /\/\                  │  │  Auto-reflexões positivas: ███  14  │ │
│  │    |  /      \                │  │  Presença (bônus):         ██    5  │ │
│  │    |/         \___/           │  │  Admin bonus:               ░    0  │ │
│  │    +──────────────────        │  │  Penalidades:              ░░   -5  │ │
│  │    Sem1  Sem2  Sem3  Sem4     │  │                                     │ │
│  │                               │  │                                     │ │
│  └─────────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                                │
│  CONQUISTAS                                                                   │
│  [SeasonBadgesGallery]                                                        │
│                                                                                │
│  HISTÓRICO DE SEASONS                                                         │
│  [SeasonHistory]                                                              │
│                                                                                │
│  PARTIDAS RECENTES (se isOwnProfile = true)                                   │
│  [RecentMatches]                                                              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Notas de privacidade:**
- Gráfico de MMR: público (qualquer visitante vê)
- Breakdown de HONOR: público apenas o total. Detalhes (quantos de cada fonte) só o próprio player vê se `isOwnProfile = true`
- Partidas recentes: público
- Histórico de peer reviews: **sempre privado** — nem o próprio player vê os textos (só o score agregado)

### 3.6 `<SeasonBadgesGallery>`

Galeria de badges conquistados pelo player ao longo de todas as seasons.

```typescript
interface SeasonBadgesGalleryProps {
  badges: ImmortalBadge[];    // do banco immortal_badges
  isOwnProfile: boolean;
}
```

**Visual:** grid de badges. Cada badge exibe:
- Ícone do tipo de badge (imortal_da_formula tem ícone dourado distinto)
- Nome da season ("S1 — Fundação")
- Tooltip com stats do momento da conquista

Badges de "Imortal da Fórmula" têm destaque visual claro — maior, com animação sutil de brilho (respeitando `prefers-reduced-motion`). Badges de top 3 SKILL e HONOR são menores, monocromáticos.

**Estado vazio:** se o player ainda não tem badges, exibe mensagem encorajadora (não vazia):
```
"Sua primeira conquista está sendo construída. Continue jogando e contribuindo."
```

### 3.7 `<SeasonHistory>`

Timeline de seasons em que o player participou.

```typescript
interface SeasonHistoryProps {
  userId: string;
  seasons: SeasonSummary[];
}

interface SeasonSummary {
  seasonId: string;
  seasonName: string;
  mmrInicio: number;
  mmrFinal: number;
  honorInicio: number;
  honorFinal: number;
  rankSkill: number;
  rankHonor: number;
  partidas: number;
  badges: ImmortalBadge[];
}
```

**Visual:** lista compacta de seasons, da mais recente para a mais antiga. Cada entrada mostra:
- Nome da season
- MMR inicial → final (com ícone de seta verde/vermelho)
- HONOR inicial → final (com ícone de seta)
- Posição no ranking (top X de Y)
- Badges conquistados naquela season (miniatura)

### 3.8 `<LeaderboardPage>` (layout das 3 abas)

Página `/ranking` com três abas: **SKILL** | **HONOR** | **IMORTAL DA FÓRMULA**

```typescript
type LeaderboardTab = 'skill' | 'honor' | 'imortal';

interface LeaderboardPageProps {
  season: Season;
  defaultTab?: LeaderboardTab;
}
```

**Comportamento:**
- URL inclui aba ativa: `/ranking?tab=honor` (deep-linking)
- Aba ativa tem indicador visual claro
- Troca de aba é animada (via `<PageTransition>` primitives do V2.5-F4)
- Cada aba carrega seus dados de forma independente (Server Component com Suspense)

**Aba SKILL:** exibe `<PlayerRankingRow highlightAxis="skill">` para cada player, ordenado por `mmr_atual` desc.

**Aba HONOR:** exibe `<PlayerRankingRow highlightAxis="honor">` para cada player, ordenado por `honor_atual` desc.

**Aba IMORTAL DA FÓRMULA:**
- Se season ativa: exibe players que **já estão no caminho** (critérios sendo cumpridos — não o badge final, mas uma indicação de progresso)
- Não exibe projeções — exibe apenas fatos (quantos critérios o player atualmente cumpre)
- Badge final só aparece quando a season encerra

---

## 4. Rotas necessárias

| Rota | Componente principal | Auth | Público |
|---|---|---|---|
| `/ranking` | `<LeaderboardPage>` | Opcional | Sim |
| `/ranking?tab=skill` | `<LeaderboardPage>` aba SKILL | Opcional | Sim |
| `/ranking?tab=honor` | `<LeaderboardPage>` aba HONOR | Opcional | Sim |
| `/ranking?tab=imortal` | `<LeaderboardPage>` aba IMORTAL | Opcional | Sim |
| `/hall-of-fame` | `<HallOfFameSection>` | Opcional | Sim |
| `/player/[id]` | `<PlayerProfile>` | Opcional | Sim (parcial) |
| `/me` | `<PlayerProfile isOwnProfile>` | Obrigatório | Não |

---

## 5. Queries Supabase para UI

### 5.1 Leaderboard SKILL

```typescript
// Server Component — /ranking?tab=skill
const { data: skillLeaders } = await supabase
  .from('season_combined_leaderboard')
  .select(`
    user_id,
    username,
    avatar_url,
    mmr_atual,
    skill_tier,
    skill_tier_stars,
    skill_partidas,
    vitorias,
    derrotas,
    winrate_percent,
    rank_skill
  `)
  .eq('season_id', currentSeason.id)
  .gte('skill_partidas', 5)              // mínimo 5 partidas para aparecer no ranking
  .order('rank_skill', { ascending: true })
  .limit(100);
```

### 5.2 Leaderboard HONOR

```typescript
// Server Component — /ranking?tab=honor
const { data: honorLeaders } = await supabase
  .from('season_combined_leaderboard')
  .select(`
    user_id,
    username,
    avatar_url,
    honor_atual,
    honor_tier,
    presence_percent,
    elogios_recebidos,
    strikes_graves,
    rank_honor
  `)
  .eq('season_id', currentSeason.id)
  .gte('skill_partidas', 5)              // mesmo gate de partidas mínimas
  .order('rank_honor', { ascending: true })
  .limit(100);
```

### 5.3 Perfil completo de um player

```typescript
// Server Component — /player/[id]
const [profileData, skillData, honorData, badgesData] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', playerId).single(),
  supabase.from('player_season_mmr')
    .select('*')
    .eq('user_id', playerId)
    .eq('season_id', currentSeasonId)
    .single(),
  supabase.from('player_season_honor')
    .select('*')
    .eq('user_id', playerId)
    .eq('season_id', currentSeasonId)
    .single(),
  supabase.from('immortal_badges')
    .select('*, seasons(name, slug)')
    .eq('user_id', playerId)
    .order('awarded_at', { ascending: false })
]);
```

### 5.4 Histórico de MMR por semana (gráfico)

```typescript
// Para o gráfico de MMR ao longo do tempo no perfil
const { data: mmrHistory } = await supabase
  .from('player_mmr_history')
  .select('mmr_after, created_at')
  .eq('user_id', playerId)
  .eq('season_id', currentSeasonId)
  .order('created_at', { ascending: true });

// Agrupar por semana no lado do servidor antes de passar para o componente
// Usar date-fns para agrupamento — não passar 300 pontos para o cliente
```

---

## 6. Micro-interações e feedback

### 6.1 Hover em `<PlayerRankingRow>`

- Som: `hover` (Howler, volume baixo)
- Animação: leve elevação com `box-shadow` aumentando (via CSS transition, não JS)
- Cursor: pointer

### 6.2 Click em `<DotaRankMedal>` ou `<HonorRankMedal>`

- Som: `click`
- Tooltip aparece com informações detalhadas do tier
- Animação: `scaleIn` do tooltip

### 6.3 Badge de Imortal da Fórmula no perfil

- Animação: pulso dourado suave a cada 3 segundos (CSS animation)
- Sem animação se `prefers-reduced-motion: reduce`
- Não tocar som automático — o usuário vai ao perfil por vontade, não recebe notificação

### 6.4 Troca de aba no leaderboard

- Som: `click` leve
- Transição de conteúdo: `fadeIn` via `<FadeIn>` primitives (200ms)
- A aba anterior faz `fadeOut` antes — não flick abrupto

---

## 7. Responsive e mobile

Phase 7 deve funcionar em mobile — muitos players acessarão o perfil e ranking pelo celular.

**Estratégia por componente:**

**`<PlayerRankingRow>` mobile:**
- Avatar + nome em uma linha
- SKILL e HONOR em duas linhas verticais (não lado a lado)
- Menos dados exibidos — remover partidas e winrate, manter apenas MMR e HONOR score

**`<PlayerProfile>` mobile:**
- Painéis SKILL e HONOR: stack vertical (não dois colunas)
- Gráfico de MMR: scrollable horizontalmente
- Breakdown de HONOR: accordion (colapsado por default)

**`<HallOfFameSection>` mobile:**
- Cada season: card colapsável
- Top 3 SKILL e HONOR em lista vertical

---

## 8. Performance

### 8.1 Materialized view

O leaderboard usa `season_combined_leaderboard` (materialized view — Phase 6). Queries no leaderboard são rápidas porque leem de uma view pré-calculada.

**Refresco:** cron a cada 5 minutos para seasons ativas. Não refresca para seasons `ended` ou `archived` — dados congelados.

### 8.2 React Suspense por seção

Cada seção do perfil (`<PlayerProfile>`) deve ter seu próprio `<Suspense>` com skeleton loading:
- Skeleton do painel SKILL enquanto dados carregam
- Skeleton do painel HONOR independente
- Gráfico de MMR: skeleton de linha horizontal

Isso evita que um dado lento (ex: histórico de MMR) bloqueie a exibição do perfil inteiro.

### 8.3 Imagens de avatar

- Avatares do Discord: usar Next/Image com tamanho definido
- Fallback: avatar gerado (iniciais do username) se Discord não retornar imagem
- Não bloquear render da row por avatar — skeleton circular durante load

---

## 9. Anti-padrões a evitar

### 9.1 HONOR como decoração no perfil

**Errado:** painel HONOR pequeno, à direita, com menos destaque que SKILL.

**Correto:** painéis de igual tamanho, igual profundidade de dado, igual atenção visual.

### 9.2 "Ranking geral" como terceiro eixo dominante

**Errado:** criar um ranking único de "score combinado" que é o ranking principal, com SKILL e HONOR como sub-abas.

**Correto:** SKILL e HONOR são as duas abas principais. "Imortal da Fórmula" é a terceira aba — mais restrita, não mais importante.

### 9.3 Exibir reviews anônimos no perfil

**Errado:** mostrar textos dos peer reviews recebidos no perfil (mesmo que sem identificação do reviewer).

**Correto:** exibir apenas score agregado e componentes numéricos de HONOR. Reviews são privados do sistema de moderação.

### 9.4 Perfil vazio até o player ter dados

**Errado:** mostrar página em branco ou 404 para player que ainda não jogou nenhuma partida.

**Correto:** exibir perfil com painéis SKILL e HONOR em estado "aguardando calibração" — comunicar que 5 partidas são necessárias para aparecer no ranking. Usar `<EmptyState>` com princípio motivacional.

### 9.5 Leaderboard sem contexto de season

**Errado:** ranking global sem informar qual season está sendo exibida.

**Correto:** season selecionada sempre visível (dropdown para ver seasons anteriores). Season atual é default.

### 9.6 Badge de Imortal da Fórmula exibido durante a season

**Errado:** mostrar "provável Imortal da Fórmula" durante a season ativa — isso cria pressão e antecipação que contradiz a filosofia (o processo, não apenas o resultado).

**Correto:** o badge só aparece após o encerramento oficial da season. Durante a season, a aba "Imortal da Fórmula" mostra progresso em direção aos critérios, não o título.

---

## 10. UAT (critérios de validação futura)

- [ ] `/ranking` carrega sem erro, exibe três abas funcionais
- [ ] Aba SKILL exibe players ordenados por MMR, com `<DotaRankMedal>` visível
- [ ] Aba HONOR exibe players ordenados por HONOR score, com `<HonorRankMedal>` visível
- [ ] Aba IMORTAL DA FÓRMULA exibe critérios de progresso para season ativa
- [ ] `<PlayerProfile>` de Jogador A exibe painel SKILL e HONOR com igual destaque visual
- [ ] Painel SKILL exibe gráfico de MMR ao longo do tempo (pelo menos 3 pontos de dado)
- [ ] Painel HONOR exibe breakdown de componentes (só para próprio player)
- [ ] Badge "Imortal da Fórmula S1" aparece em player que cumpre critérios após encerramento
- [ ] `<SeasonBadgesGallery>` exibe badges com tooltip mostrando stats do momento da conquista
- [ ] `<SeasonHistory>` exibe seasons anteriores com MMR e HONOR inicial/final corretos
- [ ] `/hall-of-fame` exibe Season 1 encerrada com top 3 SKILL, top 3 HONOR, e Imortais
- [ ] Hover em `<PlayerRankingRow>` dispara som e animação
- [ ] Mobile: perfil empilha SKILL e HONOR verticalmente sem overflow
- [ ] Player sem partidas vê `<EmptyState>` com mensagem motivacional (não 404)
- [ ] Reviews anônimos NÃO são exibidos em nenhuma parte do perfil público

---

*Spec criada em 2026-05-23 para alimentar execução futura de Phase 7.*
*Não modifica código existente — apenas documenta visão.*
