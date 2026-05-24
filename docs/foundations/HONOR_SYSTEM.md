# Sistema HONOR — Eixo Paralelo ao SKILL

> **Filosofia de origem:** PHILOSOPHY.md — Pilar 3: Dois eixos separados.
> **Status:** Documento fundacional. Implementacao programada para Phase 6+.
> **Versao:** 1.0 — 2026-05-23
> **Relacao:** PHILOSOPHY define por que HONOR existe. Este documento define como HONOR funciona.

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
ao longo de uma temporada, isso e visivel no seu perfil. Quando voce acumula strikes, isso
tambem e visivel — e afeta diretamente sua posicao no eixo de HONOR.

HONOR nao substitui skill. Nao e possivel ser Imortal da Formula apenas por HONOR alto com
skill mediocre. O sistema e explicitamente dual: os dois eixos coexistem e se completam.
O objetivo e formar jogadores que sao simultaneamente competentes e bons de conviver — porque
no FormulaDota, o segundo criterio importa tanto quanto o primeiro.

---

## Principios de Design do Sistema HONOR

**HONOR e conquistado, nao comprado.** Nao existe forma de pagar para subir de tier HONOR.
Nao existe vantagem de HONOR atrelada a plano de assinatura. A unica forma de subir e
comportar-se bem ao longo de tempo suficiente.

**HONOR e persistente mas nao imune ao tempo.** Reset parcial entre temporadas mantem
memoria historica enquanto cria espaco para evolucao (ou regressao). Quem se comportou
bem na Temporada 1 e se deteriorou na Temporada 2 verá isso refletido.

**HONOR e sempre visivel.** Em qualquer tela onde o jogador aparece — perfil, card em lobby,
leaderboard, tela pos-partida — o tier HONOR e exibido lado a lado com o tier SKILL. Sem
excecao. Esconder HONOR de qualquer superfície e uma violacao do Pilar 3 da filosofia.

**HONOR mede qualidade de participacao, nao quantidade.** Um jogador com 10 partidas e HONOR
Disciplinado tem mais valor de conduta do que um jogador com 100 partidas e HONOR Aprendiz.
O sistema nao pode ser acumulado por volume — a qualidade de cada participacao e o criterio.

---

## Os 8 Tiers HONOR

Os tiers de HONOR sao paralelos aos tiers internos de SKILL, mas com nomenclatura e simbologia
propria. O objetivo e que os dois sistemas coexistam como identidades distintas — o badge
de HONOR nao e copia do badge de SKILL.

| Tier | Nome | Criterio de ingresso | Descricao |
|------|------|---------------------|-----------|
| 1 | Aprendiz | Aceitou a Doutrina + 0-9 partidas | Novo membro. Recebeu o codigo de conduta. Ainda sem historico suficiente para classificacao. |
| 2 | Disciplinado | 10+ partidas, ausencia de strikes graves | Demonstrou regularidade basica. Comparece, joga ate o fim, sem comportamento destrutivo. |
| 3 | Confiavel | 30+ partidas, presenca maior ou igual a 80%, maximo 1 strike menor | Pode ser contado. Outros jogadores sabem que ele vai comparecer e vai jogar inteiro. |
| 4 | Respeitado | Recebe elogios de companheiros com consistencia, contribui com novatos quando presente | Reconhecido pelos pares. Sua presenca melhora o ambiente da partida perceptivelmente. |
| 5 | Honrado | Top 20% de HONOR score da temporada em curso, conduta exemplar sustentada | Referencia de conduta na temporada atual. |
| 6 | Mestre | Top 10% de HONOR score, historico de mentoria ativa reconhecida, comunicacao como modelo | Jogadores aprendem com ele apenas por jogar ao lado. Comunicacao construtiva e padrao. |
| 7 | Lendario | Top 5% de HONOR score, referencia cultural consolidada na comunidade | Reconhecido pela comunidade como guardiao da cultura do FormulaDota, nao apenas como jogador. |
| 8 | Imortal da Formula | Ver criterio especial na secao abaixo | Atingiu o topo de ambos os eixos simultaneamente. O titulo mais alto do FormulaDota. |

**Nota sobre mobilidade:** Tiers de HONOR podem subir e descer. Um jogador Honrado que acumula
strikes em uma temporada pode regredir para Confiavel ou Respeitado. O sistema nao e uma
conquista permanente — e uma avaliacao continua de participacao.

---

