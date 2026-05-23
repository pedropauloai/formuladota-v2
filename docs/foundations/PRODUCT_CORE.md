# PRODUCT_CORE.md — Identidade Fundacional do FORMULADOTA

> Documento permanente. Toda decisão de produto, copy, UX e tom deve ser avaliada contra este
> texto antes de ser implementada. Se há conflito entre este documento e um requisito pontual,
> este documento prevalece — o requisito é revisado, não o contrário.
>
> Versao: 1.0 | Data: 2026-05-23 | Milestone: V2.5 Design Foundations

---

## 1. Quem Somos

O FORMULADOTA e um hub de comunidade Dota 2 brasileiro doutrinado. Nao somos uma escola de
Dota, nao somos um marketplace de coaching, nao somos uma plataforma neutra de matchmaking.
Somos o espaco onde jogadores pagam mensalidade para entrar em partidas ranked in-house criadas
por bot Steam, jogar ao lado de outros jogadores que leram, compreenderam e aceitaram as mesmas
14 leis de conduta — e aprender por osmose ao competir em ambiente de alta exigencia comportamental
e tecnica. O diferencial nao e o coach. O diferencial e a cultura: a doutrina e aceite obrigatorio
que bloqueia acesso as rotas privadas, o sistema progressivo de 3 strikes (advertencia, suspensao,
banimento), e os 14 principios que governam comportamento dentro e fora das partidas. A missao
declarada e formar 200 jogadores na medalha Imortal de forma 100% legitima. Qualquer feature,
qualquer copy, qualquer decisao de design que nao reforce esse eixo e candidata a remocao.

---

## 2. O Que NAO Somos — Anti-Positioning

Definir o que nao somos e tao importante quanto definir o que somos. O mercado tem produtos
proximos o suficiente para causar confusao. Esta secao elimina a ambiguidade.

### NAO somos coaching marketplace

Nao vendemos "1 hora de aula". Nao temos lista de coaches disponiveis por preco/hora. Nao
comparamos metodologias. O modelo e comunidade com mensalidade — acesso a partidas in-house
em ambiente doutrinado. O coach (admin) e implicito, nao e um produto adquirivel por unidade
de tempo. Coaches credenciados sao escopo V2 e serao tratados como feature de comunidade,
nao como vitrine de profissionais.

### NAO somos lobby creator generico

Nao competimos com FACEIT em volume de features de fila. Nao replicamos sistema de elo
1-10, ranking de liga europeu, hubs anonimos de qualquer jogador. Nosso lobby e in-house —
restrito a membros ativos com doutrina aceita. A restricao e o produto. Retirar a restricao
para crescer seria destruir o diferencial.

### NAO somos plataforma educativa

Nao ha cursos. Nao ha modulos de aprendizado. Nao ha certificados. A Formula do Dota de
Corrida nao e curriculum — e doutrina viva, citada em loading screens e empty states, exigida
como pre-requisito de acesso, reforcada na experiencia de jogo. Quem quer curso vai ao YouTube.
Quem quer osmose de alto nivel em ambiente disciplinado vem ao FORMULADOTA.

### NAO somos plataforma esports

Nao ha torneios profissionais, nao ha stream de competicoes, nao ha organizacao de equipes.
Temporadas com ranking e possivelmente premiacao sao features de progressao da comunidade —
nao campeonatos esports. O usuario target e o jogador que quer subir de MMR, nao o atleta
que busca contrato.

### NAO somos rede social

Nao ha feed, nao ha posts, nao ha curtidas, nao ha stories. A identidade social do usuario
e seu perfil de jogador (tier badge, MMR, historico de partidas) — nao um timeline de
conteudo. A camada social e o servidor Discord oficial, onde a comunidade ja existe. A
plataforma web e para acao, nao para consumo de conteudo.

---

## 3. Doutrina como Identidade Central

A doutrina nao e politica de uso. Nao e documento legal que o usuario clica "aceitar" sem
ler para nunca mais ver. A doutrina e o produto. E a identidade competitiva do FORMULADOTA
frente a qualquer concorrente.

