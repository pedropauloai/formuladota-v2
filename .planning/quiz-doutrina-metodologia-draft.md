# Banco de Questões — Quiz de Doutrina + Metodologia (RASCUNHO)

> **RASCUNHO para validação de Pedro Paulo.** Nada aqui é definitivo. Revise cada
> questão, alternativa e justificativa antes de qualquer implementação. Onde o canon
> tiver lacuna, há nota explícita marcada como `[LACUNA — Pedro]`.
>
> **Fontes canônicas usadas (fidelidade total, sem invenção):**
> - `src/lib/doctrine.ts` — 14 princípios + 15 anti-padrões (conduta).
> - `A FÓRMULA DO DOTA DE CORRIDA.txt` — metodologia/gameplay.
> - `docs/foundations/PROGRESSION_PUBLIC.md` e `PRODUCT_CORE.md` — voz (Mestre + Guardião).
>
> **Voz:** Mestre + Guardião. PT-BR com acentuação correta. Frases curtas. Sem emoji.
> Termos de Dota (Mid, Core, Suporte, gold, smurf, lane) sem aspas.

---

## Como ler este banco

- Cada questão testa **compreensão real** (cenário "o que fazer quando X"), não decoração.
- 4 alternativas (A–D), uma correta, marcada com **(correta)**.
- 1 linha de justificativa citando a origem (princípio Nº, anti-padrão Nº ou conceito).

## Contagem e XP por questão

- **Total de questões neste rascunho: 136** (ver resumo por seção no rodapé).
  - Conduta — Princípios: 36 (14 princípios × 2–3)
  - Conduta — Anti-padrões: 41 (15 anti-padrões × 2–3)
  - Metodologia — Conceitos: 40 (14 conceitos × 2–3)
  - Metodologia — Fundamentos Táticos (L1–L6): 19 (6 lições × 2–3) — adicionado 2026-06-02
- **Regra de XP** (conforme `.planning/PROGRESSION_REDESIGN_SPEC.md` §3):
  `XP_por_questão = (XP cumulativo necessário pra atingir o nível 6) ÷ (total de questões de conduta + metodologia)`.
  Completar **100% do quiz = chegar exatamente ao nível 6 = Aprendiz = doutrinado** =
  libera o lobby livre freemium. O valor numérico exato depende da curva de
  `level_thresholds` (migration 021) + a contagem final aprovada por Pedro → calibração.

---

# SEÇÃO 1 — CONDUTA: OS 14 PRINCÍPIOS

## Princípio 1 — A culpa NUNCA é do outro

**Q1.1.** Você perde uma partida e está convencido de que o problema foi o seu pos 5
que ficou bot a partida toda. O que a Fórmula manda fazer?

- A) Reportar o aliado e seguir pra próxima sem pensar mais nisso.
- B) Assumir que a responsabilidade é sua, 100% das vezes, e procurar onde você poderia ter melhorado. **(correta)**
- C) Anotar o nome do aliado pra evitá-lo no futuro.
- D) Aceitar que algumas partidas são culpa do time e tudo bem.

> Origem: Princípio 1. A responsabilidade é sempre sua, 100% das vezes — apontar culpa nos outros é a principal fonte de conflito.

**Q1.2.** Por que apontar a culpa nos outros trava a sua evolução?

- A) Porque o sistema de report pune quem reclama demais.
- B) Porque enquanto você olha pros outros, você não olha pra si mesmo nem enxerga onde pode melhorar pela autocrítica. **(correta)**
- C) Porque os aliados percebem e jogam pior de propósito.
- D) Porque diminui o seu GPM na partida seguinte.

> Origem: Princípio 1. Parar de olhar pros outros e olhar pra si é o que abre a autocrítica.

**Q1.3.** Qual frase resume a Primeira Regra da Fórmula do Dota de Corrida?

- A) Frag não é tudo.
- B) Jogue sempre de Core.
- C) A culpa NUNCA é do outro. **(correta)**
- D) Mute o chat e jogue solo.

> Origem: Princípio 1 / Primeira Regra (CANONICAL_QUOTES.firstRule).

## Princípio 2 — Frustração nasce de expectativas não correspondidas

**Q2.1.** Você esperava que o seu mid fizesse um gank na sua lane, ele não veio, e
agora você está irritado. Segundo a Fórmula, qual é a raiz dessa irritação?

- A) O mid jogou mal e você tem razão de estar irritado.
- B) Uma expectativa que você projetou num resultado que não dependia só de você. **(correta)**
- C) O matchmaking te colocou com um time fraco.
- D) Falta de comunicação por voz no time.

> Origem: Princípio 2. Frustração nasce de expectativas não correspondidas — você projeta um resultado que não depende só de você.

**Q2.2.** Como a Fórmula manda treinar a inteligência emocional dentro das partidas?

- A) Respirando fundo antes de cada teamfight.
- B) Reconhecendo quando você está criando expectativas em terceiros e treinando o hábito de não se apegar a elas. **(correta)**
- C) Mutando o chat de voz sempre.
- D) Evitando jogar quando está cansado.

> Origem: Princípio 2. O exercício é reconhecer a expectativa e não se apegar a ela — isso fortalece a inteligência emocional.

**Q2.3.** Qual destes é um exemplo direto de expectativa não correspondida citado na doutrina?

- A) Esperar que o servidor não tenha lag.
- B) Esperar que aliados escolham os heróis que você gostaria. **(correta)**
- C) Esperar ganhar todas as partidas do dia.
- D) Esperar que o inimigo erre uma habilidade.

> Origem: Princípio 2. Esperar que aliados escolham heróis, façam jogadas do seu jeito ou deem ajuda que nunca vem.

## Princípio 3 — Paralaxe cognitiva

**Q3.1.** O seu aliado faz uma jogada que pra você é claramente errada, mas ele
parecia confiante. O que a paralaxe cognitiva explica sobre isso?

- A) Que ele estava trollando de propósito.
- B) Que cada jogador interpreta o jogo pela própria perspectiva — o que parece certo pra você pode não fazer sentido pra ele naquele momento. **(correta)**
- C) Que ele tem MMR mais baixo que o seu.
- D) Que você deveria assumir o comando do time.

> Origem: Princípio 3. Paralaxe cognitiva — não existe verdade absoluta em cada jogada; cada um interpreta pela própria perspectiva.

**Q3.2.** Aceitar a paralaxe cognitiva produz qual efeito prático na sua partida?

- A) Aumenta seu farm automaticamente.
- B) Menos conflitos internos e externos, e melhor performance. **(correta)**
- C) Faz os aliados concordarem com você.
- D) Reduz o número de smurfs adversários.

> Origem: Princípio 3. Quanto mais você aceita essa realidade, menos conflitos surgem e melhor é a performance.

**Q3.3.** Qual afirmação está alinhada com a paralaxe cognitiva?

- A) Existe uma jogada absolutamente certa em cada situação e todos deveriam vê-la.
- B) Não existe uma verdade absoluta em cada jogada — depende da perspectiva de cada um. **(correta)**
- C) Quem tem mais MMR está sempre certo na leitura.
- D) A leitura correta é a do jogador com melhor KDA.

> Origem: Princípio 3. Não existe verdade absoluta em cada jogada.

## Princípio 4 — Errar é parte do aprendizado

**Q4.1.** Você cometeu um erro grave de posicionamento e morreu. Qual postura a Fórmula espera?

- A) Evitar arriscar pelo resto da partida pra não errar de novo.
- B) Reconhecer o erro e aprender com ele, sem medo — porque o erro é o primeiro passo da evolução. **(correta)**
- C) Esconder o erro do time pra não ser cobrado.
- D) Trocar de herói na próxima pra fugir do problema.

> Origem: Princípio 4. Não tenha medo dos erros — eles são o primeiro passo pra evolução, desde que reconhecidos.

**Q4.2.** Segundo a doutrina, qual é a condição pra que um erro vire evolução?

- A) Que ninguém perceba o erro.
- B) Que você reconheça o erro e aprenda com ele. **(correta)**
- C) Que você ganhe a partida mesmo assim.
- D) Que o erro não se repita nunca mais.

> Origem: Princípio 4. O erro é primeiro passo da evolução desde que você o reconheça e aprenda com ele.

## Princípio 5 — Ou você ganha, ou você aprende

**Q5.1.** A partida está perdida de qualquer jeito — draft desequilibrado, nada que
você faça muda o resultado. Qual é a mentalidade correta?

- A) Pedir gg e abandonar pra não perder tempo.
- B) Ver a derrota como ponto de evolução e manter a constância — perder faz parte, evoluir é uma escolha. **(correta)**
- C) Feedar pra acabar logo a partida.
- D) Culpar o draft e seguir pra próxima sem refletir.

