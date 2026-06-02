# Criacao de Partidas — Lobbies In-House Automatizados

> **Status:** Documento fundacional permanente. Decorre do redesign de progressao decidido
> por Pedro Paulo em 2026-06-02 (`.planning/PROGRESSION_REDESIGN_SPEC.md` — fonte da verdade).
> **Versao:** 1.0 — 2026-06-02
> **Relacao:** PHILOSOPHY.md (Pilar 3, Pilar 14) | PRODUCT_CORE.md (Licoes da Liga V1) |
> HONOR_SYSTEM.md (ladder 0-30, gate nivel 6) | LIGA_IMORTAL.md (gate Mistico).
>
> Se houver conflito entre este documento e um requisito pontual, este documento prevalece —
> o requisito e revisado, nao o contrario. Em conflito com PHILOSOPHY.md, PHILOSOPHY.md vence.

---

## [PRIORIDADE] — Ler antes deste documento

1. `docs/foundations/PHILOSOPHY.md` — por que existimos (Pilar 3: dois eixos; Pilar 14:
   competicao entre iguais).
2. `docs/foundations/PRODUCT_CORE.md` — secao "Licoes da Liga V1", em especial a falha #3
   (Single Point of Failure: Pedro). Este documento e a resposta arquitetonica a essa falha.
3. `docs/foundations/HONOR_SYSTEM.md` — o ladder 0-30 e o significado do nivel 6 (Aprendiz /
   doutrinado), que e o gate de entrada deste sistema.

---

## 1. O que este documento resolve

A Liga FORMULADOTA original (operada ate NOV/2025) provou a arquitetura de gating em camadas,
mas morreu por uma falha estrutural unica e documentada em PRODUCT_CORE: **os lobbies dependiam
de Pedro estar online.** Quando ele burnou, a Liga parou. Nao havia partida sem o Mestre
conectado. A dependencia operacional de uma pessoa era o teto de tudo.

Este documento define a correcao definitiva dessa falha: a **criacao automatizada de partidas**.
O lobby in-house deixa de ser um ato manual do admin e passa a ser um servico do sistema. Um
bot Steam monta o lobby sozinho — convoca os jogadores doutrinados, distribui os times, abre a
partida ranked in-house — sem que Pedro precise estar conectado.

Pedro nao desaparece. Ele deixa de ser **dependencia** e volta a ser **presenca**. O Mestre
entra nos momentos de cerimonia (lobby supervisionado, season finale, calibracao de novo PRO).
O Guardiao continua zelando pela cultura. Mas a partida do dia-a-dia roda sem ele — porque um
ecossistema que so funciona quando o fundador esta acordado nao e um ecossistema, e um gargalo.

> **Principio operacional:** nenhuma feature central do FORMULADOTA pode ter Pedro como ponto
> unico de falha. "Jogar agora" funciona com Pedro offline. Isso e lei, nao otimizacao.

---

## 2. Criacao automatizada — o que o bot faz

A partida in-house e criada por um **bot Steam** que opera de forma autonoma. O fluxo, em alto
nivel:

1. Jogadores doutrinados (nivel 6+) sinalizam disponibilidade — entram na fila.
2. Quando o pool de uma faixa de lobby fecha o numero necessario, o bot **monta o lobby**:
   cria a partida no cliente Dota, define o servidor, distribui os times.
3. O bot **convoca** os jogadores e gerencia o aceite (o nivel Critico de "PARTIDA ENCONTRADA"
   documentado em PRODUCT_CORE Secao 6).
4. A partida acontece. Ao encerrar, o resultado e sincronizado e os eventos de conduta viram
   eventos de XP no HONOR_SYSTEM (ver §6).

O admin nao e parte obrigatoria de nenhuma dessas etapas. Toda a operacao roda no servico de
bot — separado da web, lendo o banco via service role, conforme a arquitetura de bot ja
documentada.

**Voz do sistema na falha:** se o bot nao conseguir montar o lobby, a mensagem segue a voz do
Mestre, nunca apologetica nem generica. "Nao conseguimos montar a partida. Tente novamente." —
a primeira pessoa e do sistema, nao uma acusacao ao jogador (PRODUCT_CORE Secao 5).

---

## 3. As duas faixas de lobby e seus gates

Existem **duas faixas** de lobby in-house. Cada uma tem seu proprio gate. Os gates sao
distintos e nao se confundem.

| Lobby | Gate de acesso | Quem entra | Modelo |
|-------|----------------|------------|--------|
| **Livre** | **Nivel 6** (Aprendiz / doutrinado) | Qualquer jogador doutrinado, de Cruzado a Mistico, qualquer medalha Valve | **FREEMIUM** — gratuito |
| **Elite** | **Nivel 6 (doutrinado) + medalha Imortal Valve** | So doutrinados que tambem sao Imortal na Valve | Premium (monetizacao TBD — fora do escopo deste documento) |