### Os 14 Principios como Lei de Conduta

Os 14 principios da Formula do Dota de Corrida cobrem tres eixos: comportamental (1-6),
tecnico (7-12) e progressao (13-14). Sao leis, nao sugestoes. Nao sao aspiracoes motivacionais.
Nao sao guidelines de comunidade. Sao o codigo pelo qual conduta e julgada, strikes sao
aplicados e banimentos sao justificados. O principio 1 — "A culpa NUNCA e do outro" — e a
lei fundacional: toda decisao de moderacao começa por ela.

### Aceite Obrigatorio como Gate de Acesso

O usuario que nao aceitou a doutrina na versao vigente nao acessa rotas privadas. Nao ha
contorno. Nao ha botao "depois". O aceite e ritual de entrada — tela cinematografica fullscreen,
principios apresentados em Cinzel, scroll vertical obrigatorio, aceite ritualístico ao final.
Quando a doutrina for atualizada (DOCTRINE_VERSION incrementado), todos os usuarios sao
forçados a reler e reaceitar antes de continuar. A versao e versionada no banco, o aceite e
registrado com timestamp e versao.

### Sistema Progressivo: 3 Strikes

| Strike | Acao | Duracao | Nota |
|--------|------|---------|------|
| 1 | Advertencia | Imediata (sem suspensao) | Email + DM Discord citando o principio violado |
| 2 | Suspensao | 7 dias (configuravel 1-30d) | Sem acesso a partidas, sessoes ou compras |
| 3 | Banimento | Permanente | Refund caso a caso; sem refund em fraude ou preconceito |

Dois anti-padroes tem severidade direta, pulando a sequencia: Feeding Intencional (griefing)
vai direto para suspensao. Preconceito, Xenofobia e Racismo vai direto para banimento permanente,
sem advertencia, sem segunda chance.

O contador zera apos 180 dias sem novas violacoes — o usuario retorna ao status normal.

### Como a Doutrina Vira UX

Este e o diferencial competitivo que nenhum produto AAA nacional ou internacional explora:
o codigo de conduta como conteudo vivo da interface.

**Loading screens**: A cada carregamento (4 segundos de referencia), um principio doutrinario
e exibido em rotacao aleatoria. Nao e tip de gameplay. Nao e dica de tutorial. E o principio
literal, com titulo e corpo curto, em tipografia Cinzel, sobre fundo escuro cinematografico.
O usuario aprende a doutrina sem que ela seja apresentada como licao — ela aparece como parte
natural do sistema.

Exemplo de loading tip:
```
Principio 5
"Ou voce ganha, ou voce aprende. Perder faz parte. Evoluir e uma escolha."
```

**Empty states**: Quando uma lista nao tem dados (historico de partidas vazio, ranking sem
posicao, fila vazia), o empty state nao diz "nenhum dado encontrado". Cita o principio
relevante ao contexto e sugere acao. Exemplo para historico de derrotas vazio:
```
Cada derrota e um degrau.
Ainda sem partidas registradas — entre na fila e comece sua evolucao.
[ENTRAR NA FILA]
```

**Onboarding doutrinario**: Primeiro acesso pos-Discord OAuth. Tela fullscreen cinematografica.
Sem modal pequeno, sem checkbox de "li e aceito". Principios apresentados um a um com scroll
vertical obrigatorio. Tipografia Cinzel em tamanho de display. Aceite ritualístico ao final —
nao botao generico.

**Mensagens de erro alinhadas a voz doutrinaria**: Erros de sistema nao dizem "Algo deu
errado. Tente novamente." Dizem, por exemplo: "Nao conseguimos criar sua partida — tente
novamente." A primeira pessoa e do sistema, nao uma acusacao ao usuario. O tom e direto,
nao apologetico.

**Banimento triggered**: Quando um banimento e aplicado, a tela nao e discreta. E full-screen
critico: o principio violado e exibido em destaque, em Cinzel, sem opcao de continuar ate
o usuario reconhecer formalmente. O sistema nao esconde a severidade da acao.

---

## 4. Arquetipo de Marca: O Mestre

