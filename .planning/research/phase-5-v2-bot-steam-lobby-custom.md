# Phase 5 V2 — Bot Steam + Lobby In-house Custom (Blueprint Futuro)

> **Status:** BLUEPRINT — nao implementar antes de 50+ alunos ativos com demanda explicita.
> **Data:** 2026-05-24
> **Autoria:** Pedro Paulo (decisor) + Agent B (documentacao)
> **Relacao com V1:** V1 usa Bot Discord + ranked Valve (ja implementado, Wave 7). Este
> documento e a especificacao da camada V2 que sera ativada quando o volume justificar.
> **Relacao com ROADMAP:** ver `.planning/research/ROADMAP_CAMADAS_GAMEPLAY.md` secao V2.

---

## O que e o modelo V2

**V1 (atual):** PRO + 4 alunos formam party via Discord, entram na fila ranked Valve oficial.
MMR Valve e afetado. Oponentes sao o publico geral do matchmaking Valve.

**V2 (futuro):** Bot Steam cria lobby privado Dota 2. Os 10 jogadores sao todos do ecossistema
FormulaDota (ou convidados especificos). MMR Valve NAO e afetado. Regras do lobby podem ser
customizadas (game mode, hero pool, etc.).

### Quando V2 faz sentido

- **Scrims PRO vs PRO**: PROs querem treinar entre si sem risco de MMR Valve
- **Treino de draft**: Pedro define herois especificos, pool restrito, Captains Mode
- **Eventos de comunidade fechados**: torneios internos sem randoms externos
- **Aulas praticas estruturadas**: Pedro define o cenario de treino (ex: "treino de laning
  heroi X vs heroi Y", "teamfight com composicoes especificas")

### O que V2 NAO substitui

V2 nao substitui V1. Aluno que quer subir MMR Valve continua no V1 (ranked oficial).
V2 e um modo adicional para treino estruturado — complementar, nao concorrente.

---

## Stack tecnica V2

### Componente principal: Steam Game Coordinator (GC)

O lobby in-house Dota 2 e criado via Steam GC (Game Coordinator) — protocolo proprietario
da Valve que gerencia lobbies, matchmaking e dados de partida em tempo real.

**Opcoes de biblioteca:**

| Biblioteca | Linguagem | Atividade (2026) | Recomendacao |
|-----------|-----------|-----------------|--------------|
| go-dota2 | Go | Ativa — comunidade pequena mas mantida | Preferida para V2 |
| node-dota2 | Node.js | Arquivada 2022 — forks existem mas sem suporte ativo | Segunda opcao |

**Recomendacao:** go-dota2 pela estabilidade relativa da linguagem Go para daemons
de longa duracao (o bot Steam precisa manter conexao persistente com o GC).

### Arquitetura do bot Steam V2

```
Bot Steam (Go + go-dota2)
  conecta ao Steam com conta bot dedicada
  autentica no Steam Game Coordinator
  cria lobby via GC.CreatePracticeLobby(config)
  configura: game_mode, server_region, hero_pool
  convida jogadores via Steam invite system (steam_id64)
  monitora lobby state (waiting → draft → in_game → post_game)
  captura match_id ao fim da partida (GC retorna diretamente)

FormulaDota API (Next.js)
  recebe match_id do bot Steam via webhook interno
  busca dados da partida (Stratz GraphQL ou Steam Web API)
  insere em Supabase: matches, match_players, honor_ledger

Discord Bot V2 (extensao do bot V1)
  notifica jogadores convidados para aceitar o convite Steam
  exibe status do lobby em channel do Discord
```

### Conta Steam dedicada

O bot Steam precisa de uma conta Steam separada da conta pessoal do PRO. Motivos:
- A conta bot precisa estar online 24/7 (impossivel com conta pessoal)
- A conta bot nao deve ter historico de partidas rankeadas que confunda o sistema
- Valve pode banir contas suspeitas de automacao — conta dedicada protege a conta principal

Requisitos da conta Steam bot:
- Steam Guard ativo (autenticacao 2FA)
- Dota 2 instalado (mesmo sem jogar — necessario para o GC)
- Steam Level minimo (> 0, para enviar convites)
- Sem restricoes de trade ou ban do VAC

---

## Captura de match data V2

### Via Steam GC (diferente do V1)

No modelo V1, o match_id e capturado via OpenDota API apos a partida (polling por steam_id
do PRO). No modelo V2, o bot Steam ja esta dentro do lobby — ele recebe o match_id
diretamente do GC quando a partida encerra.

Isso elimina:
- Delay de 5 minutos de indexacao (OpenDota)
- Risco de capturar a partida errada (V1 busca "partida recente" do PRO)
- Dependencia de API externa para match_id (GC entrega direto)

### Dados de conduta V2

Stratz GraphQL continua sendo a fonte primaria para dados de conduta pos-partida:

```graphql
query GetMatchV2($matchId: Long!) {
  match(id: $matchId) {
    id
    radiantWin
    durationSeconds
    gameMode
    players {
      steamAccountId
      isRadiant
      heroId
      hero { shortName }
      kills deaths assists
      networth goldPerMinute experiencePerMinute
      leaverStatus          # ABANDONED = 1
      behaviorScore         # 0-10000 (comportamento historico Steam)
    }
  }
}
```

---

## Configuracao de lobby V2

### Modos suportados

| Modo | game_mode | Caso de uso |
|------|-----------|-------------|
| All Pick (practice) | `ALLPICK` | Partidas de pratica livre |
| Captains Mode | `CAPTAINSDRAFT` | Treino de draft estruturado |
| All Random | `ALLRANDOM` | Treino de adaptabilidade a herois aleatórios |
| Single Draft | `SINGLEDRAFT` | Treino com pool restrito (3 herois por jogador) |

### Configuracao via painel admin (Pedro)

```typescript
interface LobbyConfig {
  game_mode: 'ALLPICK' | 'CAPTAINSDRAFT' | 'ALLRANDOM' | 'SINGLEDRAFT';
  server_region: 'SA' | 'US_EAST' | 'EU_WEST'; // SA = South America (default)
  hero_pool?: number[];    // array de hero_id — null = todos disponiveis
  lobby_name: string;      // ex: "FormulaDota Scrim S1E3"
  lobby_password: string;  // senha gerada automaticamente
  max_players: 10;         // sempre 10 para partida completa
  observers_allowed: boolean; // permite Pedro assistir sem jogar
}
```

---

## Flow completo da partida V2

```
[1] PEDRO CRIA EVENTO V2
  Pedro define: tipo de evento (scrim/treino/torneio), modo, participantes
  App gera lobby_config automaticamente
  Bot Steam recebe config via webhook interno

[2] BOT STEAM CRIA LOBBY
  go-dota2: GC.CreatePracticeLobby(lobby_config)
  GC retorna: lobby_id + senha
  App armazena lobby_id + senha em Supabase

[3] CONVITES STEAM
  Bot Discord notifica os 10 participantes com:
  - Steam invite link (ou instrucao para buscar pelo nome do lobby)
  - Senha do lobby
  - Timer de aceite (5 min)

[4] JOGADORES ENTRAM NO LOBBY
  Dota 2 client dos jogadores abre o lobby
  Bot Steam monitora lobby state via GC
  Quando 10/10 confirmados: notifica que o lobby esta completo

[5] PARTIDA ACONTECE
  Draft (se Captains Mode) + partida dentro do Dota 2 client
  Bot Steam mantem conexao GC durante a partida
  Pedro pode entrar como observador se observers_allowed = true

[6] PARTIDA ENCERRA
  GC notifica bot Steam com match_id
  Bot Steam envia match_id para FormulaDota API (webhook interno)
  API busca dados completos via Stratz (comportamento + stats)
  Dados inseridos: matches, match_players

[7] POS-PARTIDA (igual ao V1)
  Trigger Supabase → PostMatchScreen no app de cada jogador
  Auto-reflexao + peer reviews (mesmo sistema do V1)
  HONOR delta calculado e registrado em honor_ledger
```

---

## Diferenca de HONOR no modelo V2

No modelo V1, o MMR Valve e afetado por cada partida — o HONOR delta e um complemento
ao MMR delta. No modelo V2, nao ha MMR Valve delta (lobby nao conta para ranked). O HONOR
delta e o unico mecanismo de progressao interna que a partida gera.

Isso altera a percepcao de valor: no V2, jogar bem e principalmente sobre HONOR, nao sobre
MMR. Para alunos que ja atingiram o MMR alvo no Valve, o V2 pode ser mais atraente — a
progressao relevante e toda interna (HONOR, Liga futura).

---

## Riscos e mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| Steam GC instavel (disconnects) | Media | Reconnect automatico com backoff; fallback para V1 se GC cair |
| Valve banir conta bot | Baixa | Conta bot dedicada + comportamento normal (nao automacao agressiva) |
| go-dota2 sem suporte futuro | Baixa | Avaliar alternativas (node-dota2 fork) na epoca de implementacao |
| Latencia do GC (lobby nao cria) | Baixa | Retry com timeout + notificacao manual para Pedro |
| Jogadores nao aceitam convite Steam | Media | Timer de 5 min + fallback para manual (Pedro convida via Steam direto) |

**Risco eliminado no V1 que volta no V2:** Steam GC era o maior risco de estabilidade.
O modelo V2 reintroduz essa dependencia propositalmente — em troca do ganho de lobby
customizado. Mitigacao primaria: V1 continua funcionando em paralelo. Se GC caiu, a
partida acontece via V1 (ranked Valve) ao inves de cancelar.

---

## IxDL como referencia de modelo V2

O IxDL (Immortal player inhouse league) e a referencia historica mais proxima do modelo
V2 que o FormulaDota quer implementar. Pesquisa completa disponivel em:

`.planning/research/ixdl-lessons.md` — lessons aprendidas do IxDL, incluindo:
- Como o IxDL gerenciava lobbies Steam (modelo manual vs automatizado)
- Por que o IxDL falhou em sustentar a comunidade (lições de cultura, nao de tecnologia)
- O que o FormulaDota faz diferente (HONOR, doutrina, gate de ego)

A diferenca central do FormulaDota vs IxDL: o IxDL era uma liga tecnica sem gate de
cultura. O FormulaDota ativa V2 apenas com jogadores ja doutrinados (HONOR tier minimo).
O ambiente dentro do lobby V2 e diferente porque quem esta dentro ja passou pelo filtro.

---

## UAT futuro (quando V2 for implementado)

- [ ] Conta Steam bot cria lobby com configuracao correta (mode, region, password)
- [ ] Bot Discord notifica 10 jogadores com convite Steam + senha
- [ ] Jogadores aceitam convite e aparecem no lobby (bot monitora 10/10 conectados)
- [ ] Partida acontece normalmente no Dota 2 client (sem interferencia do bot)
- [ ] GC retorna match_id ao bot Steam ao fim da partida
- [ ] Bot Steam envia match_id para FormulaDota API via webhook interno
- [ ] Stratz retorna dados completos para o match_id
- [ ] Dados inseridos em matches + match_players corretamente
- [ ] PostMatchScreen abre para todos os 10 jogadores (mesmo sistema do V1)
- [ ] HONOR delta calculado corretamente (sem MMR delta — V2 nao afeta ranked Valve)
- [ ] Pedro consegue criar lobby via painel admin com configuracao customizada
- [ ] Reconexao automatica do bot Steam em caso de disconnect do GC

---

## Proximos passos (quando V2 for priorizado)

1. Avaliar go-dota2 vs node-dota2 fork — teste de conexao GC com conta de teste
2. Criar conta Steam bot dedicada (Steam Guard + Dota 2 instalado)
3. Implementar bot Steam basico (criar lobby + monitorar state + capturar match_id)
4. Extender Discord bot V1 com notificacoes de lobby V2
5. Implementar webhook interno bot Steam → FormulaDota API
6. Adaptar PostMatchScreen para contexto V2 (sem MMR delta, so HONOR)
7. UAT completo com Pedro e grupo de teste (4-9 players reais)

---

## Referencias

- `ROADMAP_CAMADAS_GAMEPLAY.md` — contexto do V2 no roadmap de 3 camadas
- `.planning/research/ixdl-lessons.md` — pesquisa historica do IxDL
- `.planning/research/phase-5-bot-discord-voice-coordinator.md` — V1 implementado
- `docs/foundations/LIGA_IMORTAL.md` — camada V3+ que V2 alimenta
- go-dota2: https://github.com/paralin/go-dota2
- Steam GC protocol: https://github.com/SteamDatabase/Protobufs

---

*Blueprint criado em 2026-05-24 como especificacao canonica do modelo V2.*
*Nao implementar antes de 50+ alunos ativos com demanda explicita por scrim/lobby custom.*
*Versao 1.0 — 2026-05-24.*
