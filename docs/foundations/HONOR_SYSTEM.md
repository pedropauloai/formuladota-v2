# Sistema HONOR — O Nivel da Conta (Ladder 0–30)

> **Filosofia de origem:** PHILOSOPHY.md — Pilar 3: Dois eixos separados.
> **Status:** Documento fundacional. Implementacao programada para Phase 6+.
> **Versao:** 2.0 — 2026-06-02 (redesign de progressao — Pedro Paulo)
> **Relacao:** PHILOSOPHY define por que HONOR existe. Este documento define como HONOR funciona.
> **Fonte da verdade deste redesign:** `.planning/PROGRESSION_REDESIGN_SPEC.md`.

---

## A grande mudanca: HONOR = nivel da conta (0–30), fundido com XP

**Decisao de Pedro Paulo, 2026-06-02 (revisao consciente de canone):**

> O nivel da conta (0–30) E o HONOR. XP e o combustivel que sobe o nivel.

Antes, HONOR era uma pontuacao de conduta separada (0–2100+) com 8 tiers, e XP/niveis era um
sistema gamificado paralelo. **Agora os dois sistemas fundem-se num so eixo.** O nivel da
conta vai de 0 a 30 e **e** o HONOR do jogador. As medalhas deixam de ser 8 tiers e passam a
ser **5 medalhas + estado base (Novato)**, ancoradas nos marcos de nivel 6, 12, 18, 25 e 30.
A escolha dos marcos espelha o ritmo de "ultimate do heroi" / DotaPlus, nao as 8 medalhas da Valve.

