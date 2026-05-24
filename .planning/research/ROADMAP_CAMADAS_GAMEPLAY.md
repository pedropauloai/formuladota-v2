# Roadmap em Camadas de Gameplay — FormulaDota

> **Data:** 2026-05-24
> **Status:** Locked — decisao Pedro Paulo
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentacao)

---

## Visao geral

FormulaDota oferece 3 camadas progressivas de gameplay, cada uma atendendo um perfil
de jogador diferente. As camadas sao **adicionais, nao substitutivas** — V2 nao mata V1,
V3+ nao mata V2. Cada camada serve um proposito distinto dentro da filosofia do FormulaDota.

| Camada | Tecnologia principal | Publico | Status |
|--------|---------------------|---------|--------|
| V1 | Bot Discord + ranked Valve oficial | Quer subir MMR Valve + pertencer a comunidade doutrinada | Implementado (Wave 7) |
| V2 | Bot Steam + lobby Dota in-house custom | Quer treino especifico (scrim, draft, pratica focada) | Blueprint preservado |
| V3+ | Matchmaking interno + Liga Imortal | Quer ecossistema competitivo proprio entre doutrinados | Blueprint fundacional |

---

## V1 — Bot Discord + Ranked Valve (atual)

### Modelo

PRO + 4 alunos formam party via Discord. Entram na fila ranked oficial da Valve. Partida
acontece no matchmaking oficial — MMR Valve e afetado normalmente. Pos-partida: bot captura
match_id via OpenDota, dados alimentam HONOR e SKILL (MMR Valve sincronizado).

### Por que ranked Valve e nao lobby custom em V1

O lobby in-house custom via Steam Game Coordinator exigiria:
- Conta Steam bot dedicada
- node-dota2 ou go-dota2 (dependencia do GC — instavel historicamente)
- Infraestrutura adicional para gerenciar lobby states

Para V1 com 1 PRO e grupos de 4 alunos, custo de infra nao justifica ganho. A alternativa —
party Discord + fila ranked Valve — entrega a mesma experiencia para o aluno e elimina
toda dependencia do GC da Valve.

### Stack implementada

```
Discord Bot (discord.js v14)
  coordena voice channels (sala geral + sala temp de partida)
  gerencia fila e notifica PRO + alunos
  envia steam_ids dos alunos para o PRO formar party

PRO forma party manualmente no Dota 2 client
  convida 4 alunos pelo Steam
  party entra na fila ranked Valve

OpenDota API
  valida match_id apos partida (PRO digita ou bot detecta)
  retorna dados da partida para alimentar HONOR + SKILL

Supabase
  armazena match data, HONOR ledger, player_season_honor
  Realtime triggers PostMatchScreen no app web
```

### Documentacao tecnica

- `.planning/research/phase-5-bot-discord-voice-coordinator.md` — spec implementada
- `bot/` — codigo do bot Discord (discord.js v14)
- `src/app/actions/matches.ts` — Server Actions de start/finish partida

---

## V2 — Bot Steam + Lobby In-house Custom (futuro)

### Modelo

Bot Steam cria lobby privado Dota 2 com regras customizadas. NAO conta MMR Valve. Casos
de uso especificos que o modelo V1 (ranked Valve) nao atende:

- **Scrims internos PRO vs PRO** — treino que nao exige fila Valve
- **Treinos com draft especifico** — heróis definidos, forcado por regras custom
- **Modos customizados** — ex: All Random, particular pool de herois, objetivos forcados
- **Eventos comunidade fechados** — torneios internos sem interferencia do matchmaking Valve

### Por que nao V1 (o que muda)

Em V1, o party entra na fila Valve — MMR Valve e afetado, oponentes sao aleatorios (publico).
Em V2, o lobby e privado com todos os 10 jogadores controlados — sem randoms externos, sem
MMR Valve afetado, regras definidas pelo PRO ou Pedro.

### Stack futura proposta