## Componente Visual: HonorRankMedal

O componente `<HonorRankMedal>` e a representacao visual do tier HONOR de um jogador.
Deve ser visualmente DISTINTO do `<DotaRankMedal>` que representa o tier SKILL.

### Diferenciacao visual intencional

O `<DotaRankMedal>` usa a estetica das medalhas da Valve: brasoes, asas, elementos militares,
paleta metalica (bronze, prata, ouro, azul Imortal). E familiar para qualquer jogador de Dota 2.

O `<HonorRankMedal>` usa estetica cerimonial propria: selos, laureis, escudos com simbolismo
ritual, elementos de progressao cultural — nao militar. A paleta de HONOR usa tons distintos
dos tiers de SKILL para evitar confusao visual.

### Especificacao de componente (draft)

```tsx
interface HonorRankMedalProps {
  // Tier HONOR do jogador
  rank:
    | 'aprendiz'
    | 'disciplinado'
    | 'confiavel'
    | 'respeitado'
    | 'honrado'
    | 'mestre'
    | 'lendario'
    | 'imortal-da-formula';

  // Tamanho do badge (sm = cards compactos, md = perfil, lg = showcase)
  size?: 'sm' | 'md' | 'lg';

  // Exibir label de texto abaixo do badge
  showLabel?: boolean;

  // Glow animado (ativo por padrao em telas de perfil e showcase)
  glow?: boolean;

  // Tooltip com descricao do tier ao hover
  tooltip?: boolean;
}
```

### Paleta de cores por tier

| Tier | Cor primaria | Cor de glow | Logica |
|------|-------------|------------|--------|
| Aprendiz | `#6b7280` (cinza) | Sem glow | Sem historico, sem destaque |
| Disciplinado | `#78716c` (stone) | Glow leve pedra | Solidez basica |
| Confiavel | `#0ea5e9` (azul) | Glow azul suave | Confiabilidade, agua |
| Respeitado | `#22c55e` (verde) | Glow verde moderado | Reconhecimento, crescimento |
| Honrado | `#eab308` (amarelo ouro) | Glow ouro | Honorabilidade, valor |
| Mestre | `#a855f7` (roxo) | Glow roxo intenso | Sabedoria, profundidade |
| Lendario | `#f97316` (laranja) | Glow laranja ardente | Legado, permanencia |
| Imortal da Formula | `#ef4444` (vermelho brand) + efeito multicolor rotativo | Glow critico pulsante | Supremacia dual |

O Imortal da Formula usa o vermelho brand do FormulaDota como cor primaria — sinalizando
que o titulo mais alto da plataforma e expressao maxima da identidade do FormulaDota,
nao uma copia de nenhum tier externo.

### Posicionamento em telas

**Card de jogador (lobby, leaderboard):**
```
[DotaRankMedal - sm] [Username]
[HonorRankMedal - sm] [Honor tier label]
```
Os dois badges ficam alinhados verticalmente, com mesmo tamanho, comunicando paridade de eixos.

**Perfil do jogador (/me):**
```
[Hero portrait full-width]
[Username em Cinzel 32px]
[DotaRankMedal - md] ←→ [HonorRankMedal - md] [com glow=true]
```
Os dois badges ficam alinhados horizontalmente, centralizados, com mesmo peso visual.

**Leaderboard:**
Duas colunas separadas — uma para SKILL ranking, uma para HONOR ranking. O jogador aparece
em posicoes potencialmente diferentes nos dois rankings. Isso e intencional e comunica que
os eixos sao genuinamente separados.

---

## Algoritmo de Pontuacao HONOR (draft)

Esta e a especificacao de referencia para implementacao futura. Os valores numericos sao
pontos de partida — calibragem real acontece apos dados das primeiras temporadas.

### Eventos que somam HONOR score

| Evento | Pontos | Criterio de validacao |
|--------|--------|-----------------------|
| Partida completada sem abandono | +5 | Bot Steam confirma que o jogador permaneceu ate o final |
| Elogio recebido — "comunicacao" | +8 | Commendation peer enviada por companheiro de equipe |
| Elogio recebido — "atitude" | +10 | Commendation peer — comportamento positivo sob pressao |
| Elogio recebido — "mentor" | +20 | Companheiro de equipe reconhece explicitamente contribuicao de mentoria |
| "Derrota com honra" | +15 | Perdeu a partida, zero strikes na partida, recebeu elogio em partida perdida |
| Presenca de temporada maior ou igual a 90% | +50 por threshold atingido | Calculado ao final do mes |
| Novato menciona jogador como referencia | +25 | Evento especial, validado por admin |
| Temporada sem strikes | +30 por mes completo | Calculado mensalmente |

