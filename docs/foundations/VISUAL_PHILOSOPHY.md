# VISUAL_PHILOSOPHY.md
# FormulaDota — Filosofia Visual

> Documento fundacional permanente. V2.5 Design Foundations.
> Toda decisao de UX, componente, animacao ou cor passa por este documento primeiro.
> Versao: 1.0 — 2026-05-23

---

## 1. Manifesto Visual

FormulaDota nao e um SaaS. Nao e uma landing page de startup. Nao e um painel de administracao. E um game client web — o mesmo tipo de software que Valve, Riot Games e Blizzard entregam em client nativo, mas rodando no browser. Essa distincao nao e cosmética: e estrutural. Game clients existem dentro de um universo coerente, onde cada pixel carrega intenção do mundo do jogo, onde a interface nao compete com o conteudo mas o amplifica, onde o usuario nao "usa o software" mas "entra no sistema". O jogador de Dota 2 brasileiro que acessa o FormulaDota tem 15 anos de memoria muscular construida em Dota 2, Steam, Discord e FACEIT — interfaces que foram projetadas por equipes dedicadas exclusivamente ao craft de game UX. Quando esse jogador abre o FormulaDota e ve um container centralizado com max-w-7xl, um grid de tres colunas identicas e um spinner CSS, ele nao articula o problema, mas sente: "isso e um site, nao um client". Essa sensacao e irreversivel nos primeiros segundos. A filosofia visual do FormulaDota e a recusa deliberada de todos os padroes que produzem essa sensacao, substituidos por padroes que produzem outra: "isso e software de jogo de verdade".

---

## 2. A Regua AAA: "Isso Existe no Cliente Dota 2?"

> **Reformulado 2026-06-11 (decisao Pedro):** a regua original perguntava "Isso existe no Riot Client?" — e isso induzia a estetica errada (Riot = minimalista/arejado; Dota 2 = denso/compacto). O benchmark PRIMARIO e o **cliente Dota 2 real** (catalogo em `DOTA2_CLIENT_REFERENCE.md`). Os demais clients AAA (Riot, Blizzard, FACEIT) seguem validos como benchmark SECUNDARIO de qualidade de craft — nunca de estetica.

Toda decisao visual — cada componente, cada animacao, cada estado de loading — passa por uma unica pergunta:

**"Isso existe no cliente Dota 2?"** (e, se nao, existe em algum game client AAA e ha justificativa explicita?)

Se uma decisao e padrao de SaaS e nao existe em nenhum game client AAA, ela e proibida por definicao. Se existe em outro AAA mas NAO no Dota 2, ela exige justificativa documentada — o default e o que o Dota 2 faz.

Esta regua e aplicada assim:

| Decisao em questao | Existe no cliente Dota 2 (ou AAA com justificativa)? | Conclusao |
|---|---|---|
| Container `max-w-7xl mx-auto px-6` | Nao | Proibido |
| Spinner `animate-spin` como loading | Nao | Proibido |
| Toast shadcn no topo-direito | Nao | Proibido |
| Skeleton `animate-pulse bg-muted rounded-md` sem forma | Nao | Proibido |
| Grid 3 colunas identicas para features | Nao | Proibido |
| Botoes primario/secundario mesma altura | Nao | Proibido |
| Sound acoplado a toda interacao critica | Sim | Obrigatorio |
| Hierarquia 60-30-10 por viewport | Sim | Obrigatorio |
| Motion com duration hierarquica por contexto | Sim | Obrigatorio |
| Estado de fila persistente no header | Sim | Obrigatorio |
| Background vivo (video, particles, ambient) | Sim | Obrigatorio |
| Empty states com narrativa e CTA | Sim | Obrigatorio |

A pergunta nao precisa de contexto adicional. "Isso existe no cliente Dota 2?" e suficiente para encerrar qualquer debate sobre se um padrao e aceitavel ou nao. Em caso de conflito entre este documento e `DOTA2_CLIENT_REFERENCE.md` em questoes de ESTRUTURA/LAYOUT/DENSIDADE, o catalogo Dota 2 vence. Em questoes de COR/MATERIAL/TIPOGRAFIA, os tokens de `src/styles/tokens/` vencem (identidade FormulaDota, escolhida por Pedro).

---

## 3. Os 5 Principios Fundamentais

### 3.1 Atmosfericidade

A interface do FormulaDota existe dentro de um ambiente, nao sobre um fundo. Atmosfericidade e a qualidade de uma interface que faz o usuario sentir que esta dentro de um espaco com profundidade, temperatura e vida — nao olhando para uma tela.

Na pratica: o background nunca e preto solido e estatico. Ha camadas de profundidade — um video de hero em loop no plano mais distante, particles de po sutil no plano intermediario, vinheta dinamica nos cantos, e o conteudo principal no plano de frente. O background respira. Quando o usuario entra em fila, o ambiente muda de tom (pulse vermelho sutil nas bordas). Quando uma partida e encontrada, o ambiente reage com flash e stinger.

Atmosfericidade nao e decoracao: e comunicacao de estado. O ambiente informa o jogador sobre o estado do sistema sem que ele precise ler texto.

**Implementacao tecnica:** `<AmbientLayer>` no root layout com z-index -10, tsParticles slim (sem WebGL, Tauri-safe), Page Visibility pause para poupar recurso quando a aba esta em segundo plano, FPS limiter para hardware de baixa performance. Hero video em `<HeroVideo heroSlug="..." />` com CDN Steam como fonte primaria.

### 3.2 Layering (Estratificacao Visual)

O FormulaDota opera em camadas fisicas, nao em uma superficie plana. Layering e a pratica de atribuir profundidade Z explicitamente a cada elemento, criando uma hierarquia tridimensional percebida — mesmo em uma interface 2D.

Camadas do FormulaDota (da mais distante para a mais proxima):