> Origem: Princípio 5. Cada derrota é ponto de evolução; perder faz parte, evoluir é uma escolha.

**Q5.2.** Existem partidas em que a derrota é inevitável. O que isso NÃO pode afetar?

- A) Seu humor naquele dia.
- B) Sua constância. **(correta)**
- C) Sua escolha de herói.
- D) Sua taxa de farm.

> Origem: Princípio 5. A derrota inevitável não pode e não deve afetar sua constância.

**Q5.3.** Qual frase resume o tratamento da derrota na Fórmula?

- A) Derrota é azar.
- B) Ou você ganha, ou você aprende. **(correta)**
- C) Derrota se evita jogando seguro.
- D) Derrota é culpa do time.

> Origem: Princípio 5 (CANONICAL_QUOTES.winOrLearn).

## Princípio 6 — Não é arrogância, é responsabilidade

**Q6.1.** Você dominou a metodologia e agora se sente superior aos outros 9 da
partida. Como a Fórmula manda interpretar essa superioridade?

- A) Como permissão pra cobrar os aliados que jogam pior.
- B) Como responsabilidade: saber mais significa que agora é você quem carrega a vitória. **(correta)**
- C) Como motivo pra subir mais rápido sem esforço.
- D) Como direito de comandar o time pelo chat.

> Origem: Princípio 6. Não é arrogância, é responsabilidade — saber mais significa que é você quem carrega a vitória.

**Q6.2.** Em que três dimensões você se torna superior aos outros 9 jogadores, segundo a doutrina?

- A) Farm, kills e dano.
- B) Conhecimento, controle emocional e capacidade de adaptação. **(correta)**
- C) MMR, herói e itens.
- D) Reflexo, mira e mecânica.

> Origem: Princípio 6 (CANONICAL_QUOTES.topPercent). Superior em conhecimento, controle emocional e adaptação.

**Q6.3.** A doutrina afirma que 99,5% dos jogadores não sabem jogar Dota 2. Qual é o
uso correto dessa consciência?

- A) Justificar atitudes tóxicas com os piores.
- B) Entender que você não deve esperar que aliados saibam o que você sabe, e assumir a responsabilidade pela vitória. **(correta)**
- C) Provar que você merece um MMR mais alto agora.
- D) Pedir pra trocar de time toda partida.

> Origem: Princípio 6. A consciência dos 0,5% muda como você encara aliados e adversários — vira responsabilidade, não arrogância.

## Princípio 7 — Patrimônio (gold) por tempo é o KPI real

**Q7.1.** No fim da partida você teve KDA de 15/2/10 e quer avaliar se foi bem. O que
a Fórmula manda checar de verdade?

- A) O número de kills, que prova domínio.
- B) O patrimônio líquido (gold) acumulado ou extraído do mapa em relação ao tempo. **(correta)**
- C) O placar final do time.
- D) Quantas torres você derrubou.

> Origem: Princípio 7. Frag/KDA é só consequência; o KPI real é patrimônio por tempo.

**Q7.2.** Por que o relógio é o seu principal guia de decisões?

- A) Porque a partida tem tempo limite.
- B) Porque corrida é sobre tempo, e o desempenho real é patrimônio em relação ao tempo. **(correta)**
- C) Porque os smurfs aparecem em horários específicos.
- D) Porque o respawn depende do relógio.

> Origem: Princípio 7. Corrida é tempo, tempo é relógio — o relógio guia as decisões porque o KPI é gold/tempo.

**Q7.3.** Onde você confere o dado essencial de patrimônio líquido por jogador após a partida?

- A) No placar de kills.
- B) Na segunda opção dos gráficos no histórico da partida. **(correta)**
- C) No perfil do OpenDota apenas.
- D) No chat pós-jogo.

> Origem: Conceito de avaliação de progresso. Patrimônio líquido por jogador fica na segunda opção dos gráficos do histórico.

## Princípio 8 — Metas mensuráveis (500 GPM)

**Q8.1.** Você joga de Core. Quais são as metas de ouro aos 10 e aos 20 minutos?

- A) 2.500 aos 10 e 5.000 aos 20.
- B) 5.000 aos 10 e 10.000 aos 20. **(correta)**
- C) 3.000 aos 10 e 6.000 aos 20.
- D) 10.000 aos 10 e 20.000 aos 20.

> Origem: Princípio 8. Core: 5.000 aos 10 min, 10.000 aos 20 min.

**Q8.2.** Você joga de Suporte. Qual é a sua meta de ouro?

- A) A mesma do Core.
- B) A metade do Core: 2.500 aos 10 min e 5.000 aos 20 min. **(correta)**
- C) Não há meta de ouro pra Suporte.
- D) O dobro do Core, porque compra mais consumíveis.

> Origem: Princípio 8. Suporte: metade do Core — 2.500 aos 10, 5.000 aos 20.

**Q8.3.** A que valor de OPM (ouro por minuto) essas metas equivalem, e o que ele representa?

- A) 250 OPM, a média da maioria.
- B) 500 OPM, o mínimo aceitável pra quem quer extrair o máximo do mapa. **(correta)**
- C) 1.000 OPM, o teto de um Imortal.
- D) 100 OPM, o piso pra Suporte.

> Origem: Princípio 8. 500 OPM é o mínimo aceitável pra extração máxima de recursos.

## Princípio 9 — Jogar de Core é mais fácil

**Q9.1.** Por que a Fórmula afirma que jogar de Core é mais fácil que de Suporte?

- A) Porque o Core morre menos.
- B) Porque quanto mais patrimônio você acumula em menos tempo, mais simples ficam suas decisões. **(correta)**
- C) Porque o Suporte depende do time e o Core não joga em equipe.
- D) Porque o Core não precisa seguir o relógio.

> Origem: Princípio 9. Mais patrimônio em menos tempo torna as decisões mais simples.

**Q9.2.** Com mais recursos acumulados, o que o Core consegue fazer?

- A) Ignorar o objetivo do jogo.
- B) Acessar melhores itens, ter maior impacto nas lutas e ditar o ritmo da partida. **(correta)**
- C) Subir de MMR sem ganhar partidas.
- D) Jogar sem prestar atenção no relógio.

> Origem: Princípio 9. Mais recursos = melhores itens, maior impacto, controle do ritmo.

## Princípio 10 — Mid é a melhor rota para evoluir

**Q10.1.** Você ainda não chegou em Imortal e quer evoluir o mais rápido possível.
Qual rota a Fórmula recomenda e até quando?

- A) Hard support, até virar Lenda.
- B) Mid, até no mínimo atingir Divine. **(correta)**
- C) Offlane, até Ancestral.
- D) Safe lane, até Imortal.

> Origem: Princípio 10. Jogue Mid até no mínimo atingir Divine.

**Q10.2.** Qual é a principal vantagem do Mid pra evolução, segundo a doutrina?

- A) É a lane mais segura.
- B) Você não divide experiência com ninguém — dá pra alcançar 1 nível por minuto (a corrida do nível). **(correta)**
- C) Tem mais runas de regeneração.
- D) É a lane onde os smurfs não aparecem.

> Origem: Princípio 10. Mid não divide XP; permite 1 nível por minuto — a corrida do nível.

**Q10.3.** Por que o Mid é chamado do caminho mais rápido e eficiente pra evoluir?

- A) Porque dá mais kills.
- B) Porque desenvolve sua noção geral de Dota 2 e a capacidade de extrair o máximo de recursos no menor tempo. **(correta)**
- C) Porque garante vitória.
- D) Porque você não precisa farmar.

> Origem: Princípio 10. Mid desenvolve noção geral e extração de recursos no menor tempo.

## Princípio 11 — Solo Mid OU grupo de 5

**Q11.1.** Quais são as únicas duas configurações que a Fórmula recomenda pra aplicar o método?

- A) Dupla na safe lane ou trio na floresta.
- B) 100% solo no Mid (com chat mutado) ou grupo de 5 pessoas. **(correta)**
- C) Qualquer fila ranqueada serve.
- D) Solo em qualquer lane ou grupo de 3.

> Origem: Princípio 11. Apenas 100% solo no Mid ou grupo de 5.

**Q11.2.** Ao jogar 100% solo no Mid, o que a doutrina manda fazer nas configurações sociais?

- A) Deixar o chat ligado pra dar calls.
- B) Mutar 100% — selecionar a opção de não exibir mensagens de ninguém. **(correta)**
- C) Mutar só o chat de voz.
- D) Mutar apenas os aliados tóxicos.

> Origem: Princípio 11 / desvantagens do solo Mid. Todos os jogadores 100% mutados.

**Q11.3.** Por que combinações fora de "solo Mid" ou "grupo de 5" travam a evolução?

- A) Porque dão menos MMR por vitória.
- B) Porque misturam coordenação com isolamento. **(correta)**
- C) Porque atraem mais smurfs.
- D) Porque reduzem o seu GPM.