O FORMULADOTA comunica como um Mestre. Nao como um Vendedor, nao como um Amigo, nao como
um Coach formal de planilha e estatistica.

### O Que Nao e o Mestre

**Nao e Vendedor**: O Mestre nao pressiona compra. Nao usa "oferta limitada", "desconto
exclusivo", "nao perca essa chance". Nao usa urgencia artificial. A mensalidade tem preco
fixo e justificativa clara — quem quer participar paga; quem nao quer, nao e convencido
por marketing de pressao.

**Nao e Amigo**: O Mestre nao e casual. Nao diz "hey there!", "boa galera!", "to aqui
pra ajudar vocês". A relacao e de autoridade — respeitosa, mas assimetrica. O Mestre conhece
o caminho. O aluno escolhe seguir.

**Nao e Coach Formal**: O Mestre nao fala como software de analise. Nao diz "vamos analisar
suas metricas de performance" ou "seu KDA esta 12% abaixo da media". O Mestre transmite
principios vividos, nao relatorios de dados.

### O Que E o Mestre

O Mestre conhece o caminho e comunica com gravidade. Espera disciplina de quem entra.
Recompensa quem persiste. Nao tem paciencia com auto-sabotagem — e o Principio 1 e claro:
a culpa nunca e do outro. O Mestre nao valida desculpas, por mais sofisticadas que sejam.

A voz do Mestre e:

- **Imperativa quando ensina**: "Jogue Mid ate Divine. Esse e o caminho mais rapido."
- **Elogiosa quando reconhece**: "Conduta exemplar. Voce entende o que significa estar aqui."
- **Severa quando corrige**: "Isso e Feeding Intencional. Suspensao de 14 dias aplicada.
  Principio 5 violado."

### Inspiracoes de Referencia

- **Brasileirao "Formula de Corrida"**: disciplina de automobilismo aplicada ao Dota. Metricas,
  metodo, tempo — nao feeling, nao intuicao.
- **Mestre dojo**: hierarquia clara, respeito conquistado, sem condescendencia.
- **Oraculo**: fala pouco, diz coisas que ficam. Nao explica o obvio. Nao repete.

---

## 5. Voz de Marca

### Regras Fundamentais

**PT-BR brasileiro tecnico**: Pedro fala "GG", "pick", "ward", "feed", "mid diff". A
plataforma usa esses termos sem aspas, sem asteriscos, sem nota de rodape explicativa. O
usuario e jogador de Dota — ele sabe.

**Sem giria startup**: Zero "ops!", "yay!", "high five!", "incrivel!", "arrasou!". Zero
exclamacoes desnecessarias. Gravidade supera entusiasmo sempre.

**Frases curtas, imperativas, opinativas**: "Jogue Mid. Esse e o caminho." Nao: "Uma opcao
interessante pode ser considerar jogar na rota do meio, que potencialmente pode oferecer
algumas vantagens em termos de experiencia individual."

**Sem emoji em UI**: Zero uso de emoji em qualquer superficie da plataforma — textos, botoes,
notificacoes, mensagens de erro, empty states, loading screens. Sem excecao.

**Maiusculas para enfase rara**: O botao principal de acao usa "ENTRAR NA FILA", nao "Entrar
na fila". Mas titulos de secao, labels de campo, textos descritivos: capitalize normal. A
maiuscula em caixa alta e reservada para o CTA principal e nomes de entidade (FORMULADOTA).

### Regras de Nome de Marca

| Regra | Correto | Errado |
|-------|---------|--------|
| B1: nome da marca | FORMULADOTA | Fórmula Dota / Formula Dota / formuladota |
| B6: admin | (implicito, sem mencao) | "Pedro Paulo", "o coach", "o Pedro" |

A plataforma nao menciona "Pedro Paulo" em nenhuma superficie voltada ao usuario. A bio do
coach e generica: "Coach Immortal Top 0.5%". A autoridade e da doutrina e da metodologia,
nao de uma pessoa publica especifica. Isso protege o produto de dependencia de personalidade
e mantem a escala possivel quando outros coaches forem credenciados (V2).