```
go-dota2 (recomendado sobre node-dota2 — ativo em 2026, API mais estavel)
  ou node-dota2 fork mantido pela comunidade

Bot Steam dedicado (conta Steam separada da conta pessoal do PRO)
  conecta ao Steam Game Coordinator
  cria lobby via createPracticeLobby
  configura: game_mode, server_region, hero_pool (custom picks)
  convida jogadores via Steam invite system

Match data via Steam GC (nao OpenDota)
  GC retorna match data diretamente pos-partida
  sem delay de indexacao (OpenDota pode demorar 5-10 min)
  campos de comportamento disponiveis diretamente
```

### Casos de uso V2 vs V1

| Aspecto | V1 (ranked Valve) | V2 (in-house custom) |
|---------|-------------------|----------------------|
| MMR Valve afetado | Sim | Nao |
| Oponentes | Aleatorios (publico Valve) | Controlados (pool FormulaDota) |
| Hero pool | Qualquer heroi disponivel | Pode ser restrito |
| Game mode | Ranked All Pick ou Captains Mode | Qualquer modo customizado |
| Uso principal | Progressao de MMR + mentoria | Treino especifico, scrim, evento |
| Infraestrutura | Discord bot (simples) | Steam bot + GC (complexo) |

### Quando implementar V2

- 50+ alunos ativos com demanda explicita por scrim/treino custom
- Pedro identifica necessidade de treinos estruturados que V1 nao atende
- Massa critica de PROs para justificar scrims PRO vs PRO

### Blueprint preservado

Conteudo tecnico detalhado do modelo in-house custom (IxDL-style) esta em:
- `.planning/research/phase-5-v2-bot-steam-lobby-custom.md` — blueprint V2 preservado
- `.planning/research/ixdl-lessons.md` — pesquisa do modelo IxDL (ligue de referencia)

---

## V3+ — Matchmaking Interno + Liga Imortal (futuro distante)

### Modelo

Sistema de "Buscar Partida" estilo Dota oficial, mas DENTRO do ecossistema FormulaDota.
Pareia jogadores por criterios proprios (HONOR tier + MMR Valve). Desemboca na Liga Imortal
para os doutrinados mais avancados.

### O que diferencia do V1 e V2

V1 e V2 exigem que o PRO coordene a formacao da party. Em V3+, o sistema faz matchmaking
automatico — como o ranked Valve, mas com criterios FormulaDota (HONOR tier como filtro,
nao apenas MMR).

A Liga Imortal e o topo de V3+: pool fechado de Imortais da Formula competindo entre si
com stakes reais (win-rate publico, Hall of Fame permanente).

### 3 ligas paralelas

- **Liga dos PROs** — PROs competem entre si (hierarquia interna do corpo PRO)
- **Liga dos Nao-PROs** — alunos Imortais da Formula competem entre si (vitrine para PRO)
- **Liga Combinada** — eventos especiais abertos a todos os Imortais (PROs + alunos)

### Gate de elegibilidade

Apenas Imortais da Formula (tier 8 HONOR, 2+ seasons consecutivas) entram nas ligas.
MMR Valve pode ser qualquer valor — o gate e sempre HONOR do FormulaDota, nao Valve.

### Especificacao completa

`docs/foundations/LIGA_IMORTAL.md` — blueprint canonico da Liga Imortal com:
- Criterios de gate detalhados
- Mecanica de pontuacao (win-rate + HONOR delta tiebreaker)
- Tabelas de banco de dados necessarias
- Hall of Fame perpetuo
- Anti-padroes proibidos

### Quando implementar V3+

- 10+ Imortais da Formula ativos simultaneamente
- Liga vazia e contra-producente — aguardar massa critica

---

## Por que evolucao em camadas e a estrategia correta

### Validacao progressiva

Cada camada testa o modelo antes de adicionar a complexidade da proxima. V1 valida:
- O bot Discord funciona?
- Os alunos comparecem?
- A formula (PRO + 4 alunos ranked) entrega resultado?