> Origem: Princípio 11. Qualquer outra combinação mistura coordenação com isolamento.

## Princípio 12 — Smurfs propõem desafio

**Q12.1.** Tem um smurf claramente mais forte no time adversário. Qual é o impacto disso no seu MMR e na sua evolução?

- A) Seu MMR cai mais se você perder pra smurf.
- B) Nenhum — o smurf não altera seu MMR nem seu processo de evolução. **(correta)**
- C) Você deve abandonar a partida.
- D) Você perde XP da temporada.

> Origem: Princípio 12. A presença de smurfs não altera MMR nem o processo de evolução.

**Q12.2.** Como a Fórmula manda encarar enfrentar smurfs?

- A) Como injustiça do matchmaking.
- B) Como desafio — só se melhora enfrentando pessoas melhores; ou você ganha, ou você aprende. **(correta)**
- C) Como motivo pra parar de jogar no dia.
- D) Como sinal de que você está num MMR errado.

> Origem: Princípio 12. O smurf propõe um desafio; mesmo perdendo, ou você ganha, ou você aprende.

## Princípio 13 — 70% win rate → +1000 MMR em 100 partidas

**Q13.1.** Com 70% de win rate em 100 partidas, qual é o saldo de MMR esperado?

- A) +500 de MMR.
- B) +1000 de MMR (40 vitórias de saldo × 25 MMR). **(correta)**
- C) +2000 de MMR.
- D) Depende só da sorte.

> Origem: Princípio 13. 70 vitórias - 30 derrotas = 40 de saldo × 25 MMR = +1000.

**Q13.2.** Jogando 5 partidas por dia com 70% de win rate, em quanto tempo você sobe 1000 de MMR?

- A) Em 7 dias.
- B) Em 20 dias (100 partidas). **(correta)**
- C) Em 2 meses.
- D) Em 100 dias.

> Origem: Princípio 13. 100 partidas a 5/dia = 20 dias = +1000 MMR.

**Q13.3.** Qual é o segredo pra que a matemática do 70% se concretize?

- A) Escolher sempre o herói mais forte do meta.
- B) Manter constância e seguir o método. **(correta)**
- C) Evitar partidas contra smurfs.
- D) Jogar só quando estiver inspirado.

> Origem: Princípio 13. O segredo é manter constância e seguir o método.

## Princípio 14 — Guardião → Divine em 2 meses

**Q14.1.** Quais são as faixas de MMR de Guardião e o início de Divine, segundo a doutrina?

- A) Guardião 0–800; Divine a partir de 3000.
- B) Guardião 800–1800; Divine a partir de 4600. **(correta)**
- C) Guardião 1800–2600; Divine a partir de 5000.
- D) Guardião 800–1800; Divine a partir de 4000.

> Origem: Princípio 14. Guardião entre 800 e 1800; Divine começa em 4600.

**Q14.2.** Mantendo 70% de win rate, quantas partidas e quanto tempo leva de Guardião a Divine?

- A) Cerca de 100 partidas, 1 mês.
- B) Cerca de 300 partidas, aproximadamente 2 meses (jogando 5/dia). **(correta)**
- C) Cerca de 500 partidas, 6 meses.
- D) Cerca de 1000 partidas, 1 ano.

> Origem: Princípio 14. ~300 partidas, ~2 meses a 5/dia.

**Q14.3.** O que transforma "meses de frustração" em progresso real e palpável?

- A) Trocar de servidor.
- B) Método e disciplina. **(correta)**
- C) Comprar uma conta calibrada.
- D) Esperar o meta mudar.

> Origem: Princípio 14. Com método e disciplina, frustração vira progresso real.

---

# SEÇÃO 2 — CONDUTA: OS 15 ANTI-PADRÕES

> Lembrete de severidade (HONOR_SYSTEM): leve → 1, 4, 5, 7, 11, 13. Média → 2, 3, 8, 12, 14, 15. Grave → 6, 9. Crítica → 10.

## Anti-padrão 1 — Cultura da Culpa (Blame Culture)

**Q15.1.** Depois de uma derrota você escreve "mid diff" no chat e fecha o jogo. Qual anti-padrão você cometeu?

- A) Desistência Precoce.
- B) Cultura da Culpa. **(correta)**
- C) Comunicação Tóxica.
- D) Ego Inflado.

> Origem: Anti-padrão 1. "mid diff", "pós 5 bot", "noob carry" são marcas da Cultura da Culpa.

**Q15.2.** Qual frase é sintoma clássico da Cultura da Culpa?

- A) "O que eu poderia ter feito diferente?"
- B) "Eu joguei bem, o time que é ruim." **(correta)**
- C) "Vou farmar pra carregar a próxima luta."
- D) "Errei o posicionamento, vou ajustar."

> Origem: Anti-padrão 1. Mentalidade do "eu joguei bem, o time que é ruim".

**Q15.3.** O que define o núcleo da Cultura da Culpa?

- A) Reclamar do servidor.
- B) Incapacidade de assumir responsabilidade pelas próprias decisões. **(correta)**
- C) Jogar mal mecanicamente.
- D) Perder muitas partidas seguidas.

> Origem: Anti-padrão 1. Incapacidade de assumir responsabilidade pelas próprias decisões.

## Anti-padrão 2 — Desistência Precoce (Give Up Mentality)

**Q16.1.** Aos 12 minutos o time está atrás e um aliado escreve "gg go next". Que anti-padrão é esse?

- A) Rage Quit.
- B) Desistência Precoce. **(correta)**
- C) Vitimização Sistêmica.
- D) Anti-time.

> Origem: Anti-padrão 2. Aos 10-15 min já escrevem "gg go next".

**Q16.2.** Qual comportamento caracteriza a Desistência Precoce?

- A) Pedir ajuda no chat de forma educada.
- B) Recusar-se a lutar ou tentar virar a partida por causa de desvantagens iniciais. **(correta)**
- C) Comprar itens defensivos cedo.
- D) Trocar de lane no early.

> Origem: Anti-padrão 2. Recusam-se a lutar, baseiam a derrota em pequenos erros ou desvantagens iniciais.

**Q16.3.** A partida está difícil aos 15 minutos. Qual é a conduta alinhada à doutrina (oposta à Desistência Precoce)?

- A) Escrever "acabou" e jogar de qualquer jeito.
- B) Manter a constância e continuar tentando virar — perder faz parte, mas desistir cedo não. **(correta)**
- C) Ir farmar jungle e ignorar o time.
- D) Sair da partida.

> Origem: Anti-padrão 2 (contraponto Princípio 5). Desvantagem inicial não justifica desistir.

## Anti-padrão 3 — Forçar Estratégias Inadequadas (Stubborn Playstyle)

**Q17.1.** Você sempre builda Midas no Spirit Breaker offlane, não importa a situação. Que anti-padrão é esse?

- A) Simulador de Herói.
- B) Forçar Estratégias Inadequadas. **(correta)**
- C) Ego Inflado.
- D) Brigas por Função.

> Origem: Anti-padrão 3. Exemplo canônico: "sempre buildo Midas no Spirit Breaker offlane".

**Q17.2.** Qual é a falha central de Forçar Estratégias Inadequadas?

- A) Jogar de Suporte por vontade própria.
- B) Insistir em táticas ou heróis fora do meta sem domínio, sem adaptar ao que a partida exige. **(correta)**
- C) Seguir o meta cegamente.
- D) Comprar itens caros.

> Origem: Anti-padrão 3. Insistência em táticas/heróis fora do meta sem domínio e falta de adaptação.

## Anti-padrão 4 — Falta de Comunicação ou Comunicação Tóxica

**Q18.1.** Um jogador só usa o chat pra xingar o time e ignora todos os pings. Que anti-padrão é esse?

- A) Anti-time.
- B) Falta de Comunicação ou Comunicação Tóxica. **(correta)**
- C) Ego Inflado.
- D) Rage Quit.

> Origem: Anti-padrão 4. Ignorar chat/pings ou usá-los só pra xingar.

**Q18.2.** Qual comportamento é exemplo de comunicação tóxica segundo a doutrina?

- A) Pingar o mapa pra avisar de perigo.
- B) Spammar chat/voz ofendendo e atrapalhando o time. **(correta)**
- C) Pedir desculpa por um erro.
- D) Ficar em silêncio jogando solo Mid mutado.

> Origem: Anti-padrão 4. Spammers de chat/voz que ofendem e atrapalham.

## Anti-padrão 5 — Rage Quit / AFK Disfarçado

**Q19.1.** Depois de morrer três vezes, o jogador vai farmar jungle sem interagir com o time pelo resto da partida. Que anti-padrão é esse?