| Camada | Conteudo | Z-index token |
|---|---|---|
| Ambient | Video de hero, particles, vinheta | `--z-ambient: -10` |
| Base | Fundo de pagina, background de secao | `--z-base: 0` |
| Raised | Cards em estado normal | `--z-raised: 10` |
| Dropdown | Menus, popovers, tooltips inline | `--z-dropdown: 100` |
| Sticky | Header, queue pill persistente | `--z-sticky: 200` |
| Overlay | Backdrop de drawer ou modal secundario | `--z-overlay: 300` |
| Modal | Modais principais, confirmacoes criticas | `--z-modal: 400` |
| Toast | Banners de notificacao (nao floating) | `--z-toast: 500` |
| Cinematic | Match accept screen, telas fullscreen | `--z-cinematic: 900` |

Nenhum elemento usa `z-50`, `z-40` ou `z-[9999]` ad-hoc. Todo z-index e um token nomeado. Quando uma camada precisa de ajuste, o token e atualizado — todos os elementos dessa camada seguem automaticamente.

### 3.3 Hierarquia Cinematografica

Em qualquer tela do FormulaDota, ha exatamente um elemento que comanda 60% da atencao visual. Os demais existem em ordem decrescente de peso — 30% para o segundo elemento, 10% para tudo que resta. Esta e a regra 60-30-10 aplicada a layout de game client.

O olho humano precisa de um ponto de entrada. Sem hierarquia, o usuario faz varredura e nao encontra onde focar — sensacao de desorientacao que game clients nunca produzem. O botao "Play" do Dota 2 comanda 60% do viewport. O queue counter do FACEIT comanda 60% da sidebar. A tier badge no perfil do CS2 comanda 60% do card de identidade.

No FormulaDota:
- Na home autenticada: o botao "Entrar na Fila" e o elemento de 60%. Nao ha competidor visual.
- No perfil: o hero portrait comanda 40%+ da area acima do dobramento. A tier badge e o segundo elemento.
- Na tela de fila: o timer de busca e o estado da fila comandam 60% do viewport.
- No ranking: o card do primeiro colocado tem peso fisico 2x maior que os demais.

Hierarquia cinematografica implica: botao primario tem altura `h-14` com glow pulsante. Botao secundario tem `h-10` com borda. Botao terciario tem `h-8` sem borda. A diferenca fisica entre os niveis e maior que a diferenca de cor — o usuario nao precisa ler labels para saber o que e mais importante.

### 3.4 Intencionalidade

Cada elemento que aparece na tela do FormulaDota tem uma razao de existir que pode ser articulada em uma frase. Se um elemento nao tem essa frase, ele nao deveria estar la.

Intencionalidade e o oposto de vibecoding. Vibecoding coloca gradientes lavender-to-pink porque "parece moderno". Intencionalidade coloca um gradiente vermelho-to-transparente porque "comunica a expansao da brand color em direcao ao conteudo, reforçando a hierarquia visual a partir do CTA". A diferenca nao e estetica — e processo.

Na pratica, intencionalidade e aplicada assim:

- Cada gradiente tem justificativa de brand. Se a justificativa nao existe, a cor solida e preferida.
- Cada animacao tem proposito de comunicacao. "Entra com fade" comunica "elemento novo chegou". "Pulsa vermelho" comunica "atencao urgente". "Spring on hover" comunica "elemento interativo com fisica".
- Cada icone foi escolhido pelo seu significado no contexto Dota 2, nao por disponibilidade na biblioteca.
- Cada copy de interface — incluindo empty states e erros — foi escrito no tom da doutrina, nao no tom neutro de software.

Intencionalidade e verificada no code review: qualquer elemento sem justificativa articulada e removido ou reformulado.

### 3.5 Sistema Vivo

O FormulaDota e software que respira. Nao e uma colecao de paginas estaticas com transicoes de rota. E um sistema que tem estado, que reage ao mundo externo (jogadores online, partidas em andamento, fila ativa), e que comunica esse estado atraves de todos os canais simultaneamente: visual, motion e sound.

Sistema Vivo tem quatro dimensoes:

**Presenca:** O usuario nunca se sente sozinho no hub. O counter de jogadores online e visivel no header. Dots de presenca nos avatares comunicam estado (online, em fila, em partida). O ambiente visual muda quando o usuario esta em fila.

**Reatividade:** Toda acao critica tem feedback acoplado: visual + motion + sound simultaneamente. Entrar na fila muda o botao, adiciona o pill de timer no header, muda a atmosfera do background e toca o som de "queue join". Nao ha acao critica com feedback apenas visual.

**Continuidade:** O estado persiste atraves de navegacao. O timer de fila aparece no header em qualquer rota. O sistema nao "esquece" que o usuario esta em fila quando ele navega para o perfil.

**Narrativa:** Mesmo nos estados intermediarios — loading, empty, erro — o sistema continua contando a historia do FormulaDota. Loading screens mostram principios da doutrina. Empty states usam a voz da marca. Erros sao especificos e construtivos.

---

## 4. Anti-Patterns Proibidos

Esta secao sintetiza os pitfalls identificados em `.planning/research/PITFALLS.md` e os converte em regras operacionais permanentes. Cada anti-pattern tem status **PROIBIDO** — nao "evitar quando possivel", mas proibido em code review.

### 4.1 Cards Iguais em Grid

**O que e:** `grid gap-6 md:grid-cols-3` com cards identicos em padding, altura e peso visual.

**Por que destroi AAA:** O olho humano nao encontra ponto de entrada. O conteudo parece democraticamente insignificante. Nenhum game client AAA tem este padrao.

**Substituicao obrigatoria:** Layout assimetrico com hierarquia fisica. O card de maior importancia ocupa 2x o espaco. Cards secundarios existem em subordinacao visual explicita. Colunas com proporcoes diferentes (ex: `grid-cols-[2fr_1fr_1fr]`).