### Eventos que descontam HONOR score

| Evento | Pontos | Criterio de aplicacao |
|--------|--------|-----------------------|
| Strike menor (atraso, comunicacao rispida) | -10 | Aplicado por admin apos relato e verificacao |
| Strike medio (comportamento negativo em partida) | -30 | Aplicado por admin — segunda ocorrencia do mesmo tipo |
| Strike grave (toxicidade explicita, abuso verbal) | -50 | Aplicado por admin — episodio unico grave |
| Abandono de partida | -30 | Bot Steam detecta saida antes do final, validado por admin |
| Banimento temporario | -100 | Aplicado automaticamente junto ao banimento |

### Regras de aplicacao do algoritmo

**Regra H-1:** Commendations sao peer-to-peer mas limitadas. Um jogador pode enviar no maximo
2 commendations por partida (para evitar inflacao por conluio entre amigos).

**Regra H-2:** Auto-commendation e bloqueada tecnicamente — voce nao pode dar elogio para
si mesmo ou para membros de seu grupo antes da partida (detecao por IP e perfil Discord).

**Regra H-3:** Commendations de jogadores com HONOR tier muito baixo (Aprendiz) tem peso
reduzido no calculo — a voz de quem ainda nao demonstrou conduta tem credibilidade limitada.

**Regra H-4:** "Derrota com honra" e um evento especial que so pode ser aplicado em partidas
onde o jogador perdeu. Vitorias nao geram "derrota com honra" — e um reconhecimento especifico
de manutencao de conduta em situacao adversa.

**Regra H-5:** O decrescimo de HONOR nunca e automatico para strikes — sempre requer acao
explicita de admin apos verificacao. Isso evita que relatos falsos (por rancor pessoal)
afetem o HONOR de jogadores indevidamente.

---

## Reset de Temporada

O HONOR score tem reset parcial entre temporadas, nao total. A logica e preservar memoria
historica enquanto cria espaco para reescrita da narrativa.

**Formula de reset:**
- HONOR score da nova temporada comeca com 30% do score final da temporada anterior
- O tier inicial da nova temporada e calculado com base nesse score de partida
- O historico de temporadas anteriores e publico no perfil (badges de tier por temporada)

**O que NAO reseta:**
- Strikes acumulados com gravidade maxima (banimento anterior permanece registrado)
- Historico de commendations recebidas (acervo historico visievel no perfil)
- Tier de temporadas anteriores (exibidos no perfil como historico)
- Status de Imortal da Formula de temporadas anteriores (emblema permanente no perfil)

**O que reseta:**
- Score numerico de HONOR (parcialmente, conforme formula acima)
- Tier atual (recalculado com base no score inicial da nova temporada)
- Ranking de posicao (todos comecam do mesmo ponto na nova temporada)
- Contadores de commendations enviadas/recebidas na temporada

---

## Criterio Especial — Imortal da Formula

O titulo Imortal da Formula e o mais alto do FormulaDota. Nao e o top de HONOR isoladamente.
Nao e o top de SKILL isoladamente. E a convergencia de ambos em nivel de excelencia sustentada.

**Criterios simultaneos obrigatorios:**

1. **Top 1% de HONOR score** da temporada atual em curso
2. **Minimo Tier 6 de SKILL interno** (Anciao Dota ou equivalente no sistema interno do FormulaDota)
3. **Minimo 90% de presenca** na temporada (partidas convocadas vs partidas comparecidas)
4. **Minimo 3 commendations do tipo "mentor"** recebidas de companheiros distintos na temporada
5. **Historico de "derrotas com honra"** — pelo menos 3 registros na temporada atual

**Nota sobre o criterio 2:** O FormulaDota mantem sistema interno de SKILL tier baseado em
performance nas partidas in-house, nao diretamente atrelado ao MMR da Valve. Um jogador pode
ser Imortal da Valve e ter tier interno mais baixo se performou abaixo de sua capacidade nas
partidas in-house. O criterio e baseado no tier interno, nao no badge Valve.

**Representacao visual:**