- A) Feeding Intencional.
- B) Rage Quit / AFK Disfarçado. **(correta)**
- C) Desistência Precoce.
- D) Cultura da Culpa.

> Origem: Anti-padrão 5. Após morrer, vão farmar jungle sem interagir com o time.

**Q19.2.** Qual é a marca do AFK Disfarçado?

- A) Comprar itens errados.
- B) Largar o teclado e esperar a partida acabar, ou se isolar sem interagir. **(correta)**
- C) Discutir táticas no chat.
- D) Jogar agressivo demais.

> Origem: Anti-padrão 5. Largam o teclado e esperam a partida acabar.

## Anti-padrão 6 — Feeding Intencional (Griefing)

**Q20.1.** Um jogador não conseguiu a lane que queria e começa a morrer de propósito pra acabar logo. Que anti-padrão é esse, e qual a consequência numa partida com coach?

- A) Desistência Precoce; advertência.
- B) Feeding Intencional; vai DIRETO para suspensão de 14 dias. **(correta)**
- C) Anti-time; banimento.
- D) Rage Quit; nenhuma.

> Origem: Anti-padrão 6 (grave). Feeding em partida com coach vai direto pra suspensão de 14 dias.

**Q20.2.** Qual mentalidade descreve o Feeding Intencional?

- A) "Vou farmar pra carregar."
- B) "Se não fizerem o que eu quero, vou feedar até acabar logo." **(correta)**
- C) "Vou pingar pra coordenar."
- D) "Errei, vou ajustar."

> Origem: Anti-padrão 6. Mentalidade de feedar por ego ferido ou birra.

**Q20.3.** Por que o Feeding Intencional é classificado como grave (não leve)?

- A) Porque atrapalha o farm de um jogador só.
- B) Porque sabota deliberadamente a partida — é griefing, leva à suspensão direta. **(correta)**
- C) Porque reduz o GPM do time.
- D) Porque gera reports automáticos da Valve.

> Origem: Anti-padrão 6 (severity grave, directSeverity suspensao).

## Anti-padrão 7 — Ego Inflado

**Q21.1.** "Eu merecia estar no Divino, mas meu time me segura aqui." Que anti-padrão essa fala revela?

- A) Vitimização Sistêmica.
- B) Ego Inflado. **(correta)**
- C) Cultura da Culpa.
- D) Anti-time.

> Origem: Anti-padrão 7. "Eu merecia estar no Ancient/Divino, mas meu time me segura."

**Q21.2.** Qual é o perigo do Ego Inflado segundo a doutrina?

- A) Faz o jogador comprar itens errados.
- B) Vira justificativa para atitudes tóxicas. **(correta)**
- C) Aumenta o tempo de fila.
- D) Reduz o XP por minuto.

> Origem: Anti-padrão 7. Usam o ego como justificativa para atitudes tóxicas.

## Anti-padrão 8 — Brigas por Função e Rota

**Q22.1.** O mid já foi escolhido, mas outro jogador insiste em ir mid também ("2 mids"). Que anti-padrão é esse?

- A) Forçar Estratégias Inadequadas.
- B) Brigas por Função e Rota. **(correta)**
- C) Ego Inflado.
- D) Anti-time.

> Origem: Anti-padrão 8. Disputar a mesma lane/função já escolhida (2 mids, 3 carries).

**Q22.2.** Qual mentalidade caracteriza as Brigas por Função e Rota?

- A) "Jogo onde o time precisar."
- B) "Se não for do meu jeito, não vai ser de ninguém." **(correta)**
- C) "Vou pegar suporte hoje."
- D) "Deixa o mid pra quem chegou primeiro."

> Origem: Anti-padrão 8. Mentalidade do "se não for do meu jeito, não vai ser de ninguém".

## Anti-padrão 9 — Desrespeito à Liderança (Anti-time)

**Q23.1.** Num grupo de 5, um jogador se recusa a ouvir qualquer call e joga só pra si, ignorando a equipe. Que anti-padrão é esse?

- A) Ego Inflado.
- B) Desrespeito à Liderança (Anti-time). **(correta)**
- C) Brigas por Função.
- D) Comunicação Tóxica.

> Origem: Anti-padrão 9 (grave). Recusam-se a ouvir calls, jogam de forma egoísta ignorando a equipe.

**Q23.2.** Um aliado faz uma sugestão educada e o jogador a recusa só por orgulho. Qual anti-padrão está em jogo?

- A) Paralaxe cognitiva.
- B) Desrespeito à Liderança (Anti-time). **(correta)**
- C) Vitimização Sistêmica.
- D) Simulador de Herói.

> Origem: Anti-padrão 9. Não aceitam sugestões, mesmo que educadas.

**Q23.3.** Por que o Anti-time é classificado como grave?

- A) Porque reduz o farm individual.
- B) Porque sabota a coordenação da equipe de forma deliberada — leva à suspensão direta. **(correta)**
- C) Porque atrapalha só uma luta.
- D) Porque gera report da Valve.

> Origem: Anti-padrão 9 (severity grave).

## Anti-padrão 10 — Preconceito, Xenofobia e Racismo

**Q24.1.** Um jogador escreve "brasileiro só sabe feedar" no chat. Qual é a classificação e a consequência?

- A) Comunicação Tóxica; advertência.
- B) Preconceito/Xenofobia/Racismo; banimento imediato, sem advertência e sem segunda chance. **(correta)**
- C) Ego Inflado; suspensão de 7 dias.
- D) Cultura da Culpa; HONOR loss pequeno.

> Origem: Anti-padrão 10 (crítica, directSeverity banimento). Banimento imediato, sem advertência.

**Q24.2.** Quais destes são exemplos do anti-padrão de Preconceito citados na doutrina?

- A) "Joga melhor da próxima."
- B) "russo é tudo troll", "peruano lagado", "brasileiro só sabe feedar". **(correta)**
- C) "mid diff", "noob carry".
- D) "gg go next".

> Origem: Anti-padrão 10. Comentários ofensivos sobre nacionalidades, sotaques e estilos de jogo.

**Q24.3.** É o único anti-padrão da matriz que pula direto pro banimento. Por quê?

- A) Porque é o mais comum.
- B) Porque é classificado como crítico — ofende a dignidade e destrói o ambiente, sem espaço pra reincidência. **(correta)**
- C) Porque a Valve já bane automaticamente.
- D) Porque reduz o win rate do time.

> Origem: Anti-padrão 10 (severity crítica). Único com directSeverity banimento.

## Anti-padrão 11 — Simulador de Herói

**Q25.1.** Um jogador domina perfeitamente as habilidades do herói, mas reage às jogadas do adversário em vez de extrair patrimônio no menor tempo. Que anti-padrão é esse?

- A) Forçar Estratégias Inadequadas.
- B) Simulador de Herói. **(correta)**
- C) Ego Inflado.
- D) Desistência Precoce.

> Origem: Anti-padrão 11. Sabe usar o herói mas joga sem objetivos do jogo, reagindo em vez de extrair patrimônio.

**Q25.2.** Quais objetivos do jogo o Simulador de Herói ignora?

- A) Kills e assistências.
- B) Relógio, patrimônio, runas e altar da experiência. **(correta)**
- C) Comunicação por voz.
- D) Report de tóxicos.

> Origem: Anti-padrão 11. Joga sem objetivos do jogo — relógio, patrimônio, runas, altar da experiência.

**Q25.3.** Que dado a Valve reconheceu publicamente, relacionado ao Simulador de Herói?

- A) Que 50% dos jogadores trollam.
- B) Que 99,5% dos jogadores não sabem jogar Dota 2 — jogam no automático. **(correta)**
- C) Que o matchmaking é injusto.
- D) Que smurfs dominam o ranqueado.

> Origem: Anti-padrão 11. A Valve reconheceu que 99,5% jogam no automático (simulador de herói).

## Anti-padrão 12 — Criar Expectativas em Terceiros

**Q26.1.** Você fica esperando o pull do suporte e o gank do mid que nunca vêm, e baseia sua jogada nisso. Que anti-padrão ATIVO você cometeu?

- A) Vitimização Sistêmica.
- B) Criar Expectativas em Terceiros. **(correta)**
- C) Anti-time.
- D) Cultura da Culpa.

> Origem: Anti-padrão 12. Comportamento ativo de projetar resultados nos aliados (pull, gank, ajuda que nunca vem).

**Q26.2.** Qual é a diferença entre o Princípio 2 ("frustração nasce de expectativas") e o Anti-padrão 12?

- A) São a mesma coisa.
- B) O princípio é a reação mental à frustração; o anti-padrão é o COMPORTAMENTO ATIVO de projetar resultados em outros. **(correta)**
- C) O princípio é sobre o adversário; o anti-padrão é sobre o time.
- D) O princípio é técnico; o anti-padrão é sobre farm.