### 4.2 Botoes com Mesma Visual Weight

**O que e:** Botao primario, secundario e ghost com a mesma altura `h-8` ou `h-10`, diferindo apenas em cor.

**Por que destroi AAA:** Hierarquia fisica inexistente. O usuario tem que ler o label para entender o que e mais importante.

**Substituicao obrigatoria:** Tres niveis de altura com diferenca fisica perceptivel. Primario: `h-14` com glow animation e padding generoso. Secundario: `h-10` com borda visivel. Ghost: `h-8` sem borda. A diferenca de altura e o sinal primario de hierarquia — cor e secundario.

### 4.3 Single Accent Color sem Familia

**O que e:** Um unico token de cor de marca (`--color-brand-red: #ac1d0e`) usado em todos os contextos sem variantes.

**Por que destroi AAA:** O accent parece "colado" na interface em vez de integrado. Sem variantes de glow, hover, light e subtle, os estados interativos ficam sem gradacao.

**Substituicao obrigatoria:** Familia completa de accent com no minimo 5 variantes: `base`, `hover` (+10% luminosidade), `light` (versao legivel em dark bg, ratio 4.5:1+), `glow` (transparencia para box-shadow e ambient), `subtle` (transparencia para backgrounds de highlight). Todas definidas em F2 Token Layer antes de qualquer componente.

### 4.4 Container `max-w-*` SaaS

**O que e:** `<div className="mx-auto max-w-6xl px-6 py-24">` como wrapper de secao.

**Por que destroi AAA:** Assina "Tailwind tutorial YouTube video". Comunica inconscientemente "sou uma pagina de texto", nao "sou um sistema operacional para jogos". O conteudo nao ocupa o espaco disponivel — fica centralizado como em um blog.

**Substituicao obrigatoria:** Zonas de conteudo que sangram pelas bordas. Layout definido por `grid` com colunas de proposito explicito, nao por container com padding bilateral simetrico. O espaco e gerenciado pelo layout grid, nao por max-width artificial.

### 4.5 Toast Top-Right Floating

**O que e:** `<Sonner>` ou qualquer toast floating no canto superior ou inferior direito da tela.

**Por que destroi AAA:** Toast SaaS e associado a Jira, Notion, Vercel dashboard. Jogadores de Dota 2 associam notificacoes a banners de sistema contextual ou stingers fullscreen. O toast saas quebra a imersao instantaneamente.

**Substituicao obrigatoria:** Hierarquia de feedback por nivel de criticidade. Critico (match found, kick): modal fullscreen + stinger sonoro. Importante (compra confirmada, fila cancelada): banner no topo da view com animacao de entrada + som. Informativo (XP ganho): inline animation no elemento relevante + som suave. Nenhum toast floating desconectado do contexto.

### 4.6 Skeleton Vanilla (`animate-pulse bg-muted rounded-md`)

**O que e:** Skeleton generico aplicado como retangulo cinza sem forma estrutural.

**Por que destroi AAA:** Comunica "o dev nao pensou no estado intermediario". O usuario viu um retangulo cinza e apos loading viu um componente com estrutura completamente diferente — CLS (Cumulative Layout Shift) visivel.

**Substituicao obrigatoria:** Skeleton contextual que espelha a forma exata do componente que sera renderizado. Se o `QueueCard` tem avatar circular + duas linhas de texto + badge de vagas, o `QueueCardSkeleton` tem `size-10 rounded-full` + dois retangulos de altura proporcional + retangulo de badge. O skeleton e um fantasma do componente real, nao um placeholder generico.

### 4.7 Spinner `animate-spin`

**O que e:** `<Loader2 className="animate-spin" />` ou qualquer SVG circular rotativo como indicador de loading.

**Por que destroi AAA:** Spinner CSS e o loading de um formulario de cadastro de 2015. Nenhum game client AAA usa spinner como indicador primario de loading. E o sinal mais forte de "web app generica".

**Substituicao obrigatoria:** Loading cinematografico contextual. Para loading de pagina: barra de progresso na cor brand + tip rotativa de doutrina. Para loading de componente: skeleton contextual. Para loading de acao (botao clicado): o proprio botao muda de estado com animacao interna (shrink + pulse da cor). Para transicao de rota: fade in/out de 150ms via `motion/react`.

### 4.8 Gradients Lavender, Aurora e Neumorphismo/Glassmorfismo

**O que sao:**
- Lavender/aurora: `bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900` ou variantes com rosa, lavanda ou aurora animada.
- Neumorfismo: `box-shadow: inset` com valores simetricos criando efeito de relevo plastico.
- Glassmorfismo: `backdrop-blur + bg-white/10` em elementos de navegacao ou cards principais.

**Por que destroem AAA:** Sao os tres indicadores mais fortes de "resultado de AI sem curadoria". O Riot Client nao usa nenhum dos tres. O Dota 2 client nao usa nenhum dos tres. Sao tendencias de 2019-2022 que modelos de AI ainda sugerem por padrao estatistico.

**Substituicao obrigatoria:** Gradientes apenas com justificativa de brand explicita. Gradiente vermelho-to-transparente em direcao ao CTA = justificado (expande a cor de marca em direcao ao ponto de acao). Qualquer gradiente que nao passa por este criterio = cor solida ou sem gradiente. Neumorfismo = proibido em todos os contextos. Glassmorfismo = proibido em elementos funcionais (navegacao, cards de dados). Pode ser usado em camadas puramente atmosfericas (vinheta de profundidade) com justificativa explicita.

---

## 5. Galeria de Referencias AAA com Analise Dimensional