### Lobby Livre

O lobby livre e gratuito. A unica exigencia e o **nivel 6** — ter completado a verificacao de
doutrina e metodologia e ser, portanto, doutrinado (ver HONOR_SYSTEM.md). Nao exige pagamento,
nao exige medalha Valve, nao exige nada alem da prova de conhecimento da cultura.

Ele atende a massa do ecossistema: o jogador Cruzado, Arconte ou Lenda que aceitou as 14 leis,
provou que as compreende, e quer competir em ambiente doutrinado. A skill da Valve nao filtra
quem entra aqui — a doutrina filtra.

### Lobby Elite

O lobby elite exige **dois gates simultaneos**: nivel 6 (doutrinado) **E** medalha Imortal na
Valve. So entra quem provou conhecimento da cultura **e** ja esta no topo do ladder oficial.

A medalha Valve **nunca basta sozinha**. Um Imortal que nunca se doutrinou nao acessa o lobby
elite — ele e tratado como qualquer visitante: precisa subir ao nivel 6 primeiro. A reconciliacao
disso com o ego esta em §5.

### Os dois gates nao se confundem com o ladder

O **nivel 0-30 (HONOR)** mede conduta e conhecimento e vale para TODOS. O **gate do lobby elite**
e a medalha Valve **mais** nivel 6. Sao coisas separadas:

- Um **As (nivel 24) Arconte** alcanca o topo das bandas de conduta — mas **nao** entra no
  lobby elite (falta a medalha Imortal), e nem vira Lendario/Mistico sem Divine/Imortal.
- Um **Aprendiz Imortal Valve** (nivel 6, recem-doutrinado) **entra** no lobby elite, mesmo
  nao sendo Mistico no ladder.

Nivel alto no ladder nao compra acesso ao elite. Medalha Valve nao compra acesso a nada sem
doutrina. Nao confundir os eixos — e justamente a separacao deles que protege a cultura
(PHILOSOPHY.md Pilar 3).

---

## 4. Independencia total do servico de fichas / PT-com-PRO

Os lobbies in-house deste documento sao um sistema **separado** do servico de fichas e do
PT-com-PRO (o MVP atual).

- **Fichas / PT-com-PRO** — venda de vaga para treino com um PRO, pricing descentralizado por
  PRO, revenue split 85/10/5. Documentado em PRICING_MODEL.md e REVENUE_MODEL.md. Intocado por
  este documento.
- **Lobbies in-house** — partida ranked em ambiente doutrinado, montada por bot, com as duas
  faixas de gate descritas em §3.

Os dois servicos **coexistem sem conflito** e sem dependencia mutua. Comprar ficha nao da acesso
a lobby. Estar no lobby livre nao consome ficha. O gate do lobby livre e a doutrina (nivel 6),
nao o saldo de fichas. Nenhum gate de lobby e pagamento — o lobby livre e gratuito e o elite e
gated por medalha + doutrina, nao por compra.

> **Implicacao:** ao implementar lobbies, nao acoplar o fluxo de criacao de partida ao saldo de
> fichas, ao checkout PIX, ou ao schedule de PT-com-PRO. Sao trilhos paralelos.

---

## 5. Reconciliacao filosofica

### Com "a restricao e o produto" (PRODUCT_CORE Secao 2)

PRODUCT_CORE afirma que o lobby in-house e restrito a membros com doutrina aceita, e que "a
restricao e o produto". **Isso esta preservado.**

O lobby livre ser gratuito **nao** o torna irrestrito. A restricao continua existindo — ela
apenas mudou de natureza. Antes a barreira tendia a ser pagamento ou admissao manual. Agora a
barreira e o **nivel 6: prova verificada de conhecimento da cultura**. Quem nao se doutrinou
nao entra, por mais que pague ou por mais alta que seja sua medalha Valve.

O lobby e **gratuito, nao irrestrito**. A restricao deixou de ser financeira e virou cultural —
e isso a torna mais alinhada a doutrina, nao menos. Retirar o gate de nivel 6 para crescer
seria destruir o diferencial, exatamente como retirar qualquer outra restricao seria.

### Com o ego (Pilar 14 / LIGA_IMORTAL.md)

O Pilar 14 e a Liga Imortal nascem da recusa em criar um "lobby de ego" — um espaco onde a
medalha Valve, sozinha, compra status. O lobby elite poderia ser confundido com isso. Nao e.