> Origem: Anti-padrão 12. Distinto do princípio mental — aqui é a ação de criar a expectativa.

**Q26.3.** Sobre quem você PODE (e deve) criar expectativas, segundo a doutrina?

- A) Sobre os aliados que jogam bem.
- B) Sobre você mesmo — sobre outras pessoas, jamais. **(correta)**
- C) Sobre o adversário mais fraco.
- D) Sobre o resultado da partida.

> Origem: Anti-padrão 12. Você pode e deve criar expectativas sobre você mesmo; sobre outros, jamais.

## Anti-padrão 13 — Vitimização Sistêmica

**Q27.1.** Um jogador repete há semanas que "o matchmake me persegue" e "o Dota é injusto comigo". Que anti-padrão é esse?

- A) Cultura da Culpa.
- B) Vitimização Sistêmica. **(correta)**
- C) Ego Inflado.
- D) Desistência Precoce.

> Origem: Anti-padrão 13. Identidade crônica de vítima — "o matchmake me persegue", "o Dota é injusto comigo".

**Q27.2.** Qual é a diferença entre Cultura da Culpa (#1) e Vitimização Sistêmica (#13)?

- A) Não há diferença.
- B) A Cultura da Culpa é reação pontual a uma partida; a Vitimização Sistêmica é um padrão recorrente, uma identidade crônica. **(correta)**
- C) Uma é técnica e a outra é comportamental.
- D) Uma só acontece em grupo de 5.

> Origem: Anti-padrão 13. Distinto da Cultura da Culpa por ser identidade crônica, não reação pontual.

**Q27.3.** Qual é o custo de construir uma identidade de vítima?

- A) Perder MMR mais rápido.
- B) Criar uma blindagem contra o próprio crescimento toda vez que coloca a culpa nos outros. **(correta)**
- C) Receber mais smurfs adversários.
- D) Aumentar o tempo de fila.

> Origem: Anti-padrão 13. Colocar a culpa nos outros cria blindagem contra o próprio crescimento.

## Anti-padrão 14 — Recusa de Auditoria Pós-Derrota

**Q28.1.** Você perdeu uma partida e foi direto pra próxima sem refletir. Que anti-padrão por OMISSÃO você cometeu?

- A) Desistência Precoce.
- B) Recusa de Auditoria Pós-Derrota. **(correta)**
- C) Vitimização Sistêmica.
- D) Rage Quit.

> Origem: Anti-padrão 14. Anti-padrão por omissão: não fazer a pergunta-pivô após cada derrota.

**Q28.2.** Qual é a pergunta-pivô canônica que você deve fazer após cada derrota?

- A) "Quem foi o pior do time?"
- B) "O que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?" **(correta)**
- C) "Vale a pena continuar jogando hoje?"
- D) "O matchmaking foi justo?"

> Origem: Anti-padrão 14. A pergunta canônica pós-derrota.

**Q28.3.** O que acontece com a derrota quando não há auditoria?

- A) Vira automaticamente vitória na próxima.
- B) Deixa de ser degrau e vira ciclo — sem auditoria não há aprendizado. **(correta)**
- C) É revertida pelo sistema.
- D) Não afeta a evolução.

> Origem: Anti-padrão 14. Sem auditoria não há aprendizado; derrota deixa de ser degrau e vira ciclo.

## Anti-padrão 15 — Buscar Diversão em Espaço de Competição

**Q29.1.** Alguém entra na FormulaDota dizendo que só quer "se divertir e relaxar". O que a doutrina diz sobre isso?

- A) É bem-vindo, contanto que não seja tóxico.
- B) Viola o contrato cultural — aqui é ambiente pra aprender, evoluir e competir, não pra se divertir. **(correta)**
- C) Pode jogar, mas só no lobby livre.
- D) Depende da medalha dele.

> Origem: Anti-padrão 15. Buscar diversão viola o contrato cultural — aqui é pra aprender, evoluir e competir.

**Q29.2.** Segundo a doutrina, qual a relação entre competição e diversão?

- A) São a mesma coisa.
- B) Competição não está coligada com diversão — quem quer se divertir joga turbo ou casual, não FormulaDota. **(correta)**
- C) A diversão deve vir antes da competição.
- D) Sem diversão não há evolução.

> Origem: Anti-padrão 15. Competição não está coligada com diversão; quem quer diversão joga turbo ou casual.

**Q29.3.** Por que esse mismatch de propósito é tratado como anti-padrão?

- A) Porque reduz o número de jogadores.
- B) Porque entrar buscando diversão num espaço de competição quebra o acordo cultural do ambiente. **(correta)**
- C) Porque a diversão atrapalha o farm.
- D) Porque a Valve proíbe.

> Origem: Anti-padrão 15. Mismatch de propósito viola o contrato cultural.

---

# SEÇÃO 3 — METODOLOGIA: CONCEITOS CENTRAIS

> Conceitos extraídos de `A FÓRMULA DO DOTA DE CORRIDA.txt`. Alguns reforçam
> princípios técnicos (7–14); aqui o foco é a COMPREENSÃO do método de gameplay e
> de progressão, em cenários de aplicação.

## Conceito M1 — O que é "Dota de Corrida"

**QM1.1.** Por que a metodologia se chama "Fórmula do Dota de Corrida"?

- A) Porque você precisa jogar rápido e clicar veloz.
- B) Porque corrida é sobre tempo, tempo é relógio, e o desempenho real é patrimônio em relação ao tempo. **(correta)**
- C) Porque é uma corrida contra os smurfs.
- D) Porque é uma corrida pra ganhar mais kills que o adversário.

> Origem: Conceito "O que é Dota de Corrida". Corrida = tempo = relógio; KPI é gold/tempo.

**QM1.2.** A Fórmula do Dota de Corrida é melhor descrita como:

- A) Uma build específica de itens.
- B) Uma mudança de mentalidade — uma forma de enxergar o Dota com clareza, objetividade e foco no que importa. **(correta)**
- C) Uma rotação de heróis do meta.
- D) Um macro de teclado.

> Origem: Texto canônico. "Não é só uma estratégia ou build. É uma mudança de mentalidade."

**QM1.3.** Qual é a proposta central da aula, declarada logo no início?

- A) Te entreter com jogadas bonitas.
- B) Te mudar por dentro — na forma de pensar, jogar e reagir ao Dota. **(correta)**
- C) Te ensinar combos mecânicos.
- D) Te dar uma conta calibrada.

> Origem: CANONICAL_QUOTES.opening. "A ideia aqui não é te entreter — é te mudar por dentro."

## Conceito M2 — Frag/KDA é só consequência

**QM2.1.** Um jogador diz que foi bem porque fez muitas kills. Como a Fórmula corrige essa visão?

- A) Kills são o único indicador que importa.
- B) Frag/KDA não define a performance real — é apenas consequência; o indicador real é patrimônio por tempo. **(correta)**
- C) Kills importam mais que torres.
- D) KDA define a sua medalha.

> Origem: Conceito M2 / Princípio 7. Frag/KDA é consequência, não o KPI.

**QM2.2.** Se KDA não mede performance, o que mede?

- A) O número de assistências.
- B) O patrimônio líquido (gold) extraído do mapa em relação ao tempo. **(correta)**
- C) A quantidade de torres.
- D) O tempo de partida.

> Origem: Conceito M2 / Princípio 7. O verdadeiro indicador é patrimônio por tempo.

## Conceito M3 — O relógio como guia de decisões

**QM3.1.** Você está decidindo se vai rotacionar ou continuar farmando. Qual é o principal guia da decisão, segundo a Fórmula?

- A) O que o time pede no chat.
- B) O relógio — porque o desempenho é medido por patrimônio em relação ao tempo. **(correta)**
- C) O número de kills do inimigo.
- D) A sua intuição do momento.

> Origem: Conceito M3 / Princípio 7. O relógio é o principal guia de decisões.

**QM3.2.** O que significa, na prática, usar o relógio como guia?

- A) Encerrar a partida no menor tempo possível sempre.
- B) Tomar decisões com base em quanto patrimônio você deveria ter naquele minuto. **(correta)**
- C) Jogar só partidas curtas.
- D) Ignorar o early game.

> Origem: Conceito M3 / Princípio 8. As metas são ancoradas no tempo (10 e 20 min).

## Conceito M4 — Como avaliar seu progresso (pós-partida)

**QM4.1.** Acabou a partida. Qual é o hábito que a Fórmula manda criar a partir de agora?

- A) Ver o replay inteiro.
- B) Conferir o patrimônio líquido por jogador na segunda opção dos gráficos do histórico, comparando com as metas. **(correta)**
- C) Anotar quantas kills fez.
- D) Reportar os tóxicos.