Esta galeria documenta as referencias de design que informam as decisoes do FormulaDota. Cada referencia e analisada em quatro dimensoes: **paleta e materialidade**, **motion signature**, **sound signature** e **licoes aplicaveis**.

---

### 5.1 Dota 2 Client (Valve, 2024+)

**Paleta e materialidade:** Preto com temperatura marrom-quente (nao preto neutro). Cards com textura de couro envelhecido e bordas douradas em estados ativos. Vermelho de marca complementado por glow dourado-laranja nos estados de hover e selecao. Neutros com temperatura — `#0c0a09` como base, nao `#000000`. O ambiente tem profundidade percebida mesmo sem elementos 3D explicitos: sombras longas, vinheta de borda, overlaps de camadas.

**Motion signature:** Tres velocidades distintas: micro-feedback em 80ms com spring physics para hover de cards de hero (escala 1.02); transicoes de estado em 280-320ms com ease-out forte para modais e drawers; transicoes cinematograficas em 600ms+ com wipe lateral para troca de tela principal. AnimatePresence com exit variants definidos — nada sai da tela com corte abrupto. A tela de carregamento de partida e a peca de motion mais elaborada de todo o client: hero portraits revelados progressivamente com stagger de 80ms entre cada um, barra de progresso com glow que pulsa na cor do time.

**Sound signature:** Quatro camadas de audio com volumes independentes: ambient (trilha tematica do Dota em loop, volume baixo), interaction (click seco metalico em botoes, hover hint em cards de hero, frequencias 2-5kHz, duracao 100-300ms), feedback (stinger de compra, stinger de match found, stinger de inicio de partida), cinematic (sweep de transicao de tela, crescendo de season reveal). Cada camada tem controle de volume independente no painel de opcoes.

**Licoes aplicaveis ao FormulaDota:**
- O background "preto quente" com temperatura marrom e superior ao preto neutro para um contexto epico/agressivo. Aplicar em `--color-background: #0a0804` e `--color-card: #120e0b`.
- A revelacao progressiva de hero portraits na tela de loading e diretamente aplicavel ao lobby do FormulaDota — revelar os jogadores da partida um por um com stagger.
- O glow dourado-laranja nos estados ativos e uma referencia de como expandir a familia de accent alem do vermelho base.

---

### 5.2 Steam Library (Valve, 2024)

**Paleta e materialidade:** Azul-petróleo profundo como base (`#1b2838`), nao azul-cinza neutro. Arte de jogo como backdrop dominante — o hero art sangra ate as bordas da tela, com vinheta gradiente na base para legibilidade do conteudo. Cards de biblioteca sao miniaturas da arte do jogo, nao cards com campos de formulario. A identidade visual de cada jogo impregna o espaco em volta do card.

**Motion signature:** Hover em cards de biblioteca: escala 1.05 com sombra que aparece em 120ms, spring physics suave. Transicao entre jogos: crossfade do background art em 400ms. Scroll horizontal de cards com momentum fisico (nao scroll snap abrupto). A biblioteca "flui" em vez de "paginar".

**Sound signature:** Minimalista — sem ambient loop no cliente principal. Sons de interaction apenas em acoes criticas: click em "Play" tem som de confirmacao, notificacoes de update tem som proprio. A ausencia de som ambient nao e falha — e escolha intencional para nao interferir com o audio do jogo em background.

**Licoes aplicaveis ao FormulaDota:**
- Arte como backdrop dominante e diretamente aplicavel: o hero portrait no perfil do jogador deve sangrar para as bordas, nao ficar contido em um quadrado centralizado.
- O crossfade de 400ms entre estados de contexto e o timing correto para transicoes de tela principal — nem rapido demais (corte) nem lento demais (espera perceptivel).
- A ausencia de som ambient pode ser a decisao correta tambem para o FormulaDota — priorizar sons de interaction e feedback critico, deixar ambient como opt-in.

---

### 5.3 Battle.net Launcher (Blizzard, 2024)

**Paleta e materialidade:** Por jogo — World of Warcraft usa dourado e azul profundo; Diablo IV usa vermelho sangue e preto com textura de pedra; Overwatch 2 usa laranja e branco. A materialidade muda completamente entre jogos, mas a estrutura do launcher permanece consistente. Isso demonstra que um design system pode ter "temas por contexto" sem perder coesao estrutural.

**Motion signature:** Cards de jogos na home: hover revela arte adicional com parallax sutil (a arte "se aprofunda" em direcao ao cursor). Transicao entre jogos: wipe lateral de 300ms com ease-out. Loading screens: arte da zona de destino aparece com fade de 600ms + barra de progresso com glow + tip rotativa no rodape. A tip rotativa nao e decoracao — ela existe para que o usuario aprenda algo util enquanto espera.

**Sound signature:** Musica ambient por jogo — cada jogo tem trilha propria que toca em loop baixo no launcher. Ao clicar em "Play", stinger de transicao proprio do jogo antes de abrir o cliente. Interaction sounds sutis em hover de cards e navegacao. O sistema de audio e o mais elaborado de qualquer launcher — prova de que som nao e feature de segunda categoria.

**Licoes aplicaveis ao FormulaDota:**
- Tips rotativas em loading screens e o padrao correto para o FormulaDota. A doutrina tem 14 principios — cada loading screen mostra um, em rotacao. O usuario que joga frequentemente vai memorizar os principios sem ser forcado a ler um documento.
- A musica ambient por contexto sugere que o FormulaDota poderia ter trilha ambient diferente durante fila (mais tensa, pulse mais rapido) versus perfil (mais relaxada) — diferenciando estados de uso com audio.
- O parallax sutil em hover de cards e aplicavel aos PRO cards e Match cards do FormulaDota.

---

### 5.4 Riot Client — Hextech UI (Riot Games, 2024+)

