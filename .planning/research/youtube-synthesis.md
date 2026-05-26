# Síntese dos Transcripts @formuladota — Documento de Pesquisa

> **Status**: documento de pesquisa/auditoria (2026-05-24). Matéria-prima bruta em `youtube-transcripts/` (71 vídeos, gitignored). Os achados desta síntese ALIMENTARAM os docs de fundação do projeto durante a fase de construção fundamental.

> ⚠️ **Natureza deste documento**: este é um log do PROCESSO de pesquisa — registra descobertas durante a auditoria dos vídeos. Algumas seções têm narrativa de "novo" / "expansão" / "decisão de aprovação". **Isso reflete o trabalho de pesquisa, não o estado atual do produto.** A Doutrina FORMULADOTA é uma baseline única: 14 princípios + 15 anti-padrões. Não há "v1 → v2" — a plataforma ainda está em construção fundamental e não foi deployada.

> **Objetivo original**: extrair voz/tom, princípios, dores do público e decisões de produto comunicadas publicamente pelo Pedro.

> ⚠️ **Lente de leitura sobre contexto pessoal**: em 2026-05 o formuladota v2 é declarado pelo Pedro como **"side project saudável sem pressão de monetização — limite 1-2h/dia"** (ver [[reference_mentos_semaforo]]). A operação Kit Mentos no semáforo é a fonte de renda principal. Toda decisão de produto extraída desta síntese deve passar por esse filtro: **o projeto não precisa monetizar pra Pedro sobreviver — pode ser paciente, cerimonial, sem urgência. O burnout descrito nos vídeos de NOV/2025 é história pessoal e NÃO entra como pilar filosófico do produto.**

---

## Índice