> Origem: Conceito "Como Avaliar Seu Progresso". Conferir patrimônio líquido por jogador no histórico.

**QM4.2.** As metas de ouro são sempre atingíveis independentemente do que aconteça?

- A) Sim, são garantidas.
- B) São plenamente alcançáveis em condições ideais; numa partida real os outros 9 podem ajudar ou atrapalhar, dependendo das suas escolhas. **(correta)**
- C) Não, dependem só da sorte.
- D) Só são atingíveis jogando de Suporte.

> Origem: Conceito M4. Valores alcançáveis em condições ideais; partida real depende das suas escolhas e dos outros 9.

**QM4.3.** Por que comparar seu patrimônio com a meta de 500 OPM importa?

- A) Pra ganhar mais MMR por partida.
- B) Porque mostra objetivamente se você extraiu o mínimo aceitável dos recursos do mapa. **(correta)**
- C) Porque define quem foi MVP.
- D) Porque a Valve exige.

> Origem: Conceito M4 / Princípio 8. 500 OPM é o mínimo aceitável de extração.

## Conceito M5 — Vantagens e desvantagens do Solo Mid

**QM5.1.** Você decide jogar 100% solo no Mid. Qual é a vantagem estrutural disso, segundo a doutrina?

- A) Você sempre vence.
- B) Seus adversários tendem a ser mais fáceis e você já começa em vantagem de conhecimento sobre os 4 aliados e os 5 inimigos. **(correta)**
- C) Você não precisa farmar.
- D) Você ganha mais MMR por vitória.

> Origem: Conceito "Vantagens de Jogar Solo no Mid". Adversários mais fáceis; você começa em vantagem de conhecimento.

**QM5.2.** Qual é a desvantagem aceita do solo Mid mutado, e como encará-la?

- A) Você não pode farmar; aceite jogar de Suporte.
- B) A comunicação é quase nula — você faz o que precisa sem contar com ajuda; se alguém ajudar, é bônus. **(correta)**
- C) Você perde MMR mais rápido.
- D) Você nunca enfrenta smurfs.

> Origem: Conceito "Desvantagens de Jogar Solo no Mid". Comunicação quase nula; ajuda é bônus, o normal é não ajudarem.

**QM5.3.** No solo Mid, qual é a expectativa realista sobre os aliados?

- A) Que eles sigam suas calls.
- B) Que o normal seja não ajudarem, e muitas vezes atrapalharem — qualquer ajuda é bônus. **(correta)**
- C) Que eles tenham o mesmo conhecimento que você.
- D) Que eles ganhem a lane deles sozinhos.

> Origem: Conceito M5 (cruza com Anti-padrão 12). O normal é aliados não ajudarem; ajuda é bônus.

## Conceito M6 — Vantagens e desvantagens do grupo de 5

**QM6.1.** Qual é a vantagem de jogar em grupo de 5, segundo a doutrina?

- A) Você sempre enfrenta times desorganizados.
- B) Você não precisa jogar exclusivamente no Mid e pode praticar a função que mais gosta, com comunicação mais saudável. **(correta)**
- C) Você ganha mais ouro por minuto automaticamente.
- D) Os smurfs não entram em partidas de grupo de 5.

> Origem: Conceito "Vantagens de Jogar em Grupo de 5". Pode praticar a função preferida; comunicação mais saudável.

**QM6.2.** Qual é a desvantagem do grupo de 5?

- A) Você não pode usar o chat.
- B) As partidas tendem a ser mais difíceis, porque o time adversário também será um grupo de 5 organizado e coordenado. **(correta)**
- C) Você perde acesso ao Mid.
- D) Você não pode farmar.

> Origem: Conceito "Desvantagens de Jogar em Grupo de 5". Adversário também é grupo de 5 coordenado.

## Conceito M7 — A constância e a taxa de vitórias

**QM7.1.** Qual taxa de win rate a maioria dos jogadores mantém, e a partir de qual valor já se considera acima da média?

- A) 40%, e acima da média a partir de 50%.
- B) 50%, e acima da média a partir de 55%. **(correta)**
- C) 60%, e acima da média a partir de 70%.
- D) 70%, e acima da média a partir de 80%.

> Origem: Conceito "Planejamento". A maioria fica em 50%; a partir de 55% já é acima da média.

**QM7.2.** Qual é o principal indicador analítico das suas partidas, segundo o planejamento da Fórmula?

- A) O número de kills por partida.
- B) A sua taxa de vitórias e derrotas (win rate). **(correta)**
- C) O seu GPM médio.
- D) O número de partidas jogadas.

> Origem: Conceito M7. O principal indicador é a taxa de vitórias/derrotas.

**QM7.3.** Uma variação considerável no seu win rate (pra cima ou pra baixo) significa o quê?

- A) Que o matchmaking está bugado.
- B) Que algo está diferente — é um sinal a ser analisado. **(correta)**
- C) Que você deve trocar de herói.
- D) Que você deve parar de jogar.

> Origem: Conceito M7. Qualquer variação considerável é sinal de que algo está diferente.

## Conceito M8 — Você está entre os 0,5%

**QM8.1.** A Valve afirmou que 99,5% dos jogadores não sabem jogar Dota 2. O que isso muda em como você encara seus aliados?

- A) Você deve cobrá-los pra que joguem como você.
- B) Você não deve esperar que eles saibam o que você sabe. **(correta)**
- C) Você deve reportá-los.
- D) Você deve carregar todos sozinho gritando no chat.

> Origem: Conceito "Você Agora Está Entre os 0,5%". Não espere que aliados saibam o que você sabe.

**QM8.2.** Estar entre os 0,5% muda como você encara os adversários. Como?

- A) Você deve subestimá-los e jogar relaxado.
- B) Entendendo que eles não possuem a sua leitura de jogo. **(correta)**
- C) Achando que todos são smurfs.
- D) Evitando lutar contra eles.

> Origem: Conceito M8. Os adversários não possuem sua leitura de jogo.

## Conceito M9 — Você não vai ganhar todas (derrota inevitável)

**QM9.1.** Quais fatores podem tornar uma derrota inevitável, segundo a doutrina?

- A) Apenas o seu próprio erro.
- B) Companheiros tóxicos, drafts desequilibrados, erros individuais ou uma partida simplesmente fora do seu controle. **(correta)**
- C) Apenas a presença de smurfs.
- D) Apenas o lag do servidor.

> Origem: Conceito "Vitórias e Derrotas". Lista os fatores de derrota inevitável.

**QM9.2.** Mesmo com derrotas inevitáveis, o que faz o MMR subir como consequência natural?

- A) Trocar de servidor.
- B) Aprender com cada derrota e manter o foco no longo prazo. **(correta)**
- C) Jogar mais partidas por dia.
- D) Escolher heróis mais fortes.

> Origem: Conceito M9. Aprender com cada derrota + foco no longo prazo = MMR sobe como consequência.

## Conceito M10 — A mentalidade competitiva e o compromisso

**QM10.1.** Ao entrar na FormulaDota, o que a mentalidade competitiva exige de você em alguns momentos?

- A) Jogar só os heróis que você gosta.
- B) Deixar de lado hábitos ou preferências que não contribuem pra sua evolução, focando no necessário. **(correta)**
- C) Jogar o máximo de partidas possível.
- D) Evitar partidas difíceis.

> Origem: Conceito do compromisso / CANONICAL_QUOTES.competitiveMindset. Deixar de lado hábitos que não contribuem.

**QM10.2.** O que NÃO importa pra começar a aplicar a Fórmula, segundo a doutrina?

- A) A sua disposição em mudar.
- B) Em qual medalha você está agora, quantas partidas joga por dia, ou quantas já tem no jogo. **(correta)**
- C) Seguir o método com constância.
- D) Fazer a auditoria pós-derrota.

> Origem: Conceito do compromisso. Não importa medalha atual, frequência ou histórico — importa aplicar com consistência.

## Conceito M11 — A missão do FormulaDota

**QM11.1.** Qual é a missão declarada do FormulaDota?

- A) Tornar Pedro Paulo o jogador nº 1.
- B) Formar pelo menos 200 jogadores na medalha Imortal, de forma 100% legítima. **(correta)**
- C) Criar a maior comunidade de Dota do Brasil.
- D) Vender contas calibradas.

> Origem: CANONICAL_QUOTES.mission. Formar 200 jogadores Imortais de forma 100% legítima.

**QM11.2.** O alcance da missão depende só do material e do método?

- A) Sim, basta seguir o conteúdo.
- B) Não — depende também de você, do quão determinado você está a alcançar o objetivo. **(correta)**
- C) Depende só da sorte no matchmaking.
- D) Depende da medalha em que você começou.

> Origem: Conceito da missão. O material dá o conhecimento; o resultado depende da sua determinação.

## Conceito M12 — A corrida do nível (1 nível por minuto)