Esta e uma revisao consciente do principio antigo "HONOR e so conduta". Agora o eixo
HONOR/Nivel combina **conhecimento (entrada)** + **conduta (sustentacao)** — ver
[Como se sobe de nivel](#como-se-sobe-de-nivel-a-salvaguarda-de-integridade).

Os **dois eixos** da filosofia (Pilar 3) permanecem intactos:

- **SKILL** — externo, MMR Valve oficial (sincronizado via OpenDota), **NAO calculado internamente**.
- **HONOR / NIVEL (0–30)** — interno, este sistema. E o que muda aqui.

---

## HONOR e o Sistema de Merito Interno Operacional

**Decisao arquitetural lockada 2026-05-24 (Pedro Paulo) — permanece valida:**

> "O MMR interno JA E o nosso sistema de honor e conduta."

HONOR substitui completamente a necessidade de um MMR interno paralelo (Glicko-2, Elo
tradicional, etc.). Nao ha "skill rating" interno separado — o que importa internamente
e o nivel HONOR (0–30). O eixo SKILL e mensurado via MMR Valve oficial, sincronizado por
API (OpenDota).

### Razoes arquiteturais

1. **Skill ja e mensurado via MMR Valve oficial** (sincronizado via Steam/OpenDota API).
   Reimplementar internamente seria redundancia sem valor adicional.
2. **HONOR mede o que a Valve NAO mede**: conhecimento da doutrina, conduta, presenca,
   mentoria, maturidade emocional.
3. **Simplicidade operacional**: 1 sistema interno (HONOR = nivel) e mais coeso que 2
   (MMR interno + HONOR + XP separados). Menos superficie de bug, menos sincronizacao,
   menos custo de manutencao. A fusao XP+HONOR reforca essa coesao.
4. **Filosofia 2-eixos preservada**: SKILL (Valve oficial) + HONOR/Nivel (interno) = os 2
   eixos que importam. A distincao e externo vs interno, nao ambos internos.
5. **Liga Imortal V3+** usa o nivel HONOR como gate de elegibilidade + win-rate dentro da
   Liga (ver `docs/foundations/LIGA_IMORTAL.md`).

### O que isso descarta

- Glicko-2 interno (over-engineering)
- Elo tradicional interno
- "Calibracao de skill interno" via partidas in-house
- MMR interno paralelo ao Valve
- XP/niveis como sistema gamificado SEPARADO do HONOR (agora fundidos)

### O que isso mantém

- Sistema HONOR como **ladder unico de nivel 0–30** (Novato → Mistico)
- MMR Valve oficial como eixo SKILL externo (sincronizado, nao calculado) — **decisao lockada**
- Calibracao 3 estagios (visitante → calibrando → ranqueado) — mapeada nos niveis iniciais 0–6
- Liga Imortal V3+ usa o nivel HONOR (Mistico sustentado) como gate + win-rate como metrica interna

### Mistico (nivel 30) = portal para a Liga e para PRO

O topo do ladder (Mistico, nivel 30 sustentado) nao e apenas status visual. E o **gate de
elegibilidade para a Liga competitiva** (ver `docs/foundations/LIGA_IMORTAL.md`) e a
**condicao necessaria para elegibilidade PRO** (ver `docs/foundations/PRO_PROMOTION.md`).
O antigo tier 8 "Imortal da Formula" foi **aposentado como tier** — o topo agora e Mistico.

---

## Por que HONOR existe

O matchmaking da Valve nunca tentou medir qualidade de participacao. Seu unico criterio de
avaliacao e performance tecnica — e por design, isso e neutro em relacao a conduta.

O resultado e previsivel: jogadores tecnicamente competentes que sao destrutivos para o ambiente
ao redor deles nao pagam custo algum por esse comportamento no sistema da Valve. Quem insulta
companheiros, abandona partidas em situacoes adversas, ou recusa-se a comunicar nao perde
MMR por isso. A Valve nao tem incentivo estrutural para mudar isso.

O FormulaDota tem.

O sistema HONOR cria o que o matchmaking oficial nao cria: um custo real para comportamento
destrutivo e um valor real para comportamento exemplar. Quando voce mantém conduta impecavel
ao longo de uma temporada, seu nivel sobe e isso e visivel no seu perfil. Quando voce acumula
strikes, seu XP cai e o nivel pode regredir — e isso tambem e visivel.

HONOR nao substitui skill, e skill nao substitui HONOR. Nao se chega a Mistico so por skill (o
nivel mede conhecimento e conduta, nao MMR) — mas tambem nao so por conduta: o **topo do ladder
exige convergencia dos dois eixos**. As bandas 0–24 (Novato→As) sobem so por HONOR; **Lendario (25)
exige tambem medalha Valve Divine+ e Mistico (30) exige Imortal**. O sistema e explicitamente dual:
os dois eixos coexistem, e o apice so vem pra quem e simultaneamente competente e bom de conviver —
porque no FormulaDota, o segundo criterio importa tanto quanto o primeiro.

---

## Principios de Design do Sistema HONOR

**HONOR e conquistado, nao comprado.** Nao existe forma de pagar para subir de nivel. Nao
existe vantagem de nivel atrelada a plano de assinatura. As unicas formas de subir sao
**provar conhecimento da doutrina** (niveis 0→6) e **viver a conduta ao longo do tempo**
(niveis 6→30).

**HONOR e persistente mas nao imune ao tempo.** Reset parcial entre temporadas mantem
memoria historica enquanto cria espaco para evolucao (ou regressao). Quem se comportou
bem na Temporada 1 e se deteriorou na Temporada 2 verá o nivel cair.

**HONOR e sempre visivel.** Em qualquer tela onde o jogador aparece — perfil, card em lobby,
leaderboard, tela pos-partida — o nivel HONOR e exibido lado a lado com o tier SKILL. Sem
excecao. Esconder HONOR de qualquer superfície e uma violacao do Pilar 3 da filosofia.

**HONOR mede qualidade de participacao, nao quantidade.** Subir de nivel 6 para cima depende
de conduta vivida, nao de volume de partidas. O sistema nao pode ser acumulado por farm de
partidas — a qualidade de cada participacao e o criterio.

**Conhecer nao e viver.** Um jogador toxico pode gabaritar o quiz de doutrina e chegar ao
nivel 6 numa tarde — mas **trava ali**. De 6 para cima so sobe quem vive a doutrina. O quiz
deixa voce entrar; a conduta te leva ao topo do nivel — e o topo (Lendario/Mistico) exige ainda
a medalha Valve (Divine/Imortal). Esta e a salvaguarda de integridade central do redesign.

---

## As 6 bandas e o ladder 0–30

O nivel HONOR vai de 0 a 30. As **5 medalhas** ficam ancoradas nos marcos de nivel; abaixo do
primeiro marco, o jogador esta no estado base **Novato** (sem medalha). Os tiers HONOR sao
paralelos ao tier SKILL externo, mas com nomenclatura e simbologia propria — o badge de HONOR
nao e copia do badge de SKILL.

| Marco (nivel) | Banda | Medalha / Titulo | Significado |
|---|---|---|---|
| 0–5 | base | **Novato** (sem medalha) | Ainda nao provou conhecimento. Calibrando a doutrina. |
| **6** | 6–11 | **Aprendiz** | Completou a verificacao de doutrina + metodologia. **Doutrinado.** Gate do servico freemium (lobby livre). |
| **12** | 12–17 | **Piloto** | Esta aplicando o metodo nas partidas (metafora "Formula do Dota de Corrida"). |
| **18** | 18–24 | **As** | Dominio da pista — o piloto virou as. |
| **25** | 25–29 | **Lendario** | Referencia cultural consolidada. Guardiao da cultura. **Exige tambem medalha Valve Divine+.** |
| **30** | 30 | **Mistico** | Topo do ladder. Percepcao expandida — compreende o jogo alem do jogo. **Exige tambem medalha Valve Imortal.** |

**Regras de nomenclatura:**

- O antigo tier 8 "Imortal da Formula" e **aposentado como tier**. O topo do ladder e **Mistico (nivel 30)**.
- **PRO e um PAPEL, nao um nivel.** Chegar a Mistico (30) torna o jogador *elegivel* a PRO — a
  promocao em si exige o processo de `PRO_PROMOTION.md` (entrevista cultural, endosso, contrato).
  NAO ha promocao automatica por nivel.
- **Co-requisito de SKILL no topo (decisao Pedro 2026-06-02).** Bandas 0–24 (Novato→As) sobem so
  por HONOR. **Lendario (25) exige tambem medalha Valve Divine+; Mistico (30) exige Imortal.** A
  medalha Valve e dinamica (cai com derrotas) — o sistema le a medalha atual via **OpenDota
  continuamente**; se ela cair abaixo do requisito, o rank **regride** pro maior que o jogador
  ainda cumpre (XP **e** medalha). O apice exige convergencia dos dois eixos.
- A "Liga Imortal" mantem o nome como marca, mas seu gate de elegibilidade re-aponta do antigo
  "tier 8 Imortal da Formula" para **Mistico (nivel 30) sustentado** (ver
  [Criterio do topo](#criterio-do-topo--mistico-nivel-30)).

**Nota sobre calibracao:** Niveis 0–5 (Novato) correspondem a fase de calibracao da doutrina —
o jogador esta provando conhecimento. Atingir o nivel 6 (Aprendiz) e o momento em que se torna
**doutrinado** e calibrado. Players sem nenhum progresso de verificacao exibem "Nao calibrado".
Ver `docs/foundations/CALIBRATION.md` para o mapeamento visitante → calibrando → ranqueado nos
niveis iniciais.

**Nota sobre mobilidade:** O nivel pode subir e descer. Um jogador Lendario (nivel 25+) que
acumula strikes perde XP e pode regredir para Piloto. O sistema nao e uma conquista permanente —
e uma avaliacao continua de participacao.

**Referencia cruzada:** `.planning/research/phase-6-mmr-seasons-2-axis.md` secao 5.3 e a curva
de `level_thresholds` (migration 021) detalham como o XP cumulativo se traduz em niveis e como
o reset parcial entre temporadas funciona.

---

## Como se sobe de nivel (a salvaguarda de integridade)

O ladder 0–30 tem **duas metades com combustiveis diferentes**. Essa divisao e o coracao do
redesign: ela impede que conhecimento sem conduta (ou conduta sem conhecimento) chegue ao topo.

### Niveis 0 → 6 = CONHECIMENTO (verificacao gamificada da doutrina + metodologia)

- O usuario ganha XP a cada **informacao verificada** — questoes e checkpoints de conduta e
  de metodologia, durante o onboarding/doutrina.
- **Math do balanceamento:**
  `XP_por_questao = (XP cumulativo necessario para atingir o nivel 6) ÷ (total de questoes de conduta + metodologia)`.
  Ou seja: **completar 100% da verificacao = chegar exatamente ao nivel 6.** Os valores numericos
  exatos dependem da curva de `level_thresholds` (migration 021) + a contagem final de questoes,
  e serao calibrados.
- Atingir o nivel 6 = **Aprendiz = doutrinado** = libera o servico freemium (lobby livre).

### Niveis 6 → 30 = CONDUTA VIVIDA + JOGO (nao mais quiz)

- Daqui para cima, XP vem de **comportamento real nas partidas**. Os eventos que antes somavam
  HONOR score viram **eventos de XP**: partida completada sem abandono, commendations de
  companheiros (comunicacao / atitude / mentor), "derrota com honra", presenca de temporada,
  temporada sem strikes, etc. (ver [Algoritmo](#algoritmo-de-xp-do-nivel-honor-draft)).
- **Strikes SUBTRAEM XP e podem REGREDIR o nivel.** Um Lendario toxico pode cair para Piloto.
  Conduta nunca para de importar — o nivel e avaliacao continua, nao trofeu permanente.
- **Por que essa divisao protege a integridade:** um jogador toxico pode gabaritar o quiz e
  chegar ao nivel 6 numa tarde — mas trava ali, porque de 6 para cima so sobe quem vive a
  doutrina. Conhecer nao e viver. O quiz deixa voce entrar; so a conduta faz voce Mistico.

---

## As duas faixas de lobby + o modelo freemium

O nivel HONOR e a base do modelo de acesso aos lobbies in-house. Existem duas faixas:

| Lobby | Gate | Medalhas Valve aceitas | Modelo |
|---|---|---|---|
| **Livre** | **Nivel 6** (Aprendiz / doutrinado) | Todas | **FREEMIUM** — gratuito. Prova de doutrina e a unica exigencia. |
| **Elite** | **Nivel 6 (doutrinado) + medalha Imortal Valve** | So Imortal Valve | Premium (monetizacao TBD — fora do escopo deste doc). |

**A restricao continua sendo o produto.** O lobby livre NAO e "aberto a qualquer um" — ele exige
nivel 6 (doutrina verificada). A restricao deixou de ser pagamento/medalha e virou **prova de
conhecimento da cultura**. O lobby e gratuito, nao irrestrito (reconcilia PRODUCT_CORE §2).

**O lobby elite nao e lobby de ego.** Ele exige medalha Imortal Valve **E** doutrina (nivel 6).
A medalha e necessaria mas nao suficiente — "99,9% dos Imortais nao vivem o metodo ainda", entao
mesmo eles precisam se doutrinar. A medalha sozinha nunca da acesso (reconcilia Pilar 14 / LIGA_IMORTAL).

**Nivel ≠ acesso ao lobby elite.** O ladder 0–30 vale para TODOS (massa Cruzado-Arconte-Lenda
inclusa) ate a banda As (nivel 24), que sobe so por conduta. Um **As Arconte** alcanca o topo das
bandas de conduta, mas **nao** entra no lobby elite (falta Imortal) — e nem vira Lendario/Mistico
sem Divine/Imortal. Sao gates distintos. Nao confundir nivel com medalha.

Ver `docs/foundations/MATCH_CREATION.md` para o sistema de criacao automatizada de lobbies.

---

## Criterios de Strike — Os 15 Anti-Padroes da Doutrina

Strike e o mecanismo formal de penalizacao no eixo HONOR. No modelo de nivel, **strike
subtrai XP** e pode regredir o nivel da conta. Cada strike e um evento auditavel que cita
literalmente qual dos 15 anti-padroes da Doutrina foi violado. A mensagem ao usuario nunca e
"voce foi punido" — sempre e "voce violou o principio X que voce aceitou no onboarding".

Lista completa (referencia canonica: `A FÓRMULA DO DOTA DE CORRIDA.txt`):

1. **Cultura da Culpa** — culpar aliados pelo resultado da partida
2. **Desistencia Precoce** — "gg go next" antes do minuto 15
3. **Forcar Estrategias Inadequadas** — heroi/build fora do meta sem dominio tecnico
4. **Comunicacao Toxica ou Ausente** — ignorar chat/pings ou usa-los para xingar
5. **Rage Quit / AFK Disfarcado** — abandonar a partida sem AFK explicito (jungle, base)
6. **Feeding Intencional (Griefing)** — morrer de proposito por ego ou birra
7. **Ego Inflado** — "eu merecia estar no Ancient, meu time me segura"
8. **Brigas por Funcao e Rota** — disputar lane/role ja definido (2 mids, 3 carries)
9. **Desrespeito a Lideranca (Anti-time)** — recusar-se a ouvir calls, jogar de forma egoista
10. **Preconceito, Xenofobia, Racismo** — comentarios ofensivos sobre nacionalidades/sotaques
11. **Simulador de Heroi** — usa as habilidades sem jogar com base nos objetivos do mapa (relogio, patrimonio liquido, runas, altar da experiencia)
12. **Criar Expectativas em Terceiros** — projetar resultados em aliados de forma ativa (esperar pull, gank, ajuda especifica). Distinto do principio mental "frustracao nasce de expectativas" — aqui e o comportamento, nao a reacao
13. **Vitimizacao Sistemica** — construir identidade cronica de vitima ("matchmake me persegue", "tenho azar"). Distinto da Cultura da Culpa (#1) por ser padrao recorrente, nao reacao pontual
14. **Recusa de Auditoria Pos-Derrota** — anti-padrao por omissao: nao fazer a pergunta-pivo *"o que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?"*
15. **Buscar Diversao em Espaco de Competicao** — mismatch de proposito. O FormulaDota nao e ambiente de diversao casual

### Severidade e Acoes

A severidade de cada anti-padrao define quanto XP e subtraido (regressao de nivel) e qual a
acao disciplinar associada. A tabela de severidade abaixo e preservada do canone original — so
muda a forma: a antiga "perda de HONOR score" e agora **perda de XP do nivel**.

| Anti-padrao | Severidade default | Acao default |
|------------|-------------------|--------------|
| 1, 4, 5, 7, 13 | Leve | Advertencia + perda leve de XP |
| 2, 3, 8, 12, 14, 15 | Media | Strike formal + perda significativa de XP |
| 11 | Leve (educativo) | Advertencia + obrigatoriedade de assistir conteudo da Fórmula do MMR sobre objetivos |
| 6, 9 | Grave | Suspensao 7-14 dias + perda alta de XP |
| 10 | Critica | Ban imediato (sem direito a reentrada) |

**Auditoria publica de override:** qualquer aplicacao de severidade fora do default e logada
publicamente em `audit_log` com justificativa do moderador. Founder authority (Pedro) pode
override mas o registro permanece.

**Regressao de nivel:** quando a perda de XP cruza um limiar de nivel para baixo, o nivel da
conta regride e a medalha correspondente e revogada ate que o jogador recupere o XP. Cair de
banda (ex.: Lendario → Piloto) e visivel no perfil — a queda faz parte da narrativa de conduta.

---

## Componente Visual: HonorRankMedal

O componente `<HonorRankMedal>` e a representacao visual do nivel HONOR de um jogador.
Deve ser visualmente DISTINTO do `<DotaRankMedal>` que representa o tier SKILL.

### Diferenciacao visual intencional

O `<DotaRankMedal>` usa a estetica das medalhas da Valve: brasoes, asas, elementos militares,
paleta metalica (bronze, prata, ouro, azul Imortal). E familiar para qualquer jogador de Dota 2.

O `<HonorRankMedal>` usa estetica cerimonial propria: selos, laureis, escudos com simbolismo
ritual, elementos de progressao cultural — nao militar. A paleta de HONOR usa tons distintos
dos tiers de SKILL para evitar confusao visual. O badge tambem comunica o **nivel numerico (0–30)**
junto a medalha, ja que nivel e medalha sao o mesmo eixo.

### Especificacao de componente (draft)

```tsx
interface HonorRankMedalProps {
  // Nivel HONOR do jogador (0–30). A medalha exibida deriva do nivel.
  level: number; // 0–30

  // Banda/medalha derivada do nivel (computada, mas pode ser passada explicitamente)
  band?:
    | 'novato'    // 0–5  (sem medalha)
    | 'aprendiz'  // 6–11
    | 'piloto'    // 12–17
    | 'as'        // 18–24
    | 'lendario'  // 25–29
    | 'mistico';  // 30

  // Tamanho do badge (sm = cards compactos, md = perfil, lg = showcase)
  size?: 'sm' | 'md' | 'lg';

  // Exibir o nivel numerico (0–30) junto a medalha
  showLevel?: boolean;

  // Exibir label de texto (nome da banda) abaixo do badge
  showLabel?: boolean;

  // Glow animado (ativo por padrao em telas de perfil e showcase)
  glow?: boolean;

  // Tooltip com descricao da banda ao hover
  tooltip?: boolean;
}
```

### Paleta de cores por banda

As 6 bandas tem cores proprias. Novato (0–5) e o estado base sem medalha; as 5 medalhas seguem
uma progressao de calor/intensidade ate o topo (Mistico).

| Banda | Niveis | Cor primaria | Cor de glow | Logica |
|------|--------|-------------|------------|--------|
| Novato | 0–5 | `#6b7280` (cinza) | Sem glow | Sem medalha, calibrando a doutrina |
| Aprendiz | 6–11 | `#0ea5e9` (azul) | Glow azul suave | Doutrinado, fundacao limpa, agua |
| Piloto | 12–17 | `#22c55e` (verde) | Glow verde moderado | Aplicando o metodo, crescimento na pista |
| As | 18–24 | `#eab308` (amarelo ouro) | Glow ouro | Dominio da pista, valor reconhecido |
| Lendario | 25–29 | `#f97316` (laranja) | Glow laranja ardente | Legado, guardiao da cultura |
| Mistico | 30 | `#a855f7` (roxo) + efeito multicolor rotativo | Glow critico pulsante | Topo do ladder, percepcao expandida |

O Mistico (nivel 30) usa o roxo de profundidade/sabedoria como cor primaria com efeito
multicolor rotativo e glow critico pulsante — sinalizando que o topo do ladder e a expressao
maxima da maturidade no FormulaDota, nao uma copia de nenhum tier externo da Valve.

### Posicionamento em telas

**Card de jogador (lobby, leaderboard):**
```
[DotaRankMedal - sm] [Username]
[HonorRankMedal - sm] [Nivel + nome da banda]
```
Os dois badges ficam alinhados verticalmente, com mesmo tamanho, comunicando paridade de eixos.

**Perfil do jogador (/me):**
```
[Hero portrait full-width]
[Username em Cinzel 32px]
[DotaRankMedal - md] ←→ [HonorRankMedal - md] [com glow=true, showLevel=true]
```
Os dois badges ficam alinhados horizontalmente, centralizados, com mesmo peso visual.

**Leaderboard:**
Duas colunas separadas — uma para SKILL ranking (MMR Valve), uma para HONOR ranking (nivel 0–30).
O jogador aparece em posicoes potencialmente diferentes nos dois rankings. Isso e intencional e
comunica que os eixos sao genuinamente separados.

---

## Algoritmo de XP do Nivel HONOR (draft)

Esta e a especificacao de referencia para implementacao futura. No modelo fundido, todos os
eventos abaixo somam ou subtraem **XP**, e o XP cumulativo determina o **nivel (0–30)** via a
curva de `level_thresholds` (migration 021). Os valores numericos sao pontos de partida —
calibragem real acontece apos dados das primeiras temporadas.

### XP da metade do conhecimento (niveis 0 → 6)

| Evento | XP | Criterio de validacao |
|--------|----|-----------------------|
| Questao/checkpoint de doutrina verificado | `XP_por_questao` (ver math abaixo) | Resposta correta no fluxo de verificacao |
| Questao/checkpoint de metodologia verificado | `XP_por_questao` | Resposta correta no fluxo de verificacao |

**Math de balanceamento:** `XP_por_questao = (XP cumulativo para nivel 6) ÷ (total de questoes de conduta + metodologia)`.
Completar 100% da verificacao chega exatamente ao nivel 6 (Aprendiz / doutrinado).

### XP da metade da conduta (niveis 6 → 30) — eventos que SOMAM

| Evento | XP | Criterio de validacao |
|--------|----|-----------------------|
| Partida completada sem abandono | +5 | Bot Steam confirma que o jogador permaneceu ate o final |
| Elogio recebido — "comunicacao" | +8 | Commendation peer enviada por companheiro de equipe |
| Elogio recebido — "atitude" | +10 | Commendation peer — comportamento positivo sob pressao |
| Elogio recebido — "mentor" | +20 | Companheiro de equipe reconhece explicitamente contribuicao de mentoria |
| "Derrota com honra" | +15 | Perdeu a partida, zero strikes na partida, recebeu elogio em partida perdida |
| Presenca de temporada maior ou igual a 90% | +50 por threshold atingido | Calculado ao final do mes |
| Novato menciona jogador como referencia | +25 | Evento especial, validado por admin |
| Temporada sem strikes | +30 por mes completo | Calculado mensalmente |

### XP da metade da conduta — eventos que SUBTRAEM (regredem nivel)

| Evento | XP | Criterio de aplicacao |
|--------|----|-----------------------|
| Strike menor (atraso, comunicacao rispida) | -10 | Aplicado por admin apos relato e verificacao |
| Strike medio (comportamento negativo em partida) | -30 | Aplicado por admin — segunda ocorrencia do mesmo tipo |
| Strike grave (toxicidade explicita, abuso verbal) | -50 | Aplicado por admin — episodio unico grave |
| Abandono de partida | -30 | Bot Steam detecta saida antes do final, validado por admin |
| Banimento temporario | -100 | Aplicado automaticamente junto ao banimento |

Quando a subtracao de XP cruza um limiar de nivel para baixo, o nivel regride e a medalha
correspondente e revogada (ver [Regressao de nivel](#severidade-e-acoes)).

### Regras de aplicacao do algoritmo

**Regra H-1:** Commendations sao peer-to-peer mas limitadas. Um jogador pode enviar no maximo
2 commendations por partida (para evitar inflacao de XP por conluio entre amigos).

**Regra H-2:** Auto-commendation e bloqueada tecnicamente — voce nao pode dar elogio para
si mesmo ou para membros de seu grupo antes da partida (detecao por IP e perfil Discord).

**Regra H-3:** Commendations de jogadores de nivel muito baixo (Novato, niveis 0–5) tem peso
reduzido no XP — a voz de quem ainda nao demonstrou conduta tem credibilidade limitada.

**Regra H-4:** "Derrota com honra" so pode ser aplicado em partidas onde o jogador perdeu.
Vitorias nao geram "derrota com honra" — e um reconhecimento especifico de manutencao de conduta
em situacao adversa.

**Regra H-5:** A subtracao de XP por strike nunca e automatica — sempre requer acao explicita
de admin apos verificacao (exceto banimento temporario, que e automatico junto ao ban). Isso
evita que relatos falsos (por rancor pessoal) regridam o nivel de jogadores indevidamente.

**Regra H-6 (divisao das metades):** Nenhum XP de conduta (eventos da segunda tabela) e
creditado antes de o jogador atingir o nivel 6. Conhecimento e conduta nao se misturam como
combustivel: 0→6 e so verificacao, 6→30 e so conduta vivida. Um jogador que ainda nao se
doutrinou nao "adianta" nivel jogando bem.

---

## Reset de Temporada

O XP/nivel HONOR tem reset parcial entre temporadas, nao total. A logica e preservar memoria
historica enquanto cria espaco para reescrita da narrativa.

**Formula de reset:**
- O **progresso de conhecimento (niveis 0–6) NAO reseta.** Uma vez doutrinado, sempre doutrinado —
  o jogador nunca perde o status de Aprendiz por virada de temporada. A verificacao de doutrina
  e permanente.
- O **XP de conduta (acima do nivel 6) reseta parcialmente:** a nova temporada comeca preservando
  o nivel 6 como piso e carregando 30% do XP de conduta acumulado acima desse piso na temporada
  anterior.
- O nivel inicial da nova temporada e recalculado com base nesse XP de partida (nunca abaixo de 6
  para quem ja era doutrinado).
- O historico de temporadas anteriores e publico no perfil (medalhas por temporada).

**O que NAO reseta:**
- Status de doutrinado (nivel 6) — permanente
- Strikes acumulados com gravidade maxima (banimento anterior permanece registrado)
- Historico de commendations recebidas (acervo historico visivel no perfil)
- Banda/medalha de temporadas anteriores (exibidas no perfil como historico)
- Status de Mistico (nivel 30) de temporadas anteriores (emblema permanente no perfil)

**O que reseta:**
- XP de conduta acima do nivel 6 (parcialmente, conforme formula acima)
- Nivel atual acima de 6 (recalculado com base no XP inicial da nova temporada)
- Ranking de posicao no leaderboard de HONOR (todos partem do mesmo XP de conduta inicial)
- Contadores de commendations enviadas/recebidas na temporada

---

## Criterio do topo — Mistico (nivel 30)

Mistico e o nivel mais alto do FormulaDota (substitui o antigo "Imortal da Formula"). Nao e o
top de skill isoladamente — skill tecnico e medido pelo MMR Valve, num eixo separado. Mistico e
o topo do **eixo HONOR**: conhecimento verificado + conduta sustentada em nivel de excelencia.

**Como se atinge o nivel 30:** acumular XP de conduta suficiente (niveis 6→30) ao longo das
partidas, mantendo conduta exemplar. O nivel 30 nao e um pacote de criterios destacados — e o
topo natural do ladder, alcancado por XP. Os marcadores abaixo descrevem o **perfil esperado**
de quem chega e **sustenta** o nivel 30 (e que alimentam a elegibilidade a Liga e a PRO):

1. **Nivel 30 sustentado** — manter o topo do ladder, nao apenas toca-lo uma vez
2. **Minimo 90% de presenca** na temporada (partidas convocadas vs partidas comparecidas)
3. **Minimo 3 commendations do tipo "mentor"** recebidas de companheiros distintos
4. **Historico de "derrotas com honra"** — pelo menos 3 registros
5. **Zero strikes graves** no historico permanente

**Representacao visual:** o badge Mistico usa design exclusivo — nao derivado de nenhum badge da
Valve. Roxo de profundidade com efeito multicolor rotativo e glow critico pulsante. O badge inclui
o numero da temporada em que o nivel 30 foi alcancado (um jogador pode ser Mistico em multiplas
temporadas consecutivas, exibido no perfil como historico de excelencia sustentada).

**Sobre a relacao com o Imortal da Valve:**

Um jogador pode ser Imortal da Valve (top 0.5% de MMR) sem ser Mistico — ser Imortal nao basta;
falta o nivel 30 de HONOR (conhecimento + conduta). Mas **nao se pode ser Mistico sem ser Imortal
da Valve**: o topo do ladder exige convergencia dos dois eixos (nivel 30 **e** medalha Imortal).
Da mesma forma, Lendario (25) exige medalha Divine+.

Imortal da Valve mede skill tecnico puro. Mistico mede o jogador completo — alto nos dois eixos. Sao
titulos distintos que medem coisas distintas. O FormulaDota nunca vai comunicar que Mistico e
superior ao Imortal da Valve como ranking tecnico — ele e diferente, nao superior. Mas no contexto
do FormulaDota, Mistico e o titulo maximo possivel.

---

## Mistico (nivel 30) = Gate de Elegibilidade PRO

Mistico (nivel 30 sustentado) nao e apenas status final visual. E o **gate de elegibilidade**
para promocao a PRO — o nivel mais alto de responsabilidade dentro do FormulaDota.

Atingir o nivel nao e suficiente por si so. E a condicao necessaria, nao a condicao suficiente.
**PRO e um papel conquistado por processo, nunca um nivel automatico.**

### Criterios cumulativos para elegibilidade PRO

O jogador deve satisfazer TODOS os criterios abaixo simultaneamente:

| Criterio | Descricao | Como e verificado |
|----------|-----------|-------------------|
| Nivel 30 ativo | Mistico na temporada corrente | `honor_levels.level = 30` |
| Sustentacao de nivel | Manteve nivel alto (banda Lendario+ / nivel 25+) por 2+ temporadas consecutivas | `honor_level_history` — ultimas 2 seasons |
| Achievements mentor | Minimo 3 commendations do tipo "mentor" recebidas na carreira | `peer_commendations` — tipo "mentor", all-time |
| Skill documentada | MMR Valve documentado (eixo SKILL — externo) | Sincronizado via OpenDota |
| Historico limpo | Zero strikes graves em todo o historico permanente | `honor_ledger` — nenhum `strike_grave` |
| Tempo na doutrina | Doutrinado (nivel 6) ha 6+ meses | `profiles.doctrine_accepted_at` |

### O que elegibilidade NAO e

Tornar-se elegivel NAO e tornar-se PRO automaticamente. Elegibilidade e apenas o acesso ao
processo de promocao. A promocao em si exige etapas adicionais documentadas em PRO_PROMOTION.md.

Um jogador pode ser elegivel por multiplas temporadas sem ser promovido — a capacidade
pedagogica e o alinhamento cultural profundo sao avaliados na entrevista, nao pelo banco de dados.

### Processo de promocao (resumo — ver PRO_PROMOTION.md)

1. Pedro (ou Conselho futuro) identifica elegivel ou elegivel solicita avaliacao
2. Entrevista cultural via Discord (criterios qualitativos)
3. Endosso formal documentado
4. Assinatura de contrato de conduta PRO
5. Ativacao de acesso `/pro/dashboard`
6. Audit log publico da promocao (transparencia)

Rejeicao e possivel mesmo com criterios quantitativos satisfeitos. Pedro mantem founder
authority — a decisao final e qualitativa, nunca apenas algoritmica.

---

## Visibilidade Publica do HONOR

O nivel HONOR de cada jogador e visivel para todos os membros do FormulaDota. Nao existe modo
privado de HONOR. Essa e uma decisao filosofica derivada do Pilar 2 (reputacao persistente):
a visibilidade e o mecanismo que da peso ao sistema.

**O que e visivel:**
- Nivel atual de HONOR (0–30) e a banda/medalha correspondente
- Numero de commendations recebidas na temporada (por tipo)
- Historico de banda por temporada (na pagina de perfil)
- Posicao no leaderboard de HONOR

**O que NAO e visivel publicamente:**
- XP numerico bruto (visivel apenas para o proprio jogador)
- Strikes individuais (visivel apenas para o jogador e para o admin)
- Detalhes de commendations (quem enviou — protege privacidade do commendador)
- Razao especifica de cada subtracao de XP

Essa politica equilibra transparencia (todos sabem o nivel de HONOR de todos) com privacidade
(os detalhes internos de cada avaliacao sao protegidos).

---

## Implementacao Futura — Estrutura de Banco de Dados (draft)

Esta secao e referencia para quando o sistema HONOR for implementado (Phase 6+). Os nomes
de tabela e campos sao drafts — podem ser ajustados na implementacao real. No modelo fundido,
estas tabelas convergem com o sistema de niveis/XP existente (`user_levels`, migration 021).

### Tabelas necessarias

```sql
-- Nivel e XP de HONOR por jogador por temporada (fusao XP + HONOR)
CREATE TABLE honor_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  xp INTEGER NOT NULL DEFAULT 0,          -- XP cumulativo
  level INTEGER NOT NULL DEFAULT 0,       -- nivel 0–30 derivado do XP via level_thresholds
  band TEXT NOT NULL DEFAULT 'novato',    -- enum: novato, aprendiz, piloto, as, lendario, mistico
  doctrine_verified BOOLEAN NOT NULL DEFAULT FALSE, -- atingiu nivel 6 (permanente)
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Ledger de todos os eventos que afetaram XP/nivel (auditoria completa)
CREATE TABLE honor_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  event_type TEXT NOT NULL, -- 'doctrine_check', 'match_completed', 'commendation', 'defeat_with_honor', 'strike_minor', etc.
  xp_delta INTEGER NOT NULL, -- positivo (conhecimento/conduta) ou negativo (strike)
  half TEXT NOT NULL,        -- 'knowledge' (0->6) ou 'conduct' (6->30)
  reason TEXT, -- descricao legivel do evento
  match_id UUID REFERENCES matches(id), -- nulo para eventos fora de partida
  source_user_id UUID REFERENCES auth.users(id), -- quem gerou o evento (commendador, admin)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Elogios peer-to-peer (commendations)
CREATE TABLE peer_commendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES matches(id), -- commendation deve ser de partida especifica
  commendation_type TEXT NOT NULL, -- 'comunicacao', 'atitude', 'mentor'
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Um jogador nao pode dar mais de 2 commendations por partida
  UNIQUE(from_user_id, match_id, commendation_type)
);

-- Historico de nivel/banda HONOR por temporada (para exibicao de conquistas historicas)
CREATE TABLE honor_level_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  final_level INTEGER NOT NULL,  -- nivel ao final da temporada (0–30)
  final_band TEXT NOT NULL,      -- banda ao final da temporada
  final_xp INTEGER NOT NULL,
  reached_mistico BOOLEAN NOT NULL DEFAULT FALSE, -- atingiu nivel 30
  season_ended_at TIMESTAMPTZ NOT NULL
);
```

### Politicas RLS necessarias

- `honor_levels`: SELECT para membros autenticados (nivel e banda sao visiveis para todos),
  UPDATE apenas para service role (o algoritmo roda server-side, nunca client-side)
- `honor_ledger`: SELECT apenas para o proprio usuario (seu ledger) e para admin
- `peer_commendations`: SELECT para o destinatario (saber quantas recebeu), INSERT para
  membros autenticados (com validacao de limite por partida)
- `honor_level_history`: SELECT para todos os membros autenticados (historico publico)

---

## Relacao com Outros Documentos

**`.planning/PROGRESSION_REDESIGN_SPEC.md`:** Fonte da verdade deste redesign (Pedro, 2026-06-02).
Prevalece sobre canone antigo onde houver conflito.

**PHILOSOPHY.md — Pilar 3:** Define a necessidade filosofica de dois eixos. Ler antes de
qualquer trabalho no sistema HONOR.

**PROGRESSION_PUBLIC.md:** Explicacao voltada ao usuario de toda a estrutura (ladder 0–30,
5 medalhas, as duas metades, freemium, lobby elite) — escrita para ser compreendida durante o
proprio processo de doutrina.

**MATCH_CREATION.md:** Sistema de criacao automatizada de lobbies e os dois gates (livre / elite)
que usam o nivel HONOR.

**LIGA_IMORTAL.md:** Gate de elegibilidade re-apontado para Mistico (nivel 30) sustentado.

**PRO_PROMOTION.md:** Elegibilidade PRO re-apontada para Mistico (nivel 30). PRO = papel por processo.

**CALIBRATION.md:** Mapeamento visitante → calibrando → ranqueado nos niveis iniciais (0–6).

**PRODUCT_CORE.md — Secao 6:** Hierarquia de feedback inclui eventos de HONOR como eventos
de nivel Importante (ganho de nivel / nova medalha) e Critico (atingir Mistico, nivel 30).

**UX_PRINCIPLES.md — M12:** Mandamento que exige exibicao dual de SKILL + HONOR (nivel 0–30) em
toda superfície onde o jogador aparece.

---

*Este documento e fundacional e permanente. Valores numericos do algoritmo (XP por evento,
curva de thresholds) sao drafts e serao calibrados apos dados das primeiras temporadas. A
estrutura filosofica (2 eixos, conhecimento→6 / conduta→30, SKILL = MMR Valve externo) e
intocavel sem decisao explicita do autor original (Pedro Paulo). Versao 2.0 — 2026-06-02
(redesign de progressao: HONOR fundido com XP no ladder de nivel 0–30; 8 tiers → 6 bandas;
Imortal da Formula → Mistico). Decisao lockada 2026-05-24 mantida: HONOR substitui MMR interno;
nao ha Glicko-2 ou Elo interno.*