Sem V1 validado com dados reais, V2 seria infra construida sem produto.

### ARPU e retencao crescentes

Cada camada adiciona um motivo para permanecer na plataforma:
- V1 — "Subo MMR com PRO"
- V2 — "Treino focado que o ranked nao oferece"
- V3+ — "Compito na Liga dos melhores da comunidade"

Churn em plataformas competitivas e inevitavel para quem atinge o objetivo (subiu MMR).
Cada camada posterior retem quem completou a camada anterior.

### Custo de desenvolvimento proporcional

| Camada | Complexidade tecnica | Custo estimado | Justificativa de timing |
|--------|---------------------|----------------|------------------------|
| V1 | Baixa (Discord.js + OpenDota) | $0-20/mes infra | Implementar primeiro — valida modelo |
| V2 | Media (Steam GC + go-dota2) | $10-30/mes infra | Implementar com 50+ alunos |
| V3+ | Alta (matchmaking + Liga completa) | $30-80/mes infra | Implementar com 10+ Imortais |

### Filosofia coerente em cada camada

Cada camada aprofunda a doutrina naturalmente:

- **V1** — aluno entra, aceita doutrina, joga com PRO, recebe HONOR feedback. Primeiras
  semanas de imersao cultural.
- **V2** — aluno ja tem historico HONOR, treina de forma estruturada. A doutrina e
  pratica, nao teoria.
- **V3+** — apenas os que internalizaram a doutrina por temporadas entram. A Liga e
  a expressao maxima — competicao purificada pelo gate.

---

## Camadas nao sao substitutivas

**V1 nao morre quando V2 chega.** Aluno que quer subir MMR Valve continua no V1.
Aluno que quer treino especifico vai para V2. Sao modos diferentes, nao fases de upgrade.

**V2 nao morre quando V3+ chega.** Scrims e treinos custom continuam sendo validos
mesmo para quem ja e Imortal da Formula.

**Visao final (plataforma madura):**

```
Jogador pode escolher:

[V1] Fila PRO + ranked Valve
     → "Quero subir MMR oficial com PRO"

[V2] Lobby custom + treino estruturado
     → "Quero praticar draft/scrim sem risco de MMR"

[V3+] Matchmaking interno + Liga
      → "Quero competir entre os melhores do FormulaDota" (gate: Imortal)

Os 3 modos disponiveis simultaneamente — cada um serve um proposito legitimo.
```

---

## Anti-Padroes Proibidos

| Anti-padrao | Por que e proibido |
|-------------|-------------------|
| Pular V1 para V3+ direto | Sem massa critica e dados reais de V1, V3+ nao tem substrato |
| Quebrar V1 ao implementar V2 | Cada camada deve ser independente — adicao, nao substituicao |
| Forcar usuario a "subir de camada" | Cada modo serve um perfil legitimo — sem hierarquia de valor entre modos |
| V2 antes de 50+ alunos | Steam GC e complexo demais para poucas pessoas — nao vale o custo |
| V3+ antes de 10+ Imortais | Liga vazia e contra-producente e prejudica a narrativa da plataforma |
| MMR interno paralelo em qualquer camada | HONOR e o sistema interno — MMR Valve e o externo. Nao criar terceiro eixo. |

---

## Referencias

- **V1 implementado:** `.planning/research/phase-5-bot-discord-voice-coordinator.md`
- **V2 blueprint:** `.planning/research/phase-5-v2-bot-steam-lobby-custom.md`
- **V3+ blueprint:** `docs/foundations/LIGA_IMORTAL.md`
- **Filosofia 2-eixos:** `docs/foundations/PHILOSOPHY.md` (Pilar 14)
- **HONOR como MMR interno:** `docs/foundations/HONOR_SYSTEM.md`
- **IxDL lessons (referencia V2):** `.planning/research/ixdl-lessons.md`

---

*Documento criado em 2026-05-24 como registro canonico do roadmap de camadas.*
*Versao 1.0 — 2026-05-24.*