**QM12.1.** O que a doutrina chama de "corrida do nível"?

- A) Subir de medalha em uma temporada.
- B) Alcançar até 1 nível por minuto no Mid, já que você não divide experiência com ninguém. **(correta)**
- C) Ganhar uma partida em menos de 20 minutos.
- D) Subir de nível na plataforma FormulaDota.

> Origem: Princípio 10 / Conceito M12. No Mid, 1 nível por minuto — a corrida do nível.

**QM12.2.** Por que o Mid permite a corrida do nível?

- A) Porque tem mais creeps.
- B) Porque você não divide experiência com ninguém na lane. **(correta)**
- C) Porque a XP do Mid é dobrada.
- D) Porque os adversários são bots.

> Origem: Princípio 10 / Conceito M12. Não dividir XP é o que permite 1 nível por minuto.

## Conceito M13 — A distribuição de medalhas

**QM13.1.** Onde está a maior concentração de jogadores de Dota 2, segundo os dados citados?

- A) Imortal e Divine.
- B) Guardião, Cruzado e Arconte (cada uma com mais de 1,25 milhão de jogadores). **(correta)**
- C) Lenda e Ancestral.
- D) Distribuída igualmente em todas.

> Origem: Conceito da distribuição. Maior concentração em Guardião, Cruzado e Arconte.

**QM13.2.** Quem é o foco do conteúdo da Fórmula?

- A) Apenas jogadores Imortais.
- B) Jogadores que desejam subir o MMR, com o objetivo de transformá-los no mínimo em Divine. **(correta)**
- C) Apenas iniciantes que nunca jogaram.
- D) Apenas jogadores de Suporte.

> Origem: Conceito do foco do conteúdo. Voltado a quem quer subir MMR até no mínimo Divine.

## Conceito M14 — Autocrítica e autoanálise

**QM14.1.** Segundo a doutrina, o que acontece quando você para de olhar pros outros e passa a olhar pra si mesmo?

- A) Você fica mais frustrado.
- B) Você começa a enxergar onde pode melhorar através da autocrítica. **(correta)**
- C) Você joga mais defensivo.
- D) Você perde menos MMR.

> Origem: Princípio 1 / Conceito M14. Olhar pra si abre a autocrítica e revela onde melhorar.

**QM14.2.** A autocrítica e a autoanálise servem pra quê na Fórmula?

- A) Pra justificar derrotas.
- B) Pra desenvolver a evolução real no Dota 2, com base na autorresponsabilidade. **(correta)**
- C) Pra comparar seu KDA com o dos outros.
- D) Pra decidir quando parar de jogar.

> Origem: Conceito M14. Autocrítica/autoanálise são o motor da evolução; a vitória nasce da autorresponsabilidade.

---

## Metodologia — Fundamentos Táticos (L1–L6) — adicionado 2026-06-02

> Questões derivadas de `docs/foundations/METODOLOGIA_FUNDAMENTOS.md` (camada
> operacional/tática — o COMO aplicar em partida). Fidelidade total aos números:
> 1000 partidas para especialista, runas de 4 em 4 min, 57 XP melee / 69 XP ranged /
> 240 XP por wave, level 2 na morte do 9º creep. Voz Mestre + Guardião, PT-BR, sem emoji.

## Lição L1 — O meta é obrigatório

**QL1.1.** Um aliado diz que não joga o meta porque "é só modinha e opinião". Como a Fórmula corrige essa visão?

- A) Concordar — o meta muda toda semana e não vale a pena seguir.
- B) Explicar que meta é Most Effective Tactic Available: o padrão que mais se repete e tem o maior percentual de vitória ao longo do tempo, validado por dado, não por achismo. **(correta)**
- C) Dizer que o meta só importa em partidas profissionais.
- D) Falar que cada um joga do jeito que prefere e tudo bem.

> Origem: L1. Meta = Most Effective Tactic Available; é o padrão de maior taxa de vitória medido por dado, não opinião.

**QL1.2.** Você quer saber o que está funcionando no patch atual antes de jogar. Onde a Fórmula manda ler o meta?

- A) Nos comentários de vídeos do YouTube.
- B) Em dota2protracker.com, a referência de leitura do meta do patch. **(correta)**
- C) No chat da partida anterior.
- D) Na sua própria intuição sobre quais heróis parecem fortes.

> Origem: L1. O meta é apresentado e medido em dota2protracker.com.

**QL1.3.** Por que ignorar o meta é considerado um erro de fundamento, e não só uma preferência?

- A) Porque a Valve pune quem foge do meta.
- B) Porque ignorar o meta é ignorar o padrão de maior taxa de vitória — é apostar opinião contra dado, contrariando a lógica de caos determinístico da Fórmula. **(correta)**
- C) Porque os aliados vão reportar quem não segue o meta.
- D) Porque heróis fora do meta não conseguem farmar.

> Origem: L1. Quem joga contra o meta aposta opinião contra dado; conecta com caos determinístico / Fibonacci (METHODOLOGY.md §4).

## Lição L2 — Qualquer herói funciona em qualquer posição (se você for especialista)

**QL2.1.** Você quer levar um herói para uma posição fora do padrão. O que, segundo a Fórmula, habilita isso?

- A) O herói estar no meta naquele momento.
- B) Ser especialista naquele herói — não é a posição que limita o herói, é a especialização comprovada que o libera. **(correta)**
- C) O time concordar no chat antes do jogo.
- D) Ter um item específico que destrava a função.

> Origem: L2. A posição não limita o herói; o que habilita um herói fora do padrão é a especialização comprovada.

**QL2.2.** A Fórmula define um número exato para "especialista" num herói. Qual é, e como se verifica?

- A) 100 partidas, verificável no perfil do jogo.
- B) 1000 partidas com o mesmo herói, verificável via OpenDota API. **(correta)**
- C) 500 partidas, comprovadas pela medalha.
- D) 300 partidas, registradas na plataforma FormulaDota.

> Origem: L2. Especialista = 1000 partidas com o mesmo herói, verificável via OpenDota API.

**QL2.3.** Onde se constrói a maestria que torna você especialista num herói?

- A) Em partidas turbo e casual.
- B) Na ranked (o jogo oficial) — a plataforma reconhece e usa o que a ranked comprova, não substitui esse caminho. **(correta)**
- C) Apenas treinando contra bots.
- D) Assistindo replays de profissionais.

> Origem: L2. A maestria é construída jogando a ranked; a plataforma reconhece o que a ranked comprova.

## Lição L3 — A teoria do lado do mapa

**QL3.1.** Por que existe um padrão estatístico em que os Iluminados vencem mais jogando no top e os Temidos mais jogando no bot?

- A) Porque os creeps do top dão mais ouro.
- B) Porque levar a 1ª torre da trilha vulnerável do adversário abre muito espaço de farm e te entrega o domínio do terreno elevado, com a visão que vem dele. **(correta)**
- C) Porque o servidor favorece esses lados.
- D) Porque os heróis do top são mais fortes.

> Origem: L3. Tomar a 1ª torre da trilha vulnerável abre espaço de farm e dá domínio do high ground.

**QL3.2.** Por que dominar o terreno elevado dá vantagem, em termos da mecânica do Dota 2?

- A) Porque heróis no alto recebem mais regeneração.
- B) Porque a mecânica de fog faz com que quem está embaixo não enxergue quem está em cima — você sempre toma a iniciativa contra um adversário sem visão. **(correta)**
- C) Porque o alto tem mais creeps neutros.
- D) Porque o dano é maior atacando de cima.

> Origem: L3. O high ground existe para controle de área por causa do fog; quem está embaixo não vê quem está em cima.

**QL3.3.** Na analogia do primeiro tiro, o que decide a luta entre heróis que são todos fortes e "roubados"?

- A) Quem tiver o maior MMR.
- B) Quem dá o primeiro tiro — o privilégio do start, concedido na maioria das vezes pela visão do terreno elevado, com harmonia entre os jogadores. **(correta)**
- C) Quem tiver mais ouro acumulado.
- D) Quem escolheu o herói mais forte do meta.

> Origem: L3. Todos os heróis são fortes; vence quem dá o primeiro tiro — o privilégio do start vem da visão do alto, com harmonia da equipe.

## Lição L4 — A disputa começa na runa do minuto 00:00

**QL4.1.** No início da partida, com que frequência nascem as runas de ouro, segundo a Fórmula?

- A) De 2 em 2 minutos.
- B) De 4 em 4 minutos, começando junto com a primeira wave quando a contagem chega a zero. **(correta)**
- C) De 5 em 5 minutos.
- D) Só após o minuto 6.

> Origem: L4. As runas de ouro nascem de 4 em 4 minutos; a primeira sai junto com a primeira wave no fim da contagem regressiva.