**Paleta e materialidade:** Hextech tem duas camadas: a estrutural (azul-petroleo profundo, ouro Hextech para elementos ativos, gradientes quentes em estados criticos) e a contextual (cada jogo — League, Valorant, TFT, LoR — tem paleta propria que se integra ao Hextech sem quebrá-lo). A materialidade e "tecnologia magica" — borda hexagonal nos badges, glow azul-eletrico em elementos interativos, particulas de Hextech em telas especiais. Nenhuma borda `border-1px` generica: bordas sao luminosas ou inexistentes.

**Motion signature:** O Riot Client tem o sistema de motion mais documentado publicamente (post "Under the Hood of League Client Hextech UI"). Motion e gerenciado por state machines, nao por animacoes ad-hoc. Cada estado de componente tem transicao especifica: idle, hover, active, loading, success, error — todos com timings diferentes. Hover em navigacao: 80ms spring. Transicao de aba: 200ms ease-out com deslizamento horizontal. Match found: fullscreen takeover com crescendo de 600ms + som urgente.

**Sound signature:** Cada acao tem som proprio por hierarquia: hover em nav (hint sutil, 50ms, 4kHz), click em botao primario (impacto seco, 100ms), confirmacao de acao (acorde positivo, 300ms), match found (stinger completo, 800ms com crescendo). Sons de hover sao sutis o suficiente para nao irritar em uso continuo — frequencia alta, volume baixo, duracao curtissima.

**Licoes aplicaveis ao FormulaDota:**
- A gerencia de motion por state machine — nao por animacoes ad-hoc em cada componente — e o padrao correto para o FormulaDota. `src/lib/motion/presets.ts` define variantes por estado, e cada componente importa o preset correto.
- A hierarquia de sons por nivel de acao (hint 50ms vs stinger 800ms) e o sistema correto. Hover em botao nao pode ter o mesmo peso sonoro que "match found".
- O fullscreen takeover para match found deve ser implementado no FormulaDota sem compromisso — nao um toast, nao um banner, mas uma tela cinematografica com countdown de 30 segundos.

---

### 5.5 FACEIT Platform (2024+)

**Paleta e materialidade:** Laranja-FACEIT como unico accent sobre preto profundo e cinza-carvao. Sem gradientes decorativos — as cores sao aplicadas cirurgicamente: laranja apenas em elementos que pedem acao ou indicam estado ativo, cinza claro para texto secundario, branco puro para texto primario. A limpeza cromatica da plataforma e intencional: com jogadores de varios jogos diferentes, a FACEIT nao pode ter uma paleta que "casa" com nenhum jogo especifico — entao escolhe neutralidade com um accent forte.

**Motion signature:** FACEIT 2.0 prioriza velocidade percebida sobre espetaculo. Transicoes de rota sao rapidas (150-200ms fade). Hover states respondem em 80ms. O player counter na home atualiza em tempo real sem animacao elaborada — apenas o numero muda com fade de 200ms. A plataforma comunica "rapidez" atraves de motion minimalista, nao ausente.

**Sound signature:** Minimalista com pico critico. Sem ambient. Sem sons de hover ou navegacao. Mas: match found tem som de ping audivel em qualquer aba do browser + banner in-app + badge na tab do browser. O som de match found e projetado para ser ouvido mesmo com o volume do computador baixo — frequencia 2-3kHz, duracao 500ms, sem fade out suave (corte abrupto para urgencia).

**Licoes aplicaveis ao FormulaDota:**
- O player counter em tempo real — especialmente o breakdown "X em fila, Y em partida" da FACEIT 2.0 — e diretamente aplicavel ao FormulaDota. Supabase Realtime cobre 100% desta necessidade.
- O som de match found projetado para urgencia — frequencia alta, corte abrupto, audivel com volume baixo — e o modelo para o FormulaDota. O jogador nao pode perder a notificacao de partida encontrada.
- A limpeza cromatica com single accent forte e uma referencia valida para momentos em que a hierarquia precisa ser maxima — o botao "Entrar na Fila" no estado idle deve ter a mesma certeza cromatica do botao "Play" da FACEIT.

---

### 5.6 CS2 Client UI (Valve, 2024)

**Paleta e materialidade:** Simplificado em relacao ao Dota 2 — cinza escuro com temperatura levemente fria, laranja como accent secundario (AWP skin highlights), verde para estados positivos (match accept, server online), vermelho para estados criticos. A materialidade e "militar minimalista" — sem texturas elaboradas, sem borders decorativas, maxima legibilidade de informacao operacional.

**Motion signature:** O CS2 prioriza funcionalidade sobre espetaculo mais explicitamente que qualquer outro client AAA. Animacoes sao minimas e rapidas: hover states em 60ms, transicoes de pagina em 150ms com fade, match accept em 300ms com pulso verde. O momento de maior motion e a tela de "Esperando jogadores..." — cada slot de jogador pisca quando o jogador aceita, com verde pulsante.

**Sound signature:** Funcional e cirurgico. Som de hover ausente em navegacao principal. Som de click em acoes criticas (compra de item, aceitar partida). Match accept: som de alerta urgente com frequencia crescente a cada segundo do countdown. Comunicacao de estado via audio e mais explicita no CS2 do que em qualquer outro client — o jogador pode estar olhando para outra janela e sabe pelo som que a partida foi aceita ou cancelada.

**Licoes aplicaveis ao FormulaDota:**
- O slot de aceitacao de partida com pulso visual por jogador e o modelo para a match accept screen do FormulaDota. Cada dos 5 slots pisca verde quando o jogador aceita, com som individual para cada aceite — criando tensao narrativa crescente.
- O modelo de rank badge proeminente no perfil — visible para todos os usuarios, nao apenas o proprio — e o padrao correto para o sistema de tiers Herald-Immortal do FormulaDota.
- A comunicacao auditiva de urgencia com frequencia crescente no countdown e uma tecnica diretamente aplicavel ao match accept screen com countdown de 30 segundos.