O lobby elite exige medalha Imortal Valve **E** doutrina (nivel 6). A medalha e **necessaria
mas nao suficiente** — exatamente o principio que rege a Liga. Como Pedro articula: a esmagadora
maioria dos Imortais Valve ainda nao vive o metodo. Por isso, mesmo eles precisam se doutrinar
(subir ao nivel 6) antes de qualquer acesso. A medalha sozinha nunca abre porta nenhuma.

Isso dissolve a critica de "lobby de ego": o que da acesso ao elite nao e o ego da medalha, e
a medalha **somada** a submissao a doutrina. O Imortal que se recusa a se doutrinar fica de
fora — sem excecao, sem atalho. O carater entra antes da skill, sempre (Pilar 3, Pilar 14).

> **Distincao critica que nao pode se perder:** o gate do lobby elite (medalha Valve + nivel 6)
> e diferente do gate da Liga Imortal (Mistico / nivel 30 sustentado — ver LIGA_IMORTAL.md).
> O lobby elite e acesso a uma faixa de partida; a Liga Imortal e competicao entre iguais ja
> doutrinados no topo do ladder. Nao tratar um como sinonimo do outro.

---

## 6. Encerramento de partida e o ladder

A partida in-house nao termina no resultado. Ela alimenta o eixo HONOR.

Ao encerrar, os eventos de conduta da partida viram **eventos de XP** no HONOR_SYSTEM (partida
completada sem abandono, commendations de companheiros, "derrota com honra", etc.) — subindo o
jogador no ladder 0-30 (niveis 6-30 sobem por conduta vivida, nao por quiz). Strikes na partida
**subtraem XP** e podem regredir o nivel. O lobby in-house e, portanto, um dos principais palcos
onde a conduta e medida continuamente.

A skill da partida (vitoria/derrota, performance tecnica) e do eixo SKILL — medida pelo MMR
Valve oficial, sincronizado por API, **nao** calculada internamente (decisao lockada — ver
HONOR_SYSTEM.md). Os dois eixos permanecem separados (Pilar 3): a partida in-house move o
HONOR; o MMR continua sendo da Valve.

---

## 7. Anti-padroes proibidos

| Anti-padrao | Por que e proibido |
|-------------|--------------------|
| Criacao de lobby que depende de Pedro online | Reintroduz a falha #3 da Liga V1 (Single Point of Failure). Bot monta sozinho. |
| Gate do lobby livre por pagamento ou medalha | O gate e doutrina (nivel 6). Lobby livre e gratuito e cultural, nao financeiro. |
| Lobby elite acessivel so com medalha Valve | Medalha e necessaria mas nao suficiente — exige tambem nivel 6 (doutrinado). |
| Acoplar criacao de partida ao saldo de fichas / PT-com-PRO | Servicos independentes. Lobby nao consome ficha; ficha nao da lobby. |
| Tratar gate do elite (medalha + nivel 6) como gate da Liga (Mistico) | Sao gates distintos. Lobby elite != Liga Imortal. |
| Usar nivel alto no ladder como acesso ao lobby elite | Bandas 0–24 sao conduta universal; Lendario/Mistico e o elite exigem medalha Valve (Divine/Imortal). Um As Arconte nao entra no elite. |
| Calcular skill interno a partir das partidas in-house | SKILL = MMR Valve externo. Decisao lockada. Partida move HONOR, nao MMR. |
| Mensagem de falha de criacao generica ("Algo deu errado") | Voz do Mestre: copy especifica, sistema em primeira pessoa, sem acusar o jogador. |

---

## Relacao com Outros Documentos

**PHILOSOPHY.md — Pilar 3 e Pilar 14:** fundamento dos dois eixos (SKILL externo / HONOR
interno) e do principio "competicao entre iguais". O lobby elite aplica "medalha necessaria
mas nao suficiente"; a partida alimenta o eixo HONOR.

**PRODUCT_CORE.md:** secao "Licoes da Liga V1" (falha #3, SPOF Pedro) e secao 2 ("a restricao
e o produto"). Este documento corrige a falha e preserva a restricao como cultural.

**HONOR_SYSTEM.md:** o ladder 0-30, o significado do nivel 6 (Aprendiz / doutrinado = gate de
entrada dos lobbies), e a conversao de eventos de partida em XP.

**LIGA_IMORTAL.md:** o gate da Liga (Mistico / nivel 30 sustentado) e distinto do gate do lobby
elite (medalha Valve + nivel 6). Nao confundir os dois.

**PRICING_MODEL.md / REVENUE_MODEL.md:** servico de fichas / PT-com-PRO — separado e independente
dos lobbies in-house deste documento.

---

*Documento fundacional permanente criado em 2026-06-02 como parte do redesign de progressao.*
*Versao 1.0 — 2026-06-02.*