**QL4.2.** Você está em dúvida se vai disputar a runa do minuto 0 sozinho no lado errado. O que a Fórmula manda?

- A) Ir disputar — runa de ouro vale o risco sempre.
- B) Não ir: disputar runa no lado errado é erro, quem vai sozinho provavelmente morre; chegue inteiro, com a skill de level 1 upada certo, pronto para a 1ª wave. **(correta)**
- C) Ir, mas só se um aliado for junto.
- D) Esperar a segunda runa e ignorar a primeira wave.

> Origem: L4. Disputar runa no lado errado é erro; quem vai sozinho provavelmente morre. Chegue inteiro, com a skill certa.

**QL4.3.** Um jogador fica brigando pela runa do minuto 0, chega atrasado na 1ª wave e perde a XP dos primeiros creeps. Que anti-padrão ele está cometendo?

- A) Desistência Precoce.
- B) Simulador de Herói (anti-padrão 11) — gastou recurso sem servir a um objetivo do mapa e atrasou a própria progressão. **(correta)**
- C) Ego Inflado.
- D) Brigas por Função.

> Origem: L4 ↔ anti-padrão 11. Brigar pela runa errada e atrasar a progressão é simulador de herói em ação.

## Lição L5 — Ganhar a lane e a matemática dos 9 creeps

**QL5.1.** Na Fórmula, o que significa exatamente "ganhar a lane"?

- A) Ter mais last hits que o adversário aos 10 minutos.
- B) Causar a primeira morte na lane. **(correta)**
- C) Destruir a primeira torre.
- D) Ter mais ouro que o adversário direto.

> Origem: L5. Ganhar a lane = causar a primeira morte.

**QL5.2.** Quanto de XP cada wave entrega, e por que esse número é decisivo?

- A) 200 de XP, suficiente para o level 2 sozinho.
- B) 240 de XP (3 creeps melee de 57 + 1 ranged de 69), que é exatamente o necessário para subir do level 1 para o level 2. **(correta)**
- C) 180 de XP, metade do necessário para o level 2.
- D) 300 de XP, o que dá direto o level 3.

> Origem: L5. Cada wave = 3 melee (57 XP) + 1 ranged (69 XP) = 240 XP, exatamente o necessário para o level 2.

**QL5.3.** Dois jogadores dividindo a XP da lane (com 1 deny) pegam o level 2 na morte de qual creep, e por quê?

- A) Do 8º creep, porque 8 creeps somam 240 dividido por dois.
- B) Do 9º creep — o primeiro creep da terceira wave — porque a XP do creep é ímpar e o "meio" de XP é taxado pela Valve, já que a XP do herói é inteira. **(correta)**
- C) Do 6º creep, porque a XP dobra na lane dupla.
- D) Do 12º creep, porque dividir sempre atrasa o level 2.

> Origem: L5. Com 1 deny, level 2 na morte do 9º creep (1º creep da 3ª wave); a XP ímpar tem o "meio" taxado pela Valve.

**QL5.4.** Numa matchup desfavorável, por que ainda vale a pena focar em pegar o level 2 primeiro?

- A) Porque o adversário desiste quando perde a XP.
- B) Porque a dupla que pega o level 2 primeiro será sempre mais forte que a dupla ainda no level 1, independente da matchup — 4 skills têm um power spike muito maior que 2 skills. **(correta)**
- C) Porque o level 2 garante a primeira torre.
- D) Porque a matchup não influencia em nada o early.

> Origem: L5. Quem pega o level 2 primeiro é sempre mais forte que quem está no level 1; 4 skills > 2 skills em power spike.

**QL5.5.** Você está nas 3 primeiras waves de uma lane normal. O que a Fórmula manda fazer com a wave?

- A) Cortar a wave para pressionar a torre cedo.
- B) Fazer pull imediatamente para acelerar o farm.
- C) Apenas jogar a lane — sem pull e sem cortar wave; focar atenta e intencionalmente nos primeiros 9 creeps e nada mais. Pull só depois de ganhar a lane. **(correta)**
- D) Rotacionar para ajudar outra lane.

> Origem: L5. Foco nos primeiros 9 creeps; sem pull e sem cortar wave. Pull só depois de ganhar a lane.

## Lição L6 — O efeito borboleta

**QL6.1.** Por que a Fórmula trata as 3 primeiras waves como o investimento de maior retorno da partida?

- A) Porque é quando dá mais ouro por creep.
- B) Porque o Dota 2 aplica o efeito borboleta de forma muito agressiva: um começo bom (as 3 primeiras waves) faz o meio e o final tenderem a ser bons também. **(correta)**
- C) Porque depois das 3 waves a lane acaba.
- D) Porque é o único momento em que se pode farmar.

> Origem: L6. O efeito borboleta é agressivo no Dota 2; um bom começo amplifica e torna o resto consistente.

**QL6.2.** Um jogador erra muito o começo de jogo e acha que "ainda dá pra recuperar tranquilo no late". Por que isso contraria a doutrina?

- A) Porque o late não existe na Fórmula.
- B) Porque erros no começo se propagam pelo efeito borboleta — por isso L4 e L5 são tão decisivos: são o input que amplifica para o resto da partida. **(correta)**
- C) Porque recuperar no late é proibido.
- D) Porque o adversário sempre vence o late.

> Origem: L6. Erros no começo se propagam; L4 e L5 são o input do efeito borboleta.

---

# RESUMO E NOTAS PRA PEDRO

## Contagem por seção

| Seção | Itens cobertos | Questões |
|---|---|---|
| Conduta — Princípios (1–14) | 14 princípios | **36** |
| Conduta — Anti-padrões (1–15) | 15 anti-padrões | **41** |
| Metodologia — Conceitos (M1–M14) | 14 conceitos | **40** |
| Metodologia — Fundamentos Táticos (L1–L6) | 6 lições | **19** |
| **TOTAL** | | **136** |

Distribuição: princípios e anti-padrões receberam 2–3 questões cada (os de maior peso
cultural — culpa, expectativas, feeding, racismo, auditoria — receberam 3). Conceitos
de metodologia também 2–3 cada.

Fundamentos Táticos (adicionado 2026-06-02): L1=3, L2=3, L3=3, L4=3, L5=5, L6=2 = **19**.
L5 recebeu 5 questões por concentrar a matemática-chave (240 XP, 57/69, level 2 no 9º
creep, power spike de 4 skills, regra de pull/cortar wave). L6 recebeu 2 por ser conceito
único (efeito borboleta) que se apoia em L4/L5.

## Lacunas no canon que precisam de Pedro

1. **Profundidade de gameplay limitada.** O `.txt` é a 1ª aula (teórica). Não há
   canon sobre itemização, timings de objetivos (Roshan, torres), spacing, ou
   execução mecânica. Toda a metodologia testável hoje é conceitual/mentalidade +
   metas de patrimônio. Se Pedro quiser questões de jogo mais técnicas, precisa de
   fonte nova (aulas 2+). Não inventei nada disso.

2. **"Altar" no Anti-padrão 11 — RESOLVIDO (Pedro 2026-06-02).** "altar" = **altar da
   experiência**: objetivo do Dota que surge a cada 7 minutos; o jogador precisa estar
   presente nele pra adquirir o XP. NÃO é o trono. Canon desambiguado em doctrine.ts e
   HONOR_SYSTEM.md ("altar da experiência"). Consistente com METHODOLOGY.md.

3. **Calibração 0,5% vs. número exato.** O doc usa "99,5% não sabem jogar" e "0,5%".
   Mantive ambos literais. Confirmar se quer padronizar a citação.

4. **Severidade nas questões de anti-padrão.** Incluí a consequência (advertência/
   suspensão/banimento) só onde o canon é explícito (feeding → 14 dias; racismo →
   banimento imediato). Para os demais, não afirmei delta de HONOR específico, pois
   depende da calibração de XP ainda não fechada (§3 do spec). Confirmar se quer
   questões testando a matriz de severidade em si.

5. **Total de questões × XP.** 136 é o número deste rascunho. O XP por questão só
   fecha quando Pedro aprovar o total final e a curva de `level_thresholds`
   (migration 021) for cruzada — então `XP_por_questão = XP_nível_6 ÷ total`. Se o
   total mudar (cortar/adicionar questões), recalcular.

6. **Formato das alternativas.** Usei sempre 4 alternativas com 1 correta. Não há
   canon definindo se o quiz terá questões de verdadeiro/falso, múltipla seleção, ou
   ordenação. Assumi múltipla escolha simples conforme a tarefa pediu.

7. **Embaralhamento.** Marquei a correta inline pra revisão. Na implementação, as
   alternativas devem ser embaralhadas e a correta não pode ficar sempre na mesma
   posição. Fora do escopo deste rascunho, mas registrado.