---

### 5.7 Discord

**Paleta e materialidade:** Blurple (roxo-azulado) como accent, background escalonado em tres tons de cinza-azul escuro (`#202225`, `#2f3136`, `#36393f`). A profundidade percebida vem dos tres niveis de escuro — sidebar mais escura, lista de canais media, area de mensagens mais clara. Nao ha texturas ou gradientes decorativos. A riqueza visual vem da densidade de informacao bem organizada, nao de elementos visuais elaborados.

**Motion signature:** Minimalista mas consistente. Hover states em 100ms. Notificacoes entram com slide-down de 200ms e saem com fade de 150ms. Voice indicator (anel ao redor do avatar) pulsa suavemente quando o usuario esta falando — frequency-based, nao metronomo. A presenca de outros usuarios e comunicada por dots animados com transicao de estado em 300ms.

**Sound signature:** O sistema de audio do Discord e o mais granular de todos — controle independente por tipo de notificacao, por servidor, por canal. Sons de join/leave de voice channel, notificacao de mensagem, chamada recebida, cada um com volume independente. O modelo demonstra que granularidade de controle de audio e feature de produto, nao luxo — usuarios com multiplos contextos de uso (trabalho + jogo) precisam de controle fino.

**Licoes aplicaveis ao FormulaDota:**
- O sistema de tres niveis de escuro para profundidade percebida e diretamente aplicavel: background de pagina, background de card, background de card elevado — tres tokens de cor distintos com temperatura consistente.
- O presence ring ao redor do avatar — pulsante para fala ativa em voice — e o modelo para o anel de presenca do FormulaDota: pulsante em vermelho quando o jogador esta em partida, solido quando online, cinza quando offline.
- A granularidade de controle de audio e o modelo para o SoundManager do FormulaDota: volumes independentes por camada (ambient, interaction, feedback, cinematic), persistidos em localStorage.

---

### 5.8 Path of Exile Client (Grinding Gear Games, 2024)

**Paleta e materialidade:** A paleta mais extrema da galeria — ambar-ouro sobre preto com temperatura marrom muito quente. Bordas de UI em ambar com glow dourado em estados ativos. Textura de pedra antiga e metal envelhecido em superficies de card. Sem concessoes para "modernidade visual" — o universo do jogo e dark fantasy medieval, e a interface nao tenta criar contraste com isso. Toda a materialidade e coerente com o universo.

**Motion signature:** Pesado e intencional, como o proprio jogo. Modais abrem com blur + escurecimento do fundo + slide-up em 400ms com ease-out forte. Hover em items de inventario: tooltip aparece com fade de 150ms + pequeno scale. Transicoes entre zonas: 800ms fade para preto + 800ms fade de entrada da nova zona. A expectativa do usuario de PoE e que o software "pesa" — e a motion design entrega essa sensacao.

**Sound signature:** Atmosferico e denso. Ambient muda por zona — cada mapa tem trilha propria. Interaction sounds combinam impacto fisico (metais, pedras) com tons magicos (cristais, energia). O inventario tem som de clique de pedras ao mover items. A experiencia auditiva e tao elaborada quanto a visual — nenhuma acao passa em silencio.

**Licoes aplicaveis ao FormulaDota:**
- A coerencia maxima entre universo do jogo e materialidade da UI e o modelo a seguir. FormulaDota e Dota 2 — a UI deve ter temperatura de cor, texturas e tons que remetem ao universo de Dota 2 (preto quente, vermelho sangue, ouro de heroi Ancients), nao tons neutros que poderiam ser de qualquer produto.
- A familia de accent completa do PoE (orange-red com 5+ variantes) e a referencia direta para a familia `--color-brand-red` do FormulaDota.
- O peso dos modais (400ms ease-out forte) e o timing correto para acoes criticas no FormulaDota — confirmacao de entrada na fila, aceite de partida, confirmacao de compra.

---

### 5.9 Diablo IV — Web e Client UI (Blizzard, 2024)

**Paleta e materialidade:** Vermelho sangue e preto com textura de pedra corrompida. Accent dourado-ambar para elementos premium (season pass, cosmetics). A UI web do Diablo IV replica a materialidade do client nativo — bordas de pedra entalhada, superficies com textura de couro escuro, backgrounds com vinheta forte nas bordas. A transicao entre o site e o client e quase imperceptivel — mesma temperatura, mesma materialidade.

**Motion signature:** Dramatico e pesado. Hero sections tem parallax de multiplas camadas (foreground, midground, background) movendo-se em velocidades diferentes com o scroll. Cards de season revelam arte adicional com motion que simula profundidade 3D (sem Three.js — puro CSS transform). Transicoes de tela no client: 800ms com wipe de neblina que avança do lado esquerdo. A motion design comunica "o mundo avanca sobre voce", nao "elementos se movem na tela".

**Sound signature:** Cinematografico. O site tem auto-play de audio ambiente com opt-out — neblina e vento, drums distantes. Client tem trilha propria para cada ato. Hover em elementos de UI tem som de "energia corrupta" (distortion sutil). Match found nao existe (single-player), mas o inicio de dungeon tem crescendo cinematografico de 6 segundos.

**Licoes aplicaveis ao FormulaDota:**
- O parallax de multiplas camadas como background da hero section e aplicavel na landing do FormulaDota. Foreground: texto e CTA. Midground: hero portrait de Dota com movimento mais lento. Background: particles e vinheta com movimento ainda mais lento.
- A continuidade visual entre site e client — mesma temperatura, mesma materialidade — e o objetivo do FormulaDota: a landing e o hub devem parecer o mesmo software, nao uma landing page e uma "area logada" com designs diferentes.
- O crescendo cinematografico para eventos de alto impacto (inicio de dungeon no Diablo = match accept no FormulaDota) e o modelo de duracao e estrutura sonora para o stinger de match found.