### Exemplos: Bom vs Ruim

**Erro de sistema**
```
Ruim: "Ops! Algo deu errado. Por favor, tente novamente mais tarde."
Bom:  "Nao conseguimos criar sua partida. Tente novamente."
```

**Empty state de fila vazia**
```
Ruim: "Nenhum jogador na fila agora. Volte mais tarde!"
Bom:  "A fila esta vazia. Seja o primeiro a entrar."
```

**Confirmacao de pagamento**
```
Ruim: "Yay! Pagamento confirmado! Bem-vindo ao time!"
Bom:  "Pagamento confirmado. Acesso liberado."
```

**Mensagem de advertencia**
```
Ruim: "Olha, recebemos um relato sobre seu comportamento. Isso nao e legal."
Bom:  "Advertencia registrada. Principio 4 — Comunicacao Toxica — foi violado.
       Segunda violacao resulta em suspensao."
```

**Onboarding apos aceite de doutrina**
```
Ruim: "Bem-vindo! Estamos felizes em ter voce aqui. Vamos comecar?"
Bom:  "Doutrina aceita. Voce esta dentro. Agora, jogue como se pratica: com
       responsabilidade, foco e sem desculpas."
```

---

## 6. Hierarquia de Feedback — 4 Niveis

Toda interacao com o sistema produz feedback. Nenhum evento e silencioso. O nivel do feedback
e proporcional ao impacto da acao — nao ao grau de dificuldade de implementar.

| Nivel | Quando Usar | Visual | Audio | Motion | Exemplo Canonico |
|-------|-------------|--------|-------|--------|-----------------|
| **Critico** | Bloqueia continuacao. Exige resposta imediata do usuario. | Full-screen takeover. AmbientLayer reforçada (particles mais densas). Tipografia Cinzel em tamanho display. Sem X para fechar — so as opcoes da acao. | Stinger cinematografico urgente (2-3s). Nao pode ser ignorado. | Hero motion: elemento central entra com scale de 0.8 a 1.0 em 400ms, easing spring. Countdown pulsa. | "PARTIDA ENCONTRADA — Aceitar / Recusar — 30s" |
| **Importante** | Sucesso ou falha de acao iniciada pelo usuario. Nao bloqueia, mas exige ciencia. | Toast custom bottom-center. Icone grande (24px+). Fundo escuro com borda colorida (verde = sucesso, vermelho = erro). Persiste 5s com dismiss manual. | Som confirm (sucesso) ou error (falha). Tom distinto — nao generico. | Standard: slide-up de baixo em 200ms, ease-out. Saida: fade em 150ms. Soft-landing no topo do stack. | "Pagamento confirmado — saldo +5 fichas" / "Fila cancelada pelo sistema" |
| **Informativo** | Status passivo, atualizacoes de estado que o usuario nao solicitou. Sem urgencia. | Inline na UI (contador, pill, dot de presenca). Ou status bar discreta no header. Nao interrompe o fluxo. | Sutil ou nenhum. Se houver som, e micro (tick suave, < 200ms). | Micro: numero troca com fade-number em 150ms. Dot pulsa em CSS animation (nao motion lib). | "5/10 jogadores na fila" atualizando via realtime |
| **Erro** | Falha que requer acao do usuario para continuar. | Display inline no contexto da acao (nao modal flutuante). Borda vermelha no elemento com problema. Texto de erro especifico abaixo. Botao "Tentar novamente" em destaque proximo ao erro. | Som de erro distinto (tom dissonante curto, < 500ms). Diferente do som de "Importante/falha". | Standard: shake leve horizontal (2px, 2 ciclos, 300ms total) no elemento com erro. Botao retry com scale-in. | "Falha ao entrar na fila — tentar novamente" |

### Regras Absolutas de Feedback

**Regra F-1**: NUNCA usar toast SaaS padrao (top-right, slide-in da direita, visual neutro
de dashboard). Esse padrao nao existe no FORMULADOTA em nenhum nivel de feedback.

**Regra F-2**: Erro NUNCA e apresentado em modal centralizado com botao X para fechar sem
acao. Modal sem acao construtiva e anti-padrao — o usuario fecha e nao sabe o que fazer.