O badge Imortal da Formula usa design exclusivo — nao derivado de nenhum badge existente da
Valve. Usa o vermelho brand do FormulaDota com efeito de glow critico pulsante. O badge inclui
o numero da temporada em que foi conquistado (um jogador pode ser Imortal da Formula em multiplas
temporadas consecutivas, e isso e exibido no perfil como historico de excelencia sustentada).

**Sobre a relacao com o Imortal da Valve:**

Um jogador pode ser Imortal da Valve (top 0.5% de MMR) sem ser elegivel ao Imortal da Formula.
Um jogador pode ser Imortal da Formula sem ser Imortal da Valve.

Imortal da Valve mede skill tecnico puro. Imortal da Formula mede o jogador completo. Sao
titulos distintos que medem coisas distintas. O FormulaDota nunca vai comunicar que Imortal
da Formula e superior ao Imortal da Valve como ranking tecnico — ele e diferente, nao superior.
Mas no contexto do FormulaDota, Imortal da Formula e o titulo maximo possivel.

---

## Visibilidade Publica do HONOR

O HONOR de cada jogador e visivel para todos os membros do FormulaDota. Nao existe modo
privado de HONOR. Essa e uma decisao filosofica derivada do Pilar 2 (reputacao persistente):
a visibilidade e o mecanismo que da peso ao sistema.

**O que e visivel:**
- Tier atual de HONOR
- Numero de commendations recebidas na temporada (por tipo)
- Historico de tier por temporada (na pagina de perfil)
- Posicao no leaderboard de HONOR

**O que NAO e visivel publicamente:**
- Score numerico bruto (visivel apenas para o proprio jogador)
- Strikes individuais (visivel apenas para o jogador e para o admin)
- Detalhes de commendations (quem enviou — protege privacidade do commendador)
- Razao especifica de cada decrescimo de HONOR

Essa politica equilibra transparencia (todos sabem o tier de HONOR de todos) com privacidade
(os detalhes internos de cada avaliacao sao protegidos).

---

## Implementacao Futura — Estrutura de Banco de Dados (draft)

Esta secao e referencia para quando o sistema HONOR for implementado (Phase 6+). Os nomes
de tabela e campos sao drafts — podem ser ajustados na implementacao real.

### Tabelas necessarias

```sql
-- Pontuacao acumulada de HONOR por jogador por temporada
CREATE TABLE honor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'aprendiz', -- enum dos 8 tiers
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Ledger de todos os eventos que afetaram HONOR (auditoria completa)
CREATE TABLE honor_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  event_type TEXT NOT NULL, -- 'match_completed', 'commendation', 'defeat_with_honor', 'strike_minor', etc.
  points_delta INTEGER NOT NULL, -- positivo ou negativo
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

-- Historico de tier HONOR por temporada (para exibicao de conquistas historicas)
CREATE TABLE honor_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  season_id UUID REFERENCES seasons(id),
  final_tier TEXT NOT NULL, -- tier ao final da temporada
  final_score INTEGER NOT NULL,
  is_imortal_da_formula BOOLEAN NOT NULL DEFAULT FALSE,
  season_ended_at TIMESTAMPTZ NOT NULL
);
```

### Politicas RLS necessarias

- `honor_scores`: SELECT para membros autenticados (tier e visivel para todos), UPDATE apenas
  para service role (o algoritmo roda server-side, nunca client-side)
- `honor_ledger`: SELECT apenas para o proprio usuario (seu ledger) e para admin
- `peer_commendations`: SELECT para o destinatario (saber quantas recebeu), INSERT para
  membros autenticados (com validacao de limite por partida)
- `honor_tier_history`: SELECT para todos os membros autenticados (historico publico)

---

## Relacao com Outros Documentos

**PHILOSOPHY.md — Pilar 3:** Define a necessidade filosofica de dois eixos. Ler antes de
qualquer trabalho no sistema HONOR.

**PRODUCT_CORE.md — Secao 6:** Hierarquia de feedback inclui eventos de HONOR como eventos
de nivel Importante (ganho de tier) e Critico (conquista de Imortal da Formula).

**UX_PRINCIPLES.md — M12:** Mandamento que exige exibicao dual de SKILL + HONOR em toda
superfície onde o jogador aparece.

---

*Este documento e fundacional e permanente. Valores numericos do algoritmo sao drafts e
serao calibrados apos dados das primeiras temporadas. Estrutura filosofica e intocavel
sem decisao explicita do autor original (Pedro Paulo). Versao 1.0 — 2026-05-23.*