---

## 6. Mapping Principios Fundamentais → Telas FormulaDota

Esta secao traduz os 5 principios fundamentais em decisoes concretas para cada tela que vai existir no FormulaDota.

### 6.1 Tela de Fila

| Principio | Decisao Concreta |
|---|---|
| Atmosfericidade | Background muda de estado quando usuario entra em fila: pulse vermelho sutil nas bordas da viewport, vinheta se intensifica 20%, particles aumentam 30% de densidade. |
| Layering | Timer de fila no `--z-sticky` — visivel em qualquer rota. Background atmosphere no `--z-ambient`. Conteudo de fila no `--z-base`. Notificacao de match no `--z-cinematic`. |
| Hierarquia Cinematografica | Timer de busca ("Buscando... 2:14") comanda 60% da tela enquanto em fila. Botao de cancelar e secundario em peso fisico. Lista de quem esta em fila e terciaria. |
| Intencionalidade | Cada elemento comunicado: timer = urgencia e progresso. Pulse vermelho = atencao, "voce esta ativo". Cancelar em ghost = opcao disponivel mas nao incentivada. |
| Sistema Vivo | Timer atualiza por segundo sem re-render de pagina. Slot de fila atualiza em tempo real via Supabase Realtime quando outros jogadores entram. |

### 6.2 Tela de Lobby / Match Accept

| Principio | Decisao Concreta |
|---|---|
| Atmosfericidade | Fullscreen takeover — toda a interface some. Background se torna escuro com vinheta intensa. Hero video de fundo em loop. |
| Layering | Tela de match accept no `--z-cinematic: 900`. Nada mais existe visualmente neste momento. |
| Hierarquia Cinematografica | "PARTIDA ENCONTRADA" em Cinzel 72px comanda 70% da atencao. Countdown em vermelho com pulse e o segundo elemento. Botao "ACEITAR" e o terceiro. |
| Intencionalidade | Countdown em vermelho crescente = urgencia explodindo. Slots de jogadores revelando verde = tensao narrativa. Som urgente com frequencia crescente = impossivel ignorar. |
| Sistema Vivo | Cada slot atualiza em tempo real quando o jogador aceita. Som individual por aceite. Se o timer chega a zero sem todos aceitar: animacao de colapso + som de "cancelado". |

### 6.3 Tela de Perfil

| Principio | Decisao Concreta |
|---|---|
| Atmosfericidade | Hero portrait do top hero do jogador como backdrop de 40%+ da area above the fold. Vinheta gradiente na base para legibilidade do conteudo sobreposto. |
| Layering | Hero portrait no `--z-base`. Gradient overlay no `--z-raised`. Conteudo de stats e tier badge no raised acima do overlay. |
| Hierarquia Cinematografica | Hero portrait (60% da area acima do fold). Tier badge com MMR (segundo elemento mais visivel). Nome e Discord/Steam links (terceiro). Stats row (fourth). |
| Intencionalidade | Tier badge proeminente = identidade competitiva e o que o jogador quer que outros vejam. Avatar Discord pequeno seria anti-pattern — identidade de jogador e visual e hierarquica, nao textual. |
| Sistema Vivo | Presence ring ao redor do avatar comunica estado atual: pulsante = em partida, solido = online, cinza = offline. MMR atualiza apos cada partida sem refresh de pagina. |

### 6.4 Tela de Ranking

| Principio | Decisao Concreta |
|---|---|
| Atmosfericidade | Background com vinheta de cores da temporada ativa (definida pelo admin ao configurar a season). Particles de po dourado sutis para top 3. |
| Layering | Top 3 em camada raised com brilho de borda. Restante em base. Seu proprio ranking em sticky na base da tela, sempre visivel. |
| Hierarquia Cinematografica | Card do primeiro colocado: 2x altura dos demais, portrait de hero maior, tier badge proeminente. Segundo e terceiro em tamanho intermediario. Quarto em diante: lista compacta. |
| Intencionalidade | Hierarquia fisica do ranking comunica "distancia de quem e melhor que voce" — o usuario entende visualmente quanto precisa subir sem contar posicoes. |
| Sistema Vivo | Ranking atualiza apos cada partida concluida. Mudancas de posicao tem animacao de scroll do card para nova posicao (layout animation via motion). |

### 6.5 Tela de Partida (Match Detail)

| Principio | Decisao Concreta |
|---|---|
| Atmosfericidade | Hero portraits dos 10 jogadores como elementos de background — 5 Radiant na esquerda, 5 Dire na direita, vinheta central para o conteudo. |
| Layering | Portraits no `--z-ambient`. Stats grid no `--z-base`. Winner banner no `--z-raised`. Share/copy actions no `--z-dropdown`. |
| Hierarquia Cinematografica | Resultado (Vitoria/Derrota) em Cinzel 72px comanda 60%. Net worth graph e o segundo elemento. Tabela de stats por jogador e terceiro. |
| Intencionalidade | Cada linha de stat (kills, deaths, assists, GPM, XPM, net worth) tem contexto de referencia ("acima da media de sua medalha" via badge) — nao e tabela morta, e analise acionavel. |
| Sistema Vivo | Stats importados do Stratz apos partida concluida. Estado "processando" com loading cinematografico enquanto dados chegam. Push notification quando stats ficam prontos. |

---

## 7. Doutrina Como Cola Visual

Os 14 principios da Fórmula do Dota de Corrida nao sao apenas regras de conduta — sao o material do qual o FormulaDota e feito. Cada principio tem uma expressao visual direta na interface.

### 7.1 A Culpa Nunca e do Outro — Tela de Onboarding