**Regra F-3**: Acoplamento visual+audio e obrigatorio em eventos Critico e Importante. Nao
ha evento critico sem som, nao ha som critico sem visual correspondente.

**Regra F-4**: O nivel Critico nao pode ser dispensado sem acao explicita do usuario.
Auto-dismiss e proibido para esse nivel.

**Regra F-5**: Mensagens de erro devem ter copy especifica. "Algo deu errado" nao e copy —
e placeholder. Cada erro tem sua mensagem, mapeada para o contexto.

---

## 7. Os 3 Estados do Botao Primario

O botao primario e o elemento de maior hierarquia visual em qualquer tela. Ele comunica
onde o usuario deve agir. Onde ha um botao primario, ha uma acao principal — e apenas uma.

### Estado: Idle (Disponivel)

O botao primario em repouso deve ter peso visual MUITO maior que qualquer elemento secundario
na mesma tela. Isso nao e conseguido apenas com cor — e com tamanho, padding generoso,
peso de tipografia (font-weight 700+) e hierarquia de z-index visual.

- Background: `--color-brand-red` solido (nao outline, nao ghost)
- Tipografia: maiuscula, tracking aumentado (letter-spacing 0.1em+), peso 700
- Padding: vertical generoso (py-4 ou maior) — nao o h-8 padrao shadcn
- Glow: `box-shadow` com `--color-brand-red` opacidade 40%, blur 12px — pulse suave opcional
  em CTAs de acao principal (entrar na fila, aceitar partida)
- Cursor: pointer

O glow pulsante e opcional e reservado para CTAs de maximo impacto (Entrar na Fila, Aceitar
Partida). CTAs primarios em contextos menores (confirmar pagamento, salvar configuracao)
usam o botao primario sem pulse.

### Estado: Hover

- Scale: 1.02 (transform scale, nao mudanca de tamanho de layout)
- Glow: intensifica — opacidade sobe de 40% para 65%, blur aumenta de 12px para 16px
- Tipografia: sem mudanca
- Audio: som de hover dispara (tick suave, < 100ms, volume baixo)
- Motion: transicao de 120ms, easing ease-out — rapido o suficiente para parecer responsivo,
  nao instantaneo o suficiente para parecer bruto
- Cursor: pointer

### Estado: Pressed / Loading

Quando o usuario clica, antes do sistema responder:

- Scale: 0.97 (compressao tatil — feedback de que o clique foi registrado)
- Som de click dispara no mousedown (nao no mouseup) — < 80ms de latencia percebida
- Apos 100ms sem resposta: estado loading interno
- Loading loading state: nao spinner. Usar animacao contextual — barra de progresso interna
  no botao (width 0% -> 100% em estimativa de tempo), ou texto pulsando ("Entrando na
  fila..."), ou icone do FORMULADOTA pulsando. Nunca `animate-spin` com border.
- Scale retorna a 1.0 durante loading
- Cursor: nao muda (mantem pointer — o usuario ja clicou, o sistema esta processando)

### Estado: Disabled

- Opacity: 0.5
- Background: mantido (nao cinza — o usuario precisa entender que seria a acao certa, mas
  nao esta disponivel agora)
- Cursor: not-allowed
- Audio: NENHUM som em hover. Hovering em disabled e silencioso.
- Motion: NENHUMA animacao de hover. O botao e estatico.
- Tooltip opcional: explicar por que esta desabilitado ("Assinatura necessaria para entrar
  na fila" — nao apenas "indisponivel")

### Regras do Botao Primario

**Regra B-1**: Por tela, no maximo um botao primario. Se houver dois elementos que parecem
primarios na mesma tela, a hierarquia esta errada — revisar o design.

**Regra B-2**: Botao primario NUNCA tem o mesmo peso visual que botao secundario. Se parecem
iguais, o primario esta fraco — nao e o secundario que esta forte.

**Regra B-3**: O texto do botao primario e imperativo e especifico. "ENTRAR NA FILA", nao
"Continuar". "ACEITAR PARTIDA", nao "Ok". "ASSINAR AGORA", nao "Prosseguir".

**Regra B-4**: Loading state interno ao botao nunca usa spinner externo ao layout do botao.
A UI nao trava enquanto o botao esta carregando — apenas o botao entra em estado loading.

---

## 8. Principios de Storytelling em UI

Toda tela do FORMULADOTA conta uma historia minima. Nenhuma tela e dump de dados. Nenhum
estado e neutro.

### Empty State como Oportunidade Narrativa

O empty state e onde a maioria dos produtos falha. Um empty state bem feito:

1. Nao acusa o usuario ("voce nao tem partidas")
2. Contextualiza o estado ("a fila esta vazia agora")
3. Cita principio de doutrina relevante (se aplicavel ao contexto)
4. Sugere a proxima acao com CTA claro

Exemplos:

```
[Historico de partidas vazio]
Sua primeira partida esta esperando.
Cada derrota e um degrau — mas primeiro voce precisa entrar na fila.
[ENTRAR NA FILA]

[Fila sem jogadores]
A fila esta vazia.
Seja o primeiro. Outros seguem.
[ENTRAR NA FILA]

[Ranking sem posicao registrada]
Voce ainda nao aparece no ranking.
Complete pelo menos uma partida para ser classificado.
[ENTRAR NA FILA]
```

### Loading como Mini-Experiencia

O tempo de loading nao e dead time — e momento curatorial. O FORMULADOTA usa esse tempo
para reforcar a doutrina de forma natural, sem forcar. A regra: o loading nunca e mais
longo que o necessario, mas enquanto existe, comunica algo.

Estrutura do loading screen padrao:
- Fundo escuro com AmbientLayer ativa (particles sutis)
- Barra de progresso na cor brand (vermelho) — animada, nao estatica
- Principio doutrinario rotativo em Cinzel — titulo em destaque, corpo em Geist menor
- Sem spinner de qualquer tipo

### Onboarding como Ritual

O primeiro acesso pos-autenticacao nao e um checklist de boas-vindas. E um ritual de entrada.
A sequencia e cinematografica, linear, sem atalhos. O usuario nao pode pular — pode sair e
voltar, mas o ritual recomeça onde parou.

A metafora e o dojo: antes de treinar, o aluno precisa entender as regras do espaço.

### Error como Parte da Jornada

Erros de sistema nao sao acidentes embaraçosos que o produto tenta esconder. Sao partes
previstas da jornada. O erro bem tratado:

1. E especifico (o que falhou, onde)
2. Sugere acao concreta (o que fazer agora)
3. Mantem o tom de marca (Mestre, nao suporte tecnico)
4. Nao culpa o usuario

---

## 9. Mapping de Padroes para Telas Reais

Esta secao mapeia os padroes definidos acima para as telas que existem ou serao construidas
em phases futuras. Use como referencia de consistencia ao implementar.

### Fila / Queue

- Estado normal: botao primario "ENTRAR NA FILA" — hierarquia maxima, glow pulse ativo
- Estado em fila: botao muta para "BUSCANDO... 2:14" — timer up-counting, pulse de cor
  diferente (nao o glow do idle), CTA secundario "CANCELAR" em ghost
- Match found: nivel Critico. Full-screen takeover. "PARTIDA ENCONTRADA". Countdown 30s
  pulsante. Stinger sonoro urgente. Botoes ACEITAR (primario) e RECUSAR (danger).
- Fila cancelada: nivel Importante. Toast bottom-center. "Fila cancelada." Som de erro.

### Lobby / Partida em Andamento

- Presence rich: 4 estados de presenca (online, em fila, em partida, offline) com cor
  e animacao distintos
- Slots de jogadores: visualizacao de quantos aceitaram ("5/10 jogadores prontos")
- Ambient drone: musica de fundo tematica Dota, volume baixo, opt-out disponivel

### Pagamento Confirmado

- Nivel Importante. Toast custom bottom-center. "Pagamento confirmado — acesso liberado."
  Som de confirm. Motion: slide-up em 200ms.
- Nao usar modal de sucesso (anti-padrao). O usuario ja sabe o que fez — confirme e siga.

### Banimento Triggered

- Nivel Critico. Full-screen escuro. Principio violado em Cinzel grande. "Banimento
  permanente aplicado." Descricao do anti-padrao acionado. Sem opcao de continuar sem
  reconhecimento explicito ("Reconheço a violacao" — botao de confirmacao obrigatorio).
- Sem X para fechar. Sem dismiss automatico.

### Onboarding Doutrinario

- Full-screen cinematografico pos-Discord OAuth (primeiro acesso)
- Principios em scroll vertical — um por vez em tela cheia
- Tipografia Cinzel em tamanho de display (text-4xl ou maior)
- AmbientLayer ativa com particles sutis
- Aceite ritualístico ao final: campo de texto onde o usuario digita "ACEITO" (nao checkbox)
- Sem botao de pular. Sem "aceitar tudo de uma vez".

---

## 10. Regua de Validacao de Produto

Antes de qualquer feature nova entrar em desenvolvimento, tres perguntas obrigatorias:

### Pergunta 1: Reforca Doutrina ou e Neutro?

Uma feature que e neutra em relacao a doutrina pode existir, mas nao tem prioridade. Uma
feature que contradiz a doutrina (ex: facilitar bypass de aceite, esconder condutas violadas,
suavizar linguagem de banimento) e candidata a remocao imediata, independente de quem pediu.

### Pergunta 2: Reforca "Jogar Junto" ou Isola?

O FORMULADOTA e comunidade. Toda feature deve, ao menos, nao enfraquecer o senso de
comunidade. Features que isolam (perfil completamente privado, sem contador online, sem
historico compartilhavel) vao contra o eixo do produto.

### Pergunta 3: Mantem o Arquetipo Mestre?

- "Essa copy soa como Mestre ou como Vendedor?" — Se parece pressionar compra, e Vendedor.
  Revisar.
- "Esse flow soa como ritual ou como burocracia?" — Se parece checklist de SaaS, e burocracia.
  Revisar.
- "Esse feedback parece part e da experiencia ou interrupcao generica?" — Se parece toast de
  dashboard corporativo, e interrupcao generica. Revisar.

### Pergunta 4 (Comercial): Pedro vai parecer puxando saco do usuario?

Nenhuma decisao de pricing, promocao ou comunicacao comercial deve colocar o admin na posicao
de vendedor ansioso. Precos sao fixos e justificados pela proposta de valor. Sem countdown
de oferta. Sem "ultima chance". Sem "so hoje".

---

## Apendice: Glossario de Termos de Marca

| Termo | Uso Correto | Uso Errado |
|-------|------------|------------|
| FORMULADOTA | Sempre maiusculo, sem acento, sem espaco | Fórmula Dota, Formula Dota, formuladota |
| doutrina | Minusculo quando substantivo comum | Doutrina (maiusculo desnecessario) |
| principio | Minusculo + numero: "Principio 1" | "o Principio Numero Um" |
| coach | Minusculo, sem aspas | "o Coach", Coach (maiusculo) |
| admin | Implicito — nao mencionar "Pedro Paulo" | Pedro, o Pedro, Pedro Paulo |
| partida | Usar "partida" (nao "sessao", nao "jogo" isolado) | sessao, match (em copy PT-BR) |
| fila | "entrar na fila", "buscando partida" | "queue" (em copy PT-BR), "matchmaking" |
| ficha | "ficha de vaga" quando no contexto de MVP fichas | credito, token, ingresso |

---

*Este documento e permanente e vivo. Atualizar quando: (a) a doutrina for revisada e
DOCTRINE_VERSION incrementar; (b) decisoes de produto alterarem fundamentalmente o
posicionamento; (c) novas telas introduzirem padroes que precisam de canonizacao aqui.*

*Proximos documentos fundacionais: VISUAL_PHILOSOPHY.md, UX_PRINCIPLES.md, MOTION_SYSTEM.md,
SOUND_SYSTEM.md, DESIGN_LANGUAGE.md*