1. [Vídeo canônico — "Por isso você NÃO sobe MMR (A Fórmula do Dota de Corrida)"](#1-vídeo-canônico)
2. [Manifestos pessoais e pivô (JUN/2024 + NOV/2025)](#2-manifestos-pessoais-e-pivô-jun2024--nov2025)
3. [Liga FORMULADOTA original + causa raiz da estagnação](#3-liga-formuladota-original--causa-raiz-da-estagnação)
4. [Método de Treino Estruturado + 3 Fundamentos](#4-método-de-treino-estruturado--3-fundamentos)
5. [Doutrina aplicada + jargão técnico](#5-doutrina-aplicada-na-prática--jargão-técnico)
6. [Voz e Tom — assinaturas linguísticas](#6-voz-e-tom--assinaturas-linguísticas)
7. [Decisões de produto comunicadas](#7-decisões-de-produto-comunicadas)
8. [Anti-padrões — validação dos 10 + novos #11-#17](#8-anti-padrões--validação-dos-10--novos)
9. [Mapeamento para docs do projeto (plano de aplicação)](#9-mapeamento-para-docs-do-projeto-plano-de-aplicação)

---

## 1. Vídeo Canônico

**Fonte**: `20251118_XWg8LhMZyoU_Por isso você NÃO sobe MMR (A Fórmula do Dota de Corrida).txt` (57.193 chars, ~9.5k palavras, vídeo de 2025-11-18)

**Importância**: este vídeo É o documento `A FÓRMULA DO DOTA DE CORRIDA.txt` sendo apresentado em vídeo, no contexto da liberação gratuita de 14 dias do conteúdo que antes era exclusivo da plataforma. É a fonte canônica em vídeo.

> ⚠️ **NOTA TEMPORAL**: vídeo gravado em NOV/2025. Em 2026-05, o Pedro **retomou o projeto** com fundação financeira via outra fonte de renda (Kit Mentos no semáforo). O material doutrinário do vídeo permanece TOTALMENTE válido — o que muda é o **enquadramento contextual** (não é "Pedro reerguendo do burnout", é "Pedro retornando com fundação sólida").

### 1.1 Auto-apresentação canônica (PT-BR literal)

> *"Meu nome é Pedro Paulo, sou mais conhecido como **PeterPPA** ou apenas **PPA** no Dota 2. Jogo Dota desde 2010, mais de 15 anos de Dota, 50.000 horas de jogo e eu aprendi a identificar padrões que se repetem ao longo do tempo e desenvolvi essa metodologia original e única que é a fórmula do Dota de corrida."*

> **NOTA**: o vídeo (gravado 2025-11-18) diz "28 anos". A auto-transcrição do YouTube grafou o nick como "PitPA" — **erro de transcrição**. Nick oficial é **PeterPPA**. Idade atual (em 2026-05): **29 anos**, completa 30 em **2026-06-29**.

> *"Acho que posso arriscar dizer que no mundo inteiro não há ninguém que fala que Dota 2 é um jogo de corrida ou que existe essa analogia com a corrida para você entender o jogo."*

> *"Produzo esse conteúdo original sobre Dota 2 há 10 anos, lives, vídeos e vários lobbies, mais de 1000 lobbies didáticos."*

> *"Possuo hoje 7.000 de MMR, mas a minha primeira calibração, eu calibrei 2300 de MMR e eu fiquei muito tempo travado nos 3.000. Eu ficava entre 3200 e 2800."*

### 1.2 Contexto histórico do vídeo (NOV 2025)

> *"Por muito tempo esse conteúdo ficou exclusivo no meu site, mas agora eu decidi liberar tudo gratuitamente aqui no YouTube. Serão 14 dias com 14 vídeos, um por dia, como forma de retribuição por todo o apoio que a comunidade sempre me deu."*

> *"Hoje eu estou mergulhado no TikTok Shop, no universo da inteligência artificial e inclusive esse avatar que está falando com você agora faz parte dessa nova fase."*

**Implicação pro projeto**: o material em vídeo de 2025-11 é a tradução pública e gratuita do conteúdo pago original. **A plataforma formuladota v2 herda esse contrato**: o que era pago vira público (no YouTube), e o pago volta a ser experiência (lobbies, calibração, partidas).

> ⚠️ **NOTA HISTÓRICA — NÃO usar como pilar filosófico**: o vídeo foi gravado em momento de pivô pessoal do Pedro. Em 2026-05 o contexto já mudou substancialmente: Pedro pivotou para Claude Code/dev IA → operação Kit Mentos no semáforo (ver [[reference_mentos_semaforo]]) virou fonte de renda principal → FórmulaDota v2 é **side project saudável sem pressão de monetização**. O "recomeço" descrito no vídeo é história pessoal dele. **Não é diferencial filosófico do produto e não deve aparecer no manifesto público da plataforma.**

### 1.3 As 3 regras canônicas da Fórmula do Dota de Corrida

**Regra 1: A culpa NUNCA é do outro**
> *"Se você não assumir a responsabilidade e ficar colocando a culpa da derrota ou que seja do resultado da partida em outra pessoa a não ser você, o que vai acontecer é que você nunca vai evoluir porque você se exenta dessa responsabilidade."*

> *"Apontar a culpa nos outros é a principal fonte de conflitos dentro de uma partida Dota 2."*

**Regra 2: Jogue de Core**
> *"Você precisa jogar de core. Você só vai ser um bom suporte se você for um bom core."*

> *"Jogar de core é muito mais fácil do que jogar de suporte. Isso acontece porque quanto mais patrimônio você acumula em menos tempo, mais simples se tornam suas decisões dentro do jogo."*

> *"O suporte ele tem um jogo muito mais delicado na mão dele, né? Ele precisa fazer muito com pouco, diferente do Core que precisa fazer pouco com muito."*

**Regra 3 (implícita, fortemente recomendada): Jogue no Mid**
> *"A rota do meio mid é disparada a melhor escolha para você aplicar a fórmula do Dota de corrida. Motivo é óbvio, você não vai dividir experiência com ninguém. É possível alcançar um nível por minuto, que chamamos de corrida do nível. Já pensou, você tá level 20 aos 20 minutos? Somente jogando no mid."*

> *"Se você ainda não alcançou a medalha imortal, a recomendação é clara, jogue no mid até no mínimo atingir divine. Dependendo, você pode até continuar no mid até chegar no Imortal."*

### 1.4 Princípios fundamentais

**Expectativas e frustração**
> *"Frustração nasce de expectativas não correspondidas. A partir do momento que você tem expectativas não correspondidas, você começa a ficar frustrado. Isso é normal do ser humano."*

> *"Você pode criar expectativas sobre você mesmo. Mas você não pode criar expectativa sobre outras pessoas."*

**Paralaxe cognitiva**
> *"Existe um fenômeno chamado paralaxe cognitiva atuando o tempo todo no Dota 2. Esse fenômeno explica que cada jogador interpreta o jogo de forma diferente, de acordo com sua própria perspectiva. Isso significa que não existe uma verdade absoluta em cada jogada."*

> *"O que fortalece para alinhar essa interpretação vai ser a comunicação, vai ser a call. Quanto mais você aceitar essa realidade, menos conflitos internos e externos surgirão e melhor será a sua performance no jogo."*

**Errar faz parte**
> *"Errar faz parte do aprendizado. Não tenha medo dos erros, pois eles são o primeiro passo para evolução, desde que você os reconheça e aprenda com eles."*

**Patrimônio > KDA (a métrica REAL)**
> *"Freg e KDA não define a sua performance real. Eles são apenas uma consequência. O verdadeiro indicador de desempenho é a quantidade de patrimônio líquido acumulado ou extraído do mapa em relação ao tempo da partida."*

> *"O Dota 2 não é sobre matar heróis. Você não tem que matar heróis. Você tem que conseguir extrair o maior patrimônio no menor tempo possível e impedir que o seu adversário faça o mesmo."*

**O relógio como guia**
> *"O relógio deve ser o seu principal guia para tomar as decisões do Dota 2. Alguém já te falou isso alguma vez no Dota inteiro, no mundo inteiro? O relógio é que determina o que você deve fazer na partida. Não é a call do seu amiguinho que tá pedindo para você estar lá para ajudar ele. É o relógio."*

### 1.5 Métricas oficiais da Fórmula

| Função | Patrimônio aos 10min | Patrimônio aos 20min | GPM equivalente |
|--------|---------------------|---------------------|-----------------|
| **Core** | 5.000 ouro | 10.000 ouro | 500 GPM |
| **Suporte** | 2.500 ouro | 5.000 ouro | 250 GPM |

> *"Esses números equivalem a 500 de OPM. É claro que esse 500 de OPM é de acordo com 10 minutos e 20 minutos. Esse 500 de OPM aqui aos 10 e aos 20 é um mínimo aceitável de desempenho para quem busca extrair ao máximo os recursos disponíveis no mapa."*

### 1.6 Recomendação estrutural de configuração

**Modos de jogo permitidos**:
- 100% solo no mid (PRIMARY)
- PT de 5 amigos (secundário)
- **PROIBIDO**: PT dupla ou trio

> *"Eu recomendo que você jogue de apenas duas maneiras. A primeira, você vai jogar 100% solo no mid, vai buscar ranqueada de solo. Você não vai chamar nenhum amigo. Ou em uma PT de cinco pessoas. Não jogue em PT de dupla ou PT de trio, é loucura."*

**Configurações sociais obrigatórias (solo mid)**:
> *"Todos os jogadores precisam ser 100% mutados nas configurações sociais, selecionando a opção 'não exibir mensagens de ninguém'. A comunicação será quase nula e você faz o que precisa ser feito sem contar com a ajuda dos aliados. Se alguém ajudar, considere isso um bônus."*

### 1.7 Smurfs — reframing canônico

> *"Smurf não determina nem define o seu MMR e muito menos o seu processo de evolução e aprendizado."*

> *"O Smurf ele propõe um desafio. Afinal, só é possível melhorar enfrentando pessoas melhores do que você e não aquelas do seu nível."*

> *"Mesmo que você perca 99% das partidas contra os smurfs, sempre veja o lado positivo. Nunca encare como uma derrota, pois no final das contas ou você ganha ou você aprende."*

> *"Quando você joga contra o smurf, ele tá te literalmente falando assim: 'aqui, é para você fazer assim. Se você fizer assim, você vai ser um smurf como eu'."*

**Recomendação técnica**: *"Baixa o replay da partida e veja o que o smurf fez, principalmente no começo do jogo. Provavelmente a rota de farm dele tá muito mais efetiva do que a sua."*

### 1.8 A matemática da progressão

| Métrica | Valor | Cálculo |
|---------|-------|---------|
| Win rate médio do jogador | 50% | Padrão da maioria |
| Win rate acima da média | 55% | Já gera subida constante |
| **Win rate prometido pela Fórmula** | **70%** | Meta da metodologia |
| MMR ganho/perdido por partida | ~25 | Padrão Valve |
| Ciclo de 100 partidas a 70% | 70 vitórias, 30 derrotas | Saldo líquido +40 vitórias |
| MMR ganho em 100 partidas | **+1.000 MMR** | 40 × 25 = 1.000 |
| Cadência típica | 5 partidas/dia | Recomendação Pedro |
| Tempo para +1k MMR | **20 dias** | 100 partidas ÷ 5/dia |
| Tempo Guardião → Divine | **~2 meses** | 300 partidas, +3.000 MMR |

> *"Aqui no Fórmula Dota você vai aprender a alcançar 70% de win rate. Olha o que eu tô prometendo para vocês."*

> *"O segredo está em manter essa constância e seguir o método certo."*

### 1.9 Conceito: "Simulador de Herói" (NOVO — não estava no doc canônico)

> *"A própria Valve já afirmou. Saiu uma atualização no Dota e o título da atualização era '99,5% dos jogadores de Dota 2 não sabem jogar Dota 2'."*

> *"Isso significa que a imensa maioria joga no automático, sem analisar, sem estudar, repetindo erros sem perceber. O que eu gosto de chamar de **simulador de herói**. 99,5% dos jogadores de Dota jogam simulador de herói no mapa de Dota 2."*

> *"O jogador sabe as habilidades do herói e ele tá lá para soltar as habilidades, mas ele não sabe jogar Dota 2 com base nos objetivos."*

> *"A partir de agora você faz parte dos meio% que realmente entendem o jogo."*

**IMPLICAÇÃO PRO PROJETO**: o conceito "simulador de herói" é um termo novo NÃO catalogado em `A FÓRMULA DO DOTA DE CORRIDA.txt` nem em `project_culture_doctrine` — é matéria-prima fresca pra `HONOR_SYSTEM` (anti-padrão #11) e pra copy de marketing (diferenciação clara: "saia do simulador de herói").

### 1.10 Frases canônicas de fechamento (manifesto)

> *"Aqui no Fórmula Dota, a mentalidade é competitiva. Isso significa que em alguns momentos você precisará deixar de lado hábitos ou preferências que não contribuem pra sua evolução para focar no que realmente é necessário."*

> *"Não importa em qual medalha você está agora, quantas partidas você consegue jogar por dia, ou quantos anos você tem, se você é pai de família, se você trabalha. Qualquer pessoa é capaz de alcançar o imortal no Dota 2, desde que ela siga uma metodologia e esteja determinada."*

> *"Perder faz parte e evoluir é uma escolha."*

> *"Cada derrota precisa ser vista como um ponto de evolução, um degrau necessário pro seu próximo desafio."*

> *"Você se tornou superior aos demais 9 jogadores da sua partida — superior em conhecimento, superior em controle emocional e superior em capacidade de adaptação. Não é arrogância, é responsabilidade. Saber mais significa que agora é você quem carrega a vitória."*

### 1.11 Missão histórica (validada)

> *"Nossa missão é clara. Eu quero formar pelo menos 200 jogadores na medalha imortal no ano de 2025 de forma 100% legítima."*

> *"Eu não quero bustar ninguém. Eu quero que você aprenda e seja capaz de forma legítima, individual, alcançar a medalha imortal no Dota 2."*

> *"Eu posso te entregar uma conta agora em qualquer medalha que você vai saber colocar essa conta no imortal, seguindo essa linha de raciocínio dessa metodologia que é Dota de corrida."*

**NOTA**: a meta original mencionada é **2025** (não 2026). Como o vídeo é de NOV 2025, isso pode estar vencido — confirmar com Pedro se a meta foi cumprida, prorrogada ou revisada. Memória `project_culture_doctrine` já marca isso como "a revalidar com Pedro".

### 1.12 Sistema de progressão na plataforma (validado)

> *"Abaixo vai ter os questionários para você responder. Eu fiz várias perguntas sobre os tópicos que eu falei aqui. Respondendo as perguntas você vai evoluir o seu nível de experiência na plataforma e indicando que de fato você assistiu ao conteúdo, você consumiu o conteúdo e respondeu corretamente, você está apto para jogar na comunidade do Fórmula Dota, no servidor do Fórmula Dota, nos lobbies privados que vão ser realizados e futuramente nos possíveis torneios."*

**IMPLICAÇÃO**: este parágrafo VALIDA INTEGRALMENTE a decisão de arquitetura:
- ✅ Onboarding doutrinário obrigatório (não opcional)
- ✅ Questionários por capítulo (mecânica de comprovação)
- ✅ Nível de experiência na plataforma (XP / progressão)
- ✅ Gating de acesso à comunidade/lobbies/torneios baseado em comprovação
- ✅ "Outras pessoas alinhadas com o mesmo pensamento" = filtro cultural

---

## 6. Voz e Tom — Assinaturas Linguísticas

**Saudações características** (variam por registro):
- *"Fala, meu querido."* (abertura assinatura — registro pessoal/aulas)
- *"Bom, pessoal..."* (abertura confessional/séria — vídeos de pivô)
- *"Galera"* / *"Pessoal,"* (chamada à audiência)
- *"Beleza?"* / *"Tá bom?"* / *"Tá joia?"* / *"Tá?"* (check-ins frequentes)

**Selo de fechamento**:
- *"Aproveita a aula e faz a fórmula."*
- *"Não se esqueça, Dota 2 é um jogo de corrida."*

**Marcadores de ritmo**:
- *"Vamos lá."* (chamada à ação)
- *"Olha só."* / *"Olha lá."* / *"Olha aí, ó."* (apresentação de evidência)
- *"Cara..."* (intensificador casual)
- *"Né?"* / *"Tá?"* (alta frequência — checagem de compreensão)
- *"Eh,"* (marcador de hesitação — frequente em momentos vulneráveis)

**Expressões específicas capturadas nos vídeos**:
- *"Mergulhar no conceito"* (entrada em tópico denso)
- *"Vamos descobrir o segredo que ninguém te conta"* (gancho narrativo)
- *"A bagatela de [valor]"* (irônico sobre números altos)
- *"Aperte os seus cintos"* (chamada de atenção)
- *"Por si só"* (*"o produto por si só já se vende"*)
- *"Querendo ou não"* (concessivo)
- *"Insalubre"* (auto-diagnóstico do trabalho atual)
- *"Dar um passo para trás para enxergar o caminho inteiro"* (reflexão de pivô)
- *"Algo completamente [adjetivo]"* (*completamente diferente, completamente normal*)

**Pedidos de apoio comunitário (registro vulnerável)**:
- *"Me fortalecer"* / *"Se alguém quiser me fortalecer"*
- *"Não tá fácil, pessoal"*
- *"Em breve voltaremos"*
- *"Deus está no controle"* (espiritualidade explícita)

**Estilo geral**:
- Coloquial brasileiro, conversa direta, sem distância "professor formal"
- Repete pontos pra fixar (intencionalmente didático)
- Usa exemplos concretos antes de generalizar
- Trata o ouvinte como amigo, não como aluno hierárquico
- Admite a própria falibilidade (*"Eu também já fui tóxico"*, *"Eu fiquei travado nos 3.000"*, *"Já achei que eu era melhor do que eu realmente era"*)
- Espiritualidade aparece em contextos vulneráveis sem proselitismo

**Princípio de copy pra produto**:
> *"A ideia aqui não é te entreter — é te mudar por dentro, na forma de pensar, jogar e reagir ao Dota."*

> *"Aqui não é um ambiente para você se divertir, aqui é um ambiente para você aprender e evoluir e competir."*

UI copy do produto deve seguir esse contrato: não otimizar pra entretenimento, otimizar pra transformação. Sem dopamina barata. Tem que ENTREGAR a fórmula.

---

## 7. Decisões de Produto Comunicadas

Decisões de produto que Pedro JÁ comunicou publicamente nos vídeos e que devem ser validadas como restrições no PRD/foundations.

> ⚠️ **Contexto importante**: muitas dessas decisões foram tomadas na Liga V1 (operando até NOV/2025). Em 2026-05 o contexto mudou — formuladota v2 é **side project saudável sem pressão de monetização** (Mentos é fonte de renda principal). Algumas decisões da Liga V1 podem ser revisadas com essa lente: o produto não precisa carregar urgência financeira, pode ser mais paciente, mais cerimonial.


1. **Onboarding gated por compreensão** (não só aceite): questionários validam aprendizado antes de liberar lobbies/comunidade. **VALIDADO** pela Liga antiga: nível 5 no Academy + questionário ao fim de cada vídeo.

2. **XP/nível de experiência na plataforma**: progressão visível atrelada a consumo de conteúdo + respostas corretas. **VALIDADO**: sistema existia, exigia nível 5 pra acesso a lobbies.

3. **Lobbies privados / servidor / torneios**: forma da experiência social — não DMs livres ou chat geral aberto. **VALIDADO**: Liga antiga operava terça-domingo 18h+ com 10 jogadores por lobby.

4. **Filtro cultural EXPLÍCITO**: "outras pessoas alinhadas com o mesmo pensamento" = comunidade não é aberta, é selecionada por adesão à metodologia.

5. **Auto-seleção na landing** (NOVO): a copy da landing deve separar EXPLICITAMENTE "quero me divertir" vs "quero evoluir/competir". Pedro condena explicitamente quem entra buscando diversão. Frase canônica: *"Se vocês querem se divertir, por favor, jogue sua turbo, jogue sua casual."*

6. **Conteúdo de vídeo é o produto teórico (gratuito)**: vídeo é gratuito (no YouTube agora). O VALOR pago é a plataforma (estrutura, gating, comunidade filtrada, lobbies, partidas com Pedro/jogadores certificados). Modelo: conteúdo gratuito atrai, plataforma converte.

7. **Currículo "Fórmula do MMR" = 14 vídeos** (ativo intelectual): trilha estruturada que vira o Academy oficial — não recriar conteúdo, ingerir o que já existe.

8. **Métricas técnicas como contrato**: 5k/10k Core, 2.5k/5k Suporte, 500 GPM. **AMPLIADO**: LH @20min (255 QoP ref), Level @20min (18), CS/min ≥10, runas pares 100%. Sistema deve EXIBIR/COBRAR essas metas em cada pós-partida.

9. **Modos de jogo recomendados**: solo mid OU PT5. Sistema NÃO deveria facilitar/sugerir PT2/PT3 (anti-padrão).

10. **Mute total no modo solo**: configuração recomendada, possivelmente sugerida no onboarding.

11. **Smurf é desafio, não inimigo**: tratamento de matchmaking/relato de smurfs deve refletir esse framing (não punir mention de smurf, mas educar a tirar valor).

12. **Foco em jogadores travados em Guardião-Cruzado-Arconte**: público-alvo principal explícito. ~3.75M jogadores no mundo nessas medalhas (8 de maio 2025). Persona do PRD deve refletir.

13. **Pergunta pós-partida obrigatória** (NOVO): *"O que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?"* — vira UX obrigatória antes de liberar próxima fila.

14. **"Jogar Agora" sem Pedro** (CRÍTICO — falha da Liga V1): plataforma V2 não pode ter Pedro como single point of failure. Lobbies devem rodar sem ele estar online.

15. **3 Drills oficiais como Calibration system** (VALIDA arquitetura atual): LH@20min, Level25, 1000LH. Submissão de scoreboard via screenshot/print serve como prova de baseline antes de liberar agendamento/fichas.

16. **Coach Overlay / Companion (futuro)**: timeline de objetivos baseada no relógio (min 2 = runa de água, min 6 = runa de efeito, min 7 = altar, min 15 = tormento). Pedro literalmente faz isso verbalmente nos vídeos — extrair como feature do desktop launcher (Tauri).

17. **Replay com timestamps por princípio (futuro)**: VODs do Pedro anotados com tags (#bloque, #aggro, #pressa, #anti-culpa, #power-spike) — usuário pula direto pro momento doutrinário relevante.

18. **TAM finito** (NOVO — restrição estrutural): mercado total de Dota BR consumindo conteúdo ≈ 10.000 usuários. Modelo de receita deve assumir esse teto. Não tentar premium prematuramente.

19. **Frequência de lobbies = ritual** (validado): Liga V1 rodava terça-domingo a partir das 18h. Cadência é parte da identidade — não rodar quando "der vontade".

20. **Mensalidade ≠ cassino** (alinha com PHILOSOPHY Pilar 10): assinatura é adesão à comunidade, não compra de vantagem competitiva. Liga V1 já operava nesse modelo (planos 15d/mensal/trimestral).

---

## 8. Anti-padrões — Validação dos 10 + 5 Novos APROVADOS

Os 10 anti-padrões já catalogados em `A FÓRMULA DO DOTA DE CORRIDA.txt` foram TODOS reafirmados no vídeo canônico literalmente. **5 conceitos novos pré-aprovados pelo Pedro (2026-05-23)** entram como #11-#15 na Doutrina expandida:

**#11 — Simulador de Herói** ✅ APROVADO:
> Jogador que sabe usar as habilidades do herói mas joga sem objetivos do jogo, reagindo às jogadas adversárias em vez de extrair patrimônio no menor tempo.
>
> *"99,5% dos jogadores de Dota jogam simulador de herói no mapa de Dota 2."*

**#12 — Criar expectativas em terceiros** ✅ APROVADO:
> Distinto de "frustração nasce de expectativas não correspondidas" (princípio mental). Aqui é o comportamento ATIVO de projetar resultados em aliados (esperar pull do suporte, gank do mid, etc.).
>
> *"Você não pode criar expectativas sobre outras pessoas."*

**#13 — Vitimização sistêmica** ✅ APROVADO (do vídeo "A VERDADE"):
> Construir identidade de vítima. Acreditar que o matchmake persegue, que há azar crônico, que o Dota é injusto contigo. **Distinto de "cultura da culpa"** porque tem componente de identidade de vítima crônica, não só reação pontual.
>
> *"Começa a se vitimizar. Acha que tem azar, acha que o matchmake te persegue, acha que o Dota é injusto com você."*

**#14 — Recusa de auditoria pós-derrota** ✅ APROVADO (do vídeo "A VERDADE"):
> Anti-padrão por OMISSÃO: não fazer a pergunta *"o que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?"*. Sem auditoria, não há aprendizado.

**#15 — Buscar diversão num espaço de competição** ✅ APROVADO (do vídeo Liga FORMULADOTA):
> Anti-padrão de **mismatch de propósito**. Quem entra na plataforma buscando diversão violenta o contrato cultural.
>
> *"Se vocês querem se divertir, por favor, jogue sua turbo, jogue sua casual."*

### Candidatos rejeitados pelo Pedro (2026-05-23)

- ❌ **Pressa como impulso** — não entra como anti-padrão oficial. Fica como insight de UX/coaching em tempo real.
- ❌ **Ganância de itens** — não entra como anti-padrão oficial. Fica como insight técnico modelado em vídeo, não como pilar de conduta.

**Total Doutrina pós-aprovação**: 10 anti-padrões originais + 5 novos = **15 anti-padrões oficiais**.

---

## 9. Mapeamento Para Docs do Projeto (Plano de Aplicação)

Tabela final de roteamento — o que vai pra onde:

### 9.1 Foundations (`docs/foundations/`)

| Insight | Doc alvo | Tipo de aplicação |
|---------|----------|-------------------|
| "Simulador de Herói" (99.5% / 0.5%) | `PHILOSOPHY.md` + `HONOR_SYSTEM.md` | Pilar/anti-padrão novo |
| "Corrida solo em equipe" (paradoxo definidor) | `PHILOSOPHY.md` | Pilar novo ou expansão Pilar 6 |
| "Não é te entreter, é te mudar por dentro" | `PHILOSOPHY.md` | Confirma Pilar 12 |
| "Saudável > divertido" (princípio separado da história Pedro) | `PHILOSOPHY.md` | Pilar novo / diferencial vs GamersClub |
| Auto-seleção landing ("se quer diversão, jogue turbo") | `PHILOSOPHY.md` Pilar 12 + `PRODUCT_CORE.md` | Copy explícita |
| 5 anti-padrões novos APROVADOS (#11-#15) | `HONOR_SYSTEM.md` + Doutrina | Catalogar oficial (Simulador, Expectativas em terceiros, Vitimização, Recusa auditoria, Buscar diversão) |
| Vitimização sistêmica vs cultura da culpa (distinção) | `HONOR_SYSTEM.md` | Critério de strike |
| Métricas 5k/10k + LH@20 + Lvl@20 + GPM/XPM | `CALIBRATION.md` | Contrato técnico oficial |
| 70% win rate, +25 MMR/win, 20 dias = 1k | `CALIBRATION.md` + `PRD.md` | Matemática da promessa |
| 3 drills oficiais (LH@20, Lvl25, 1000LH) | `CALIBRATION.md` | Sistema de calibração baseado em treino verificado |
| Os 3 Fundamentos (META + TREINO + QUICKCAST) | `PRODUCT_CORE.md` + `CALIBRATION.md` | Currículo base |
| Solo mid vs PT5 (proibido dupla/trio) | `PRODUCT_CORE.md` | Restrição de matchmaking |
| Mute total no solo | `UX_PRINCIPLES.md` | Default no onboarding |
| Smurf como desafio (não inimigo) | `PHILOSOPHY.md` + Doutrina | Reframing oficial |
| Sistema de XP por questionário | `PRODUCT_CORE.md` + `MULTIPLICATION_MODEL.md` | Validação Liga V1 |
| Gating em 5 camadas (Discord OAuth → assinatura → curso → quiz → nível 5 → fila) | `PRODUCT_CORE.md` | Arquitetura oficial herdada |
| "Jogar Agora" sem Pedro (anti-SPOF) | `PRODUCT_CORE.md` + `PRD.md` | Restrição crítica V2 |
| Frequência ter-dom 18h+ (ritual) | `PRODUCT_CORE.md` | Operação base |
| Pergunta "o que poderia ter feito diferente" | `UX_PRINCIPLES.md` | Pós-partida obrigatório |
| Métricas exibidas no pós-partida | `UX_PRINCIPLES.md` + `CALIBRATION.md` | UI contract |
| Coach overlay (timeline objetivos por relógio) | `PRODUCT_CORE.md` + `project_v3_desktop_launcher` | Feature futura |
| TAM finito 10k usuários Dota BR | `REVENUE_MODEL.md` | Restrição estrutural |
| Mensalidade não é cassino | `REVENUE_MODEL.md` | Confirma Pilar 10 |
| Instabilidade financeira do criador Dota (genérico, não biografia Pedro) | `REVENUE_MODEL.md` | Argumento de TAM/estrutura — receita do nicho é instável → modelo precisa de outra base. NÃO citar burnout do Pedro |

### 9.2 Fonte canônica (`A FÓRMULA DO DOTA DE CORRIDA.txt`) — decisões aprovadas

| Insight | Tipo de aplicação | Status |
|---------|-------------------|--------|
| Adicionar **"Simulador de Herói" como anti-padrão #11 oficial** | Nova entrada na lista de 10→11 | ✅ APROVADO Pedro 2026-05-23 |
| Adicionar **Expectativas em terceiros (#12)** | Nova entrada | ✅ APROVADO |
| Adicionar **Vitimização sistêmica (#13)** | Nova entrada | ✅ APROVADO |
| Adicionar **Recusa de auditoria pós-derrota (#14)** | Nova entrada | ✅ APROVADO |
| Adicionar **Buscar diversão em espaço de competição (#15)** | Nova entrada | ✅ APROVADO |
| Adicionar "Corrida solo em equipe" como conceito complementar à definição | Inserir após linha 17 | A confirmar |
| Adicionar Os 3 Drills oficiais (LH@20, Lvl25, 1000LH) na seção "Recomendações" | Nova subseção | A confirmar |
| Adicionar Os 3 Fundamentos (META + TREINO + QUICKCAST) como apêndice | Nova seção | A confirmar |
| **Prorrogar missão "200 imortais legítimos" 2025 → 2026** | Substituir o ano | ✅ APROVADO |
| Manter o resto INTACTO — doc canônico não precisa de reescrita | — | — |

### 9.3 PRD.md

| Insight | Aplicação |
|---------|-----------|
| Persona: jogador Dota BR travado Guardião/Cruzado/Arconte | Refinar persona (já tem direção certa) |
| Auto-apresentação Pedro: **PeterPPA / PPA, 29 anos, 7k MMR, 15a Dota, 50k horas, canal @formuladota com autoridade preservada** | Bio oficial / página /sobre |
| Why now (não pivô pós-burnout — autoridade construída + retorno por escolha) | "Por que retornar ao Dota agora" — fundação financeira sólida via outra fonte, libido criativa, capitalizar 10 anos de canal |
| Liga V1 lições (68 assinantes, falhas Google Forms/SPOF) | Restrições históricas |
| Frase "Aqui não é pra divertir, é pra evoluir" | Manifesto |
| Modelo gratuito (YouTube com 2.7k views/28d) + pago (plataforma) | Strategy |
| ⚠️ NÃO usar: narrativa pessoal de burnout 200h/mês | Banido — é história pessoal Pedro, não filosofia do produto |

### 9.4 Memória (`project_culture_doctrine.md`)

| Insight | Aplicação |
|---------|-----------|
| Confirmar todos os 14 princípios + 10 anti-padrões já catalogados | Reafirmar |
| Adicionar 6 anti-padrões novos (#11-#17) candidatos | Pós-alinhamento Pedro |
| Adicionar "Simulador de Herói" como conceito | Vocabulário |
| Atualizar missão pra 2026 se Pedro confirmar | Datas |

### 9.5 CLAUDE.md (instruções de projeto)

| Insight | Aplicação |
|---------|-----------|
| Voz "Fala, meu querido" + selo "Aproveita a aula" | Padrão de UI copy |
| Jargão técnico (block, aggro, bottle, runa, altar, tormento, etc.) | Vocabulário interno consistente |
| Não usar palavras tipo "diversão", "divertido" | Anti-padrão de copy |
| Princípio "não otimizar pra entretenimento, otimizar pra transformação" | Contrato de UX/design |

---

---

---

## 2. Conceitos Pré-Pivô + Contexto Histórico (NÃO usar como pilar)

**Fontes**: `DOTA 2 É UM JOGO DE CORRIDA - O Segredo Que Ninguém Te Conta` (2024-06-08, 5k), `Desinstalei o Dota (e Você Também Deveria)` (2025-11-16, 20k), `O Custo REAL de Jogar Dota 200 Horas por Mês` (2025-11-17, 9k)

> ⚠️ **REFRAME OBRIGATÓRIO**: esta seção contém material útil de duas categorias distintas:
> - **APROVEITÁVEL pro produto** (subseção 2.1): conceitos doutrinários (corrida solo em equipe, circuitos, KPIs) que existem desde JUN/2024 e são independentes do contexto pessoal
> - **HISTÓRICO PESSOAL** (subseção 2.2-2.4): narrativa do burnout 200h/mês e pivô NOV/2025. **NÃO deve virar pilar filosófico nem aparecer na landing pública**. Em 2026-05 o Pedro tem fundação financeira sólida via Mentos (ver [[reference_mentos_semaforo]]) e o projeto é side project, não tentativa de reerguer pós-burnout.

### 2.1 Conceitos NOVOS (não no doc canônico nem no vídeo principal)

**"Corrida solo em equipe"** — paradoxo definidor:
> *"O conceito base de Dota 2 é uma corrida solo em equipe — mesmo que o jogo seja em time de cinco jogadores, o seu desempenho individual é o que dita o ritmo da sua equipe."*

**"Circuito por posição"** — cada uma das 5 posições tem seu circuito específico de objetivos atrelados ao minuto.
> *"Cada posição tem seu circuito específico."*

**"Cada Virada do minuto"** — cadência de checkpoint:
- Minuto par → runa de efeito
- Minuto ímpar → rotação de stack
- Cores otimizam farm
- Suportes vão pra zondas / stacks

**"Patrimônio líquido por tempo" como KPI primário desde JUN 2024**:
> *"Dota 2, assim como uma corrida de Fórmula 1, é sobre velocidade e eficiência — mas não essa velocidade que você pensa. Aqui a velocidade é medida pela sua capacidade de acumular patrimônio líquido ao longo do tempo da partida."*

**"Teto de 10.000 usuários" (limite do nicho Dota BR)**:
> *"O pico máximo de usuários que consomem conteúdo na internet sobre Dota 2 é na casa dos 10.000."*

**Implicação**: a matemática de receita do projeto deve assumir TAM finito (~10k usuários ativos máximos) — restrição estrutural para REVENUE_MODEL.

### 2.2 Falas pessoais do Pedro (NOV 2025) — **arquivo histórico**

> ⚠️ Material BIOGRÁFICO. Útil pra eu (Claude) entender quem é o Pedro e ajustar tom em sessões. NÃO virar copy do produto, NÃO virar pilar do PHILOSOPHY.

> *"Eu amo esse jogo, mas quando Dota virou a minha única fonte de renda, ele também virou uma pressão absurda."*

> *"Quando o jogo que você mais ama vira obrigação, você começa a perder ele aos poucos."*

> *"Eu não abandonei o Dota. Eu só não posso deixar que ele seja a minha prisão."*

> *"Mudar de vida financeiramente vale muito mais do que qualquer MMR."*

**Conceito SEPARÁVEL do contexto pessoal** — útil pro produto:
> *"Eu sei que trabalho não é para ser divertido, é trabalho. E em momento algum eu tô querendo que seja divertido, eu tô querendo que seja saudável."*

→ Este princípio (**"saudável > divertido"**) é doutrina aplicável ao produto INDEPENDENTE de quem o disse e em que momento. Pode virar pilar filosófico sem invocar burnout do Pedro.

**Diagnóstico de instabilidade financeira do criador de Dota** (também separável — vira insight sobre TAM do nicho):
> *"Um mês tava bom, outro mês não tava bom e isso causava uma instabilidade emocional também."*

→ Útil pra REVENUE_MODEL como argumento de mercado ("monetizar criador de conteúdo Dota é instável → produto precisa de outra estrutura"), não como história pessoal.

### 2.3 Timeline reconstruída — **arquivo histórico**

> ⚠️ Pra eu (Claude) entender contexto. NÃO usar em copy pública.

- **JUN/2024**: Pedro lança conceito-mãe "Dota é um jogo de corrida" no canal Fórmula Dota
- **2024-2025**: Renomeação PPPA → **Fórmula Dota** com estudo deliberado de branding/marca
- **Pré-NOV/2025**: 200 horas/mês de transmissão. Renda instável de criador
- **OUT/2025**: Para de postar vídeos. Para lives 2 semanas antes do anúncio
- **2025-11-16**: Vídeo "Desinstalei o Dota" — pivô anunciado pra TikTok Shop. Primeira venda (microfone, comissão ~10%)
- **2025-11-17**: Vídeo de follow-up. Anuncia liberação dos 14 vídeos da Fórmula do MMR gratuitamente
- **DEZ/2025-ABR/2026**: Pedro descobre Claude Code, estuda dev IA, faz vários projetos no GitHub. TikTok Shop descartado (restritivo com IA), ViralShop descartado, clientes Wagner/Vanessa cancelaram
- **2026-05-05**: Inicia operação Kit Mentos no semáforo (BH) inspirada no irmão Thiago. Vira fonte de renda central
- **2026-05-23**: Pedro retoma FórmulaDota v2 explicitamente como "side project saudável sem pressão de monetização — limite 1-2h/dia"
- **2026-06-29**: Aniversário 30 anos
- **AGO-SET/2026 (plano)**: Europa — Bélgica com Junior → intercâmbio Irlanda
- **Canal**: 2.700 views/28d em maio 2026 **mesmo sem postar desde NOV/2025** → autoridade preservada justifica retomada do projeto

### 2.4 "Fórmula do MMR" — currículo de 14 vídeos (ativo intelectual)

Os 14 tópicos mencionados (não-listados originalmente, agora públicos):
- Objetivos
- Gankar
- Farmar
- Rota de stack
- Borrel (Bottle)
- Aggro
- Block de creep
- Saída da base
- + outros (a inventariar amostrando os PARTE X já baixados)

**Implicação**: este currículo de 14 vídeos é o ativo intelectual MÃO de obra-construído, deve virar a **trilha oficial do Academy** na plataforma — não recriar conteúdo, ingerir o que já existe.

---

## 3. Liga FORMULADOTA Original + Causa Raiz da Estagnação

**Fontes**: `Como Jogar na LIGA FORMULADOTA` (2025-07-11, 8k), `A VERDADE que está te impedindo de subir MMR` (2025-06-03, 6k)

### 3.1 Mecânicas exatas da Liga antiga (validam decisões de arquitetura V2)

**Funil de gating em 5 camadas (sequencial)**:
1. Cadastro em `formuladota.com` via **Discord OAuth**
2. Perfil completo: nome, nick, telefone, ID Dota, ID Discord
3. **Assinatura paga** (15 dias / mensal / trimestral) — lobbies exclusivos a assinantes
4. **Nível 5 no Academy** consumindo trilha "Fórmula do MMR" + responder questionário ao FIM DE CADA VÍDEO
5. Etapa manual (FALHA): digitar `!liga` no chat da live → Google Forms → DM Pedro no Discord

**Estrutura operacional**:
- Lobbies **terça a domingo, a partir das 18h** transmitidos ao vivo Twitch/YouTube
- Fila no canal `#fila` do Discord aguardando 10 participantes
- Pedro presente analisando ao vivo

**Regras de conduta especiais (in-game)**:
> *"Tem que jogar com os heróis do meta, tem que jogar com heróis que você nunca jogou, tem que ouvir a cal de quem é capitão."*

**Frase canônica de seleção cultural**:
> *"Aqui não é um ambiente para você se divertir, aqui é um ambiente para você aprender e evoluir e competir."*

> *"Competição ela não está coligada com diversão. Se vocês querem se divertir, por favor, jogue sua turbo, jogue sua casual."*

**Números validados** (mencionados no vídeo):
- 68 assinantes ativos
- 50 nível-5
- 400+ participantes históricos

### 3.2 O que FALHOU (não repetir na V2)

- **Etapa manual**: Google Forms + DM no Discord = fricção brutal. Pedro mesmo reconheceu: *"em breve vai ser tudo através do site"*
- **Ranking decorativo**: vitórias/derrotas não eram computadas. Ranking existia mas sem cálculo real
- **Premiação prometida e não entregue** — quebra de confiança
- **Burnout do Pedro como single point of failure**: lobbies dependiam dele estar online jogando

**Implicação pra V2**:
- Eliminar 100% etapas manuais (todo gating automatizado)
- Ranking real desde dia 1 OU não mostrar ranking
- Não prometer o que não está pronto
- **"Jogar Agora" funcional sem Pedro** — feature obrigatória pra V2 (já visão declarada no vídeo)

### 3.3 Causa raiz da estagnação ("A VERDADE")

**Conceito novo — "Blindagem mental anti-crescimento"**:
> *"Toda vez que você perde uma partida e coloca a culpa nos outros, você tá criando uma blindagem contra o seu próprio crescimento."*

**Vitimização sistêmica como espiral**:
> *"Começa a se vitimizar. Acha que tem azar, acha que o matchmake te persegue, acha que o Dota é injusto com você."*

**Argumento estatístico anti-vitimização**:
> *"Se o time é sempre o problema, porque existem jogadores que conseguem subir de MMR e você não?"*

4 aliados vs 5 inimigos = chance de troll/feeder estatisticamente igual dos dois lados. Se você não sobe, é falta de diferencial — não azar.

**Pergunta-PIVÔ canônica** (vira UX obrigatória pós-partida):
> *"O que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?"*

**Auto-crítica modelada (Pedro sobre ele mesmo)**:
> *"Já achei que eu era melhor do que eu realmente era. Até hoje eu continuo achando."*

### 3.4 Frase de fechamento canônica
> *"A vitória nasce da autorresponsabilidade."*

---

## 4. Método de Treino Estruturado + 3 Fundamentos

**Fontes**: `O TREINO QUE TODO JOGADOR DE DOTA2 DEVERIA FAZER` (2025-11-19, 30k), `3 FUNDAMENTOS PARA SUBIR DE MMR NO DOTA 2` (2025-04-10, 23k)

### 4.1 Os 3 Drills Oficiais (modo solo contra creeps)

**Setup**: Menu Jogar → Salas Personalizadas → Criar. Escolha livre. **Não** preencher bots. **Não** ativar trapaça. Herói do meta atual (referência: Dota 2 Pro Tracker). Jogar como se fosse ranked real.

| Drill | Objetivo | Métrica |
|-------|----------|---------|
| **#1 — Last Hits @ 20min** | Quantos last hits máximo aos 20min | QoP ref: 255 LH + lvl 18 |
| **#2 — Corrida de Nível** | Quanto tempo até level 25 | Alvo: antes de 30min |
| **#3 — Volume** | Quanto tempo para 1000 last hits | QoP ref: ~30min, 460 LH |

**Regras de execução obrigatórias**:
- Mesma build da ranked (sem Midas+Maelstrom)
- Mesma árvore de talentos
- Rota de farm completa: limpar wave → stack → voltar
- Stacks em minuto ímpar
- Runa de efeito em minuto par
- Comprar Ward + altar da experiência
- Gestão de mana/clarity
- Treinar deny junto
- Frequência: 1x/semana mínimo, diário ideal

**Frase canônica**:
> *"Se você não consegue fazer 10.000 de ouro sozinho com os creeps, você jamais vai conseguir fazer com nove pessoas te atrapalhando."*

> *"A prática leva à perfeição e os treinos são mais importantes do que a prova."*

> *"A ranqueada é a avaliação do seu treino com nove obstáculos dinâmicos."*

### 4.2 Os 3 Fundamentos (vídeo ABR 2025)

**1. META (Most Effective Tactic Available)**
> *"Se você hoje é um jogador de midlane e não está jogando de Queen of Pain, você está jogando no mid de forma errada."*

Recurso: Dota 2 Pro Tracker — checar heróis fortes no patch.

**2. TREINO**
> *"Se você não consegue fazer 10.000 de ouro sozinho com os creeps, você jamais vai conseguir fazer com nove pessoas te atrapalhando."*

**3. QUICKCAST (atalho rápido)**
- Usar habilidades/itens direto onde está o ponteiro do mouse
- Reduz de 3 ações para 2 (50% mais rápido)
- Configurar: Atalhos Avançados → "Ativar teclas de atalho rápido e uso automático avançadas"
> *"Sacrifique a sua primeira semana de adaptação."*

### 4.3 Métricas/KPIs adicionais (além das 5k/10k já catalogadas)

| Métrica | Target |
|---------|--------|
| LH @ 20 min | 255 (QoP ref) / 200-300 geral |
| CS/min mínimo | 10 last hits/minuto |
| Level @ 20 min | 18 (~1 lvl/min) |
| Level 25 | atingir antes dos 30 min |
| LH @ 30 min | 460 (QoP ref) |
| Runas de efeito | 100% em minutos pares |
| Stacks por jogo | múltiplos por rotação |
| Mortes no treino | **zero** — "evita morrer 100%" |

### 4.4 Implicação direta pro CalibrationGraduation (já existente)

O sistema **CalibrationGraduation** (medalhas nao-calibrado/calibrando/ranqueado) que já existe no projeto tem **ancoragem doutrinária direta** nesse vídeo: Pedro literalmente diz que o lobby solo é o pré-requisito honesto antes da ranked. A calibração via treino solo verificado **valida** a arquitetura atual.

---

## 5. Doutrina Aplicada na Prática + Jargão Técnico

**Fontes**: Série "Do Guardião ao Imortal" (amostra: Ep 1, Ep da primeira derrota, finale Desafio 3/3) + Série PARTE (Block de Creeps + Objetivos/Visão/Minimapa)

### 5.1 Padrão de verbalização guiada pelo relógio

Pedro estrutura quase toda decisão em torno do tempo:
> *"Guardando agora a ronda dos 8 de olho no relógio."*
> *"Minuto 7. Tem um objetivo importantíssimo."*
> *"Você sempre vai olhar pro relógio para tomar as suas decisões."*

Mantras repetidos em todos os 3 episódios:
> *"Fórmula do MMR / Dota de corrida = maior patrimônio no menor tempo possível."*
> *"Eu tô focado na minha métrica aqui do meu patrimônio, minha progressão saudável."*
> *"Os frags são uma consequência."*
> *"Faz o básico... a consequência vai vir."*

### 5.2 Modelagem em tempo real da derrota (Ep 10)

Pedro modela em voz alta o princípio "assumir responsabilidade":
> *"Erro meu, não tem o que eu possa culpar ninguém aqui. A execução minha foi errada."*
> *"Fui ganancioso, construir apenas itens de dano e aconteceu isso daí."*
> *"As suas derrotas servem para o seu processo de aprendizado melhor do que as suas vitórias."*

Identifica decisões reformuláveis (Linkens em vez de itens só dano) — diagnóstico técnico anti-vitimização aplicado em tempo real.

### 5.3 Princípios doutrinários demonstrados em jogo

- **Anti-culpa**: ignora pings/chat, mas mantém social aberto pelo conteúdo. Nunca xinga.
- **Anti-pressa**: *"A pressa é inimiga da perfeição. Quando você tem pressa, você acaba cometendo erros."*
- **Paralaxe (smurf)**: *"Você precisa visualizar o smurf como uma oportunidade de crescimento e desafio."*
- **Disciplina sobre ego**: prioriza farm sobre teamfight chamativa. *"Esse é o diferencial de quem joga Dota 2 de forma consistente."*
- **Espelhar adversário**: *"Espelha o que eles estão fazendo."*

### 5.4 Jargão técnico oficial do Pedro

| Termo | Definição literal Pedro |
|-------|------------------------|
| **Block** | Andar na frente dos creeps pra atrasá-los: *"segura F1 + botão direito indo para cima e para baixo"* |
| **Aggro** | Atacar o herói adversário pra fazer creeps inimigos te perseguirem: *"manter distância, não quero que ele dene meus creeps"* |
| **Denai (deny)** | Negar last hit nos creeps aliados: *"garantir um denai no mago dele"* |
| **Left hit (last hit)** | Acertar golpe final no creep: *"6 left hits para gold do Borrel"* |
| **Borrel (Bottle)** | Item obrigatório do mid: *"o borrel é obrigatório ter antes dos 2 minutos"* |
| **Runa de água / efeito / recompensa** | Minutos 2/4 água; 6/8/10/12/14 efeito; bounty separada |
| **Altar da experiência** | Objetivo nos min 7 e 14 |
| **Tormentor** | Boss min 15, oposto ao Roshan, *"mais forte com o tempo"* |
| **Roshan / Aegis** | Boss segunda vida pra subir high ground |
| **High ground** | Terreno elevado: *"start em cima de você"* |
| **Stack** | Acumular campos da jungle pro time |
| **TP** | Town Portal: *"sua melhor fuga, 99% das vezes"* |
| **Smoke / Ward / Centry / Deward** | Visão e contra-visão |
| **Split push** | Pressionar lane sozinho enquanto time briga |
| **Fog (Fog of War)** | Área sem visão |
| **Clean wave** | Limpar onda de creeps com habilidade em área |
| **Power spike** | Pico de força do herói |
| **Bust damage** | Dano explosivo concentrado |
| **Kite / Caitar** | Atacar mantendo distância |
| **Buyback** | Reviver pagando gold |
| **GPM / XPM** | Gold/XP por minuto |

### 5.5 Frases de coaching em tempo real (UI copy potencial)

> *"Seu TP é a sua melhor fuga. 99% das vezes."*
> *"Você sempre vai olhar pro relógio para tomar as suas decisões."*
> *"Os frags são uma consequência."*
> *"A pressa é inimiga da perfeição."*
> *"A ganância que te move é a mesma que te mata."*
> *"Espera os seus adversários errar."*
> *"Eficiência da performance: uma skill farma dois crips e dá dano no adversário."*
> *"Quem inicia tem vantagem. As coisas só iniciam se existe visão."*

### 5.6 Diferenciais identificados vs mentores genéricos de Dota

- **Doutrina antes de tática**: enquanto YouTubers ensinam combos/builds, Pedro ensina **comportamento mental** com tática como consequência.
- **Metodologia nomeada e mensurável**: "Fórmula do MMR" tem KPI fechado (patrimônio/tempo + 5k/10k aos 10/20min).
- **Modelagem em tempo real do erro próprio**: raro no nicho — streamers tipicamente terceirizam culpa.
- **Sequência cronológica do mapa como currículo**: ensina pela linha do tempo do relógio, não por hero pool. Transferível entre heróis.

---