O aceite doutrinario nao e um checkbox legal. E um ritual cinematografico. Pos-Discord OAuth, o usuario enfrenta uma tela fullscreen preta com o primeiro principio em Cinzel 64px: "A CULPA NUNCA E DO OUTRO". Ele permanece por 3 segundos antes do scroll revelar o proximo. Nenhum skip. O usuario digita "ACEITO" ao final — nao marca uma caixa. Este ritual existe porque a doutrina tem peso: quem aceita sabe que violacao implica consequencias. A interface comunica este peso atraves de escala tipografica, silencio sonoro antes do stinger de aceite, e a exigencia de acao ativa (digitar) em vez de acao passiva (clicar em checkbox).

### 7.2 Ou Voce Ganha, ou Voce Aprende — Empty States

Nenhum empty state do FormulaDota usa linguagem de falha neutra. O empty state de historico de partidas nao diz "Nenhuma partida encontrada". Diz: "Sua historia comeca na primeira partida." O empty state de historico de derrotas nao e negativo — usa o segundo principio como copy: "Ou voce ganha, ou voce aprende — cada derrota e um degrau." A doutrina torna os empty states momentos de reafirmacao cultural, nao lacunas de conteudo.

### 7.3 Mentalidade Competitiva — Linguagem Visual

A interface nunca e casual. Tonalidade escura absoluta — sem tons pasteis, sem gradientes suaves, sem ilustracoes fofinhas ou cartoon. Tipografia pesada em Cinzel para titulos — a mesma fonte que evoca monumentos, epigrafe de bronze, permanencia. Vermelho e branco em contraste alto — nao paleta confortavel. O usuario que abre o FormulaDota sente imediatamente: "isso e um ambiente serio". Esta nao e uma escolha estetica — e uma declaracao de posicao cultural.

### 7.4 Os 14 Principios em Loading Screens

Cada loading screen exibe um dos 14 principios em rotacao aleatoria. O principio aparece em Cinzel 32px no centro da tela, sobre o background cinematografico, durante os segundos de carregamento. O usuario que joga 10 vezes por semana vai encontrar cada principio multiplas vezes por mes — sem nunca ter sido forcado a ler um documento. A doutrina e absorvida pela exposicao repetida em contexto de alta atencao (loading = pausa involuntaria).

O array de principios e mantido em `src/lib/doctrine/principles.ts` como constante tipada. Cada principio tem: `id`, `short` (para loading screen), `full` (para tela de aceite) e `uiContext` (onde pode aparecer alem de loading: empty states, onboarding, etc.).

### 7.5 Accountability Visual — Badges de Conduta

O sistema progressivo (advertencia, suspensao, banimento) tem expressao visual no perfil. Um badge de conduta aparece no perfil de qualquer usuario — "Conduta Exemplar" em verde se sem ocorrencias, "Em Avaliacao" em amarelo se com advertencia ativa, "Suspenso" em vermelho se com suspensao. O sistema nao esconde o status de comportamento. A transparencia e parte da cultura: o FormulaDota nao tem comportamento privado entre o jogador e o admin — o status e publico para todos os membros.

### 7.6 Comunidade como Sistema Vivo — Presenca Coletiva

O counter de jogadores online no header nao e decoracao — e a materializacao do principio "FORMULADOTA e comunidade". O usuario nunca abre o hub e ve um espaco vazio e silencioso. Ha sempre presenca de outros: "12 jogadores online agora", "3 em fila", "5 em partida". Este dado e atualizado em tempo real. A sensacao de comunidade viva e construida pixel a pixel, numero a numero, dot de presenca a dot de presenca — nao por texto que diz "somos uma comunidade".

---

## Apendice: Vocabulario Tecnico

Termos usados neste documento com definicao precisa para o contexto do FormulaDota:

**Atmosfericidade** — qualidade de uma interface que cria sensacao de profundidade, temperatura e vida atraves de camadas de background, particles, vinheta e video. O usuario se sente dentro de um espaco, nao olhando para uma tela.

**Layering (Estratificacao)** — pratica de atribuir profundidade Z explicita a cada elemento da interface atraves de tokens de z-index nomeados, criando hierarquia tridimensional percebida.

**Motion Signature** — conjunto de caracteristicas de animacao que identificam um produto: velocidades tipicas, curvas de easing predominantes, uso de spring physics vs. tweens lineares, presenca ou ausencia de sons acoplados.

**Sound Coupling** — principio de que toda acao critica deve ter feedback simultaneamente visual e sonoro. Feedback apenas visual ou apenas sonoro e incompleto em game clients AAA.

**Vibecoding** — pratica de aceitar os defaults gerados por ferramentas de AI sem curadoria critica. Produce resultados estatisticamente medios — o que parece "correto" para a maioria dos casos mas nao e correto para nenhum produto especifico. Contraindicated em todo o FormulaDota.

**Hierarquia Cinematografica** — aplicacao da regra 60-30-10 a layout de interface: um elemento comanda 60% da atencao visual, o segundo 30%, tudo o restante compartilha os 10% finais.

**Token de Design** — variavel CSS com nome semantico que armazena um valor de design (cor, tamanho, duracao de animacao, nivel de z-index). Tokens permitem consistencia e mudancas globais sem refactor de componentes individuais.

**AAA Game Client** — software de jogo produzido por estudio de primeiro ou segundo nível (Valve, Riot, Blizzard, Grinding Gear Games) com foco em experiencia de usuario de nivel cinematografico. O FormulaDota aspira a esta categoria como benchmark de qualidade, nao como descricao de orcamento de producao.

---

*Documento: VISUAL_PHILOSOPHY.md*
*Projeto: FormulaDota — Hub Dota 2 BR*
*Milestone: V2.5 Design Foundations*
*Versao: 1.0 — 2026-05-23*
*Proximo documento: UX_PRINCIPLES.md*
