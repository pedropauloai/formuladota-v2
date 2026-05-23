# Feature Research — UX Patterns de Game Clients AAA

**Domain:** Game client / plataforma competitiva (FORMULADOTA — HUB Dota 2 BR)
**Researched:** 2026-05-23
**Confidence:** HIGH (padrões verificados em múltiplas fontes oficiais e análises de produto)

---

## Contexto FormulaDota

FORMULADOTA não é SaaS. É um **game client web** — o que significa que cada decisão de UX deve ser avaliada contra a régua de: "isso parece Riot Client ou parece produto de startup?". O usuário é um jogador Dota 2 brasileiro, acostumado a interfaces de Dota 2, Steam, Discord e possivelmente FACEIT. Sua tolerância para UX de web app genérico é zero.

A doutrina cultural do FORMULADOTA (14 princípios, sistema progressivo, "a culpa nunca é do outro") exige que a interface reforce accountability, foco e presença — não casual browsing. A UX precisa ser **cirúrgica**: cada elemento que aparece tem propósito, cada ação é clara, o sistema parece vivo mesmo quando o jogador está sozinho na página.

---

## Feature Landscape

### TABLE STAKES — Obrigatório pra parecer AAA

Features que um jogador de Dota 2 / CS2 / FACEIT **espera encontrar**. Ausência = produto parece amador.

| Feature | Por que é esperado | Complexidade | Notas de implementação FormulaDota |
|---------|-------------------|--------------|-------------------------------------|
| **Background vivo na tela principal** | Dota 2 usa hero frontpage `.vpk` com hero idle 3D em loop. Steam usa arte de jogo animada. Uma tela estática com fundo preto sinaliza "landing page", não "client". | MEDIUM | Implementar via `<HeroVideo />` já especificado em B5. Video idle de hero Dota 2 do CDN Steam como backdrop da main view. |
| **Indicador de status/presença na tela** | Discord (dot verde/amarelo/vermelho), FACEIT (online counter no hub), Steam (friends online). O jogador precisa sentir que há vida na plataforma mesmo antes de entrar na fila. | MEDIUM | Contador "N jogadores online agora" via realtime Supabase, exibido no header ou hero section. Dot de presença no perfil. |
| **Ação principal centralizada e hierárquica** | O botão "Play" do Dota 2 é enorme, central e com glow pulsante. O "Find Match" do FACEIT domina o viewport. Sem ação primária clara, o jogador não sabe o que fazer primeiro. | LOW | CTA "Entrar na Fila" deve ser o elemento de maior peso visual na home autenticada. Sem competição visual com CTAs secundários. |
| **Estados do botão primário diferenciados** | Enabled / Disabled / Loading / In-Queue / Match-Found — cada estado com visual distinto. Dota 2 muda o botão Play pra "Buscando... 0:32" com pulse de cor diferente. CS2 muda pra "Aceitando..." com timer. | MEDIUM | `<QueueButton>` component com 5 estados: idle, queuing (timer), match-found (flash green), accepting (countdown), disabled (sem assinatura ativa). |
| **Rank / badge proeminente no perfil** | CS2 mostra rank badge grande no perfil. Dota 2 mostra badge no canto esquerdo do menu principal. FACEIT coloca skill level como segundo elemento mais visível depois do avatar. Esconder o rank = ofender o jogador competitivo. | LOW | Badge tier (Herald→Immortal) com stars deve ser o terceiro elemento mais visível no perfil, depois do avatar e do username. |
| **Timer de fila visível e persistente** | Dota 2 mostra "Buscando... 0:32" no menu principal, não esconde em painel lateral. FACEIT mostra contador no topo da página. Se o player navega para outra seção durante a fila, o timer precisa persistir. | HIGH | Header fixo com queue pill: "[verde pulse] Buscando... 2:14" — visível em qualquer rota enquanto player está na fila. |
| **Confirmação de ação com som + visual** | Games usam feedback acoplado (sound + visual simultaneamente). Click em botão → som seco de metal. Match found → flash + stinger sonoro. Apenas visual ou apenas som é incompleto. | MEDIUM | Definir conjunto de 4-6 sons UI básicos: hover, click, confirm, error, queue-found, match-start. Coupling obrigatório — nunca visual sem som, nunca som sem visual. |
| **Empty states com personalidade** | "Nenhuma partida encontrada" genérico quebra imersão. PoE usa arte contextual. Diablo IV usa silhueta do personagem. O empty state é oportunidade de reforçar a identidade. | LOW | Empty states usam ícone de herói + copy no tom da doutrina ("Sua primeira partida está esperando"). Zero textos "no data found". |
| **Progress indicator não-genérico em loading** | Spinner HTML padrão = landing page. Game clients usam barra de progresso com arte contextual, rotação de dicas (WoW, Battle.net), ou animações que parecem parte do mundo. | MEDIUM | Loading screens com tip de doutrina rotativo ("A culpa nunca é do outro — Princípio 1 da Fórmula") + barra animada no estilo Dota. |
| **Perfil público rico** | Dota 2 Profile Showcase: hero portrait grande, badges de relics, win rate, matches. CS2: service medals visíveis para todos. FACEIT: skill level, winrate, K/D, últimas partidas. Perfil que parece LinkedIn mata a identidade gamer. | HIGH | `/perfil/[steamid]` com: hero portrait em destaque, tier badge proeminente, stats da season, histórico de partidas, identidades Discord + Steam linkadas. |
| **Navegação sem hamburger menu** | Dota 2 usa top bar com tabs horizontais. FACEIT 2.0 usa sidebar com ícones + labels visíveis. Riot Client usa tabs de jogo no topo. Hamburger mobile-first é incompatível com game client feel. | LOW | Sidebar ou top nav com tabs visíveis. Mobile: tabs colapsam para ícones (não hamburger). Máximo 6 itens de navegação visíveis. |

---

### DIFFERENTIATORS — Eleva a sensação de premium

Features que não são esperadas mas elevam o FORMULADOTA acima do meta-liga.ggarena.pro e GamersClub. Escolher 3-4 pra implementar.

| Feature | Proposta de valor | Complexidade | Notas FormulaDota |
|---------|-------------------|--------------|-------------------|
| **Doutrina integrada à UX de onboarding** | Riot e Blizzard têm Terms of Service generics. FORMULADOTA tem 14 princípios vivos que fazem parte da identidade. Nenhuma plataforma usa o código de conduta como ritual de entrada — é diferencial único. Aceite doutrinário com apresentação cinematográfica (não modal legal). | HIGH | Onboarding pós-Discord OAuth: tela fullscreen preta com scroll de princípios, um por um, com tipografia Cinzel grande. Usuário digita "ACEITO" (não checkbox). Ritual, não burocracia. |
| **Sound stinger de entrada** | Dota 2 tem logo sound no boot. Riot Client tem jingle de abertura. Battle.net tem música ambiente. FORMULADOTA poderia ter um "FORMULADOTA" — stinger de 1-2s que toca quando a página carrega (com respeito ao opt-out). Nenhuma plataforma web BR de gaming faz isso. | MEDIUM | Stinger de logo ao entrar no client (não em cada refresh). `sessionStorage` flag pra não repetir. Opt-out no perfil. |
| **Queue counter com "jogando agora" breakdown** | FACEIT 2.0 introduziu player counter que inclui jogadores em partida ativa. Discord mostra "N pessoas jogando Dota 2". FORMULADOTA pode mostrar breakdown: "3 em fila · 8 em partida · 12 online". Contexto social cria FOMO positivo e sensação de comunidade viva. | MEDIUM | Realtime via Supabase subscriptions. Header pill: "N em fila · M em partida". Atualiza sem refresh. |
| **Hero video contextual por seção** | Valorant usa agent art na seção do agente. Dota 2 usa hero background na página de detalhes. FORMULADOTA pode usar hero idle video como backdrop contextual quando usuário vê stats de um hero específico no perfil. | MEDIUM | `<HeroVideo heroSlug="..." />` já especificado em B5. Ativar em: perfil (top hero do player), partida detail (heróis jogados), queue accept screen (hero aleatório como atmosfera). |
| **Presence ring no avatar** | Discord tem dot de status. Steam tem estado de jogo. Uma alternativa cinematográfica: anel colorido ao redor do avatar (pulsante se em partida, estático se online, off se offline). Mais imersivo que dot. | LOW | Avatar com ring: vermelho pulsante = em partida, vermelho fixo = online, cinza = offline. CSS animation com `box-shadow` e `@keyframes`. |
| **Match accept screen cinematográfica** | Dota 2 tem tela fullscreen de "Partida Encontrada" com timer de 35s e som urgente. CS2 tem tela verde com countdown. FORMULADOTA pode ter algo similar: fullscreen escuro, FORMULADOTA em Cinzel, "PARTIDA ENCONTRADA", timer pulsante vermelho, stinger sonoro. | HIGH | Trigger via realtime Supabase quando lobby é formado. `<MatchAcceptModal>` fullscreen com countdown 30s. Não aceitar = volta à fila. |
| **Tip de doutrina no empty/loading state** | Nenhuma plataforma gaming usa os próprios princípios de conduta como conteúdo de loading. "A culpa nunca é do outro" como frase de loading reinforça identidade e educa sem ser pedante. | LOW | Array de 14 frincípios rotacionados aleatoriamente em loading states e empty states. Tom: imperativo e direto, não motivacional genérico. |

---

### ANTI-FEATURES — Explicitamente proibido

Features que parecem boas mas destroem o feel de AAA game client. Documentadas com razão específica.

| Anti-Feature | Por que parece boa | Por que destrói feel AAA | Alternativa FORMULADOTA |
|--------------|-------------------|--------------------------|------------------------|
| **Toast notification estilo SaaS** | Feedback imediato, posição padrão (bottom-right), auto-dismiss. Familiar de React apps. | Toasts de Tailwind/shadcn `<Sonner>` out-of-box têm visual de dashboard corporativo. Jogadores de Dota 2 associam esse padrão com Jira, não com games. Riot e Blizzard usam banners imersivos ou stingers visuais contextuais. | Banner imersivo no topo da view (não floating), acoplado com som. Ou stinger inline no elemento (ex: badge anima quando conquista é desbloqueada). |
| **Hamburger menu mobile-first** | Economiza espaço, familiar em apps mobile, collapsible. | Nenhum game client sério usa hamburger como navegação principal. É signo de "site mobile" — quebra a percepção de software premium. Dota 2, Steam, FACEIT, Discord: todos têm navegação sempre-visível. | Sidebar com ícones + labels em desktop. Em mobile: tab bar inferior com 4-5 ícones (como Discord mobile — nunca hamburger). |
| **Breadcrumb navigation** | Orientação hierárquica, familiar em e-commerce/CMS. | Breadcrumb é UX de site de conteúdo, não de aplicação. Game clients não mostram onde você está via trilha de texto — usam estado ativo na navegação (tab highlightada, sidebar item selecionado). Breadcrumb sinaliza "blog" ou "loja online". | Tab/sidebar item com estado `active` (accent color + underline ou background pill). Título de seção grande no topo do conteúdo. |
| **Modal genérico de confirmação** | Bloqueia ação acidental, familiar (window.confirm modernizado). | Modais shadcn/Radix out-of-box têm visual neutro de UI de software. Para ações críticas em game clients (aceitar partida, confirmar saque), o visual precisa ser contextual e pesado — não um card branco com dois botões. | Para ações críticas: modal fullscreen escura, tipografia grande, countdown sonoro. Para confirmações menores: inline estado visual (botão muda de cor + texto). |
| **Pagination numerada** | Navegar entre páginas 1/2/3, familiar em tabelas. | Pagination é UX de Google Results ou tabela de admin. Plataformas gaming usam infinite scroll (FACEIT), "Load more" com count (Discord), ou scroll horizontal de cards (Steam). | Infinite scroll para histórico de partidas. "Carregar mais N partidas" para listas longas. Scroll horizontal de cards para seções de destaque. |
| **Avatar pequeno + campos como lista** | Perfil compacto, eficiente em espaço, familiar em redes sociais. | Perfil tipo LinkedIn não comunica identidade gamer. CS2 usa hero art como background de perfil. Dota 2 usa hero portrait gigante na showcase. FACEIT coloca skill level como elemento proeminente. Identidade de jogador é visual e hierárquica. | Hero portrait ocupando 40%+ do espaço de perfil. Rank badge como segundo elemento mais lido. Stats numerais grandes. Nome e Discord secondary. |
| **Spinner genérico (Tailwind animate-spin)** | Fácil de implementar, semântico (loading = spinner). | Spinner de CSS out-of-box tem zero personalidade. É o loading de um form de cadastro, não de um game client. Battle.net usa barra customizada. Dota 2 usa animação própria. Mesmo PoE tem loading screen com arte. | Barra de progresso animada com cor da brand (vermelho). Ou animação de ícone do FORMULADOTA pulsando. Mínimo: tipografia grande "Carregando..." com fade em loop, nunca spinner de ícone rotativo. |
| **Notificação apenas visual sem som** | Mais simples de implementar, sem preocupação com som. | AAA games tratam feedback de UI como sistema acoplado visual+som. Match found sem stinger sonoro = impacto zero. FACEIT tem som de ping quando partida é encontrada. Dota 2 tem stinger de "match found". O som é o que cria urgência e chama o jogador de volta. | Todo evento crítico (match found, fila cancela, conquista) DEVE ter som acoplado. Sons de hover e click em elementos primários. Opt-out disponível mas não é o default. |
| **"Nenhum dado encontrado" genérico** | Simples, honesto, semântico. | Empty state sem personalidade quebra a imersão. O jogador sai do "estado de flow" do game client e lembra que está numa web app. Riot, Blizzard e Steam todos têm empty states com arte contextual e copy na voz do produto. | Empty states com: ícone de hero Dota (silhueta), copy na voz da doutrina FORMULADOTA, CTA claro. Nunca texto plano genérico. |
| **Texto de erro genérico ("Algo deu errado")** | Mensagem segura e não-técnica. | Impessoal e quebre o tom. Game clients têm copy de erro contextual e frequentemente com tom levemente dramático/humorístico que mantém o jogador na atmosfera. | Erros têm copy específico e no tom da doutrina: "A partida não pôde ser criada — tente novamente" em vez de "Erro 500". Som de erro acoplado (tom dissonante curto). |

---

## Feature Dependencies (Fases Futuras)

```
[Presença realtime]
    └──requires──> [Supabase realtime subscriptions]
                       └──requires──> [Schema: profiles.is_online, lobbies.status]

[Queue timer persistente no header]
    └──requires──> [Queue state global (Context/Zustand)]
                       └──requires──> [Lobby/queue schema — Phase 5]

[Match Accept Screen cinematográfica]
    └──requires──> [Bot Steam cria lobby — Phase 5]
                   └──requires──> [Realtime notification do match]

[Hero video contextual por seção]
    └──requires──> [HeroVideo component — B5 (atual)]
    └──enhances──> [Perfil público — H5.4]

[Sound stinger de entrada]
    └──requires──> [Sound system primitives — V2.5 F4]
    └──enhances──> [Onboarding doutrina — F1.5 existente]

[Presence ring no avatar]
    └──requires──> [Supabase realtime: is_in_match, is_online]
                       └──requires──> [Lobby schema — Phase 5]

[Tip de doutrina em loading/empty]
    └──requires──> [Array dos 14 princípios em código]
    └──enhances──> [Todos os states de loading da plataforma]
```

### Notas de dependência

- **Queue timer persistente**: requer estado de fila global gerenciado fora de componentes de página. Precisa de Context ou store (Zustand) com cleanup. Phase 5.
- **Match Accept Screen**: o evento que dispara é o bot Steam criando o lobby. Sem Phase 5 (H3), essa feature não existe. Mas o componente pode ser construído como "modo demo" antes.
- **Presença realtime**: Supabase Realtime via `channels` e `postgres_changes`. Tem custo de conexões — medir concurrent users antes de escalar.
- **Sound system**: requer que o Motion/Sound System (V2.5 F4) entregue os primitivos antes de qualquer componente consumir sons. Ordem: F4 → F5 (componentes).

---

## MVP Definition para V2.5 Design Foundations

### Implementar na V2.5 (Foundation)

Estes são os padrões que devem ser **documentados e codificados como primitivos** nesta milestone, mesmo que alguns componentes consumidores só existam em phases futuras.

- [x] **Background vivo (hero video)** — componente `<HeroVideo>` já especificado em B5, implementar agora
- [x] **Hierarquia de CTA** — documentar e implementar `<Button>` com variantes `primary / secondary / tertiary / danger` + todos os estados
- [x] **Sound system primitivo** — 6 sons UI básicos + hook `useSound()` pra coupling visual+sound
- [x] **Motion primitives** — definir easing curves, durações, e padrões de transição que todos componentes usam
- [x] **Presence dot / ring** — componente `<PresenceDot>` reutilizável (estático por ora, realtime na Phase 5)
- [x] **Empty state component** — `<EmptyState icon art copy cta />` com personality
- [x] **Loading pattern** — `<LoadingScreen tip? />` com tip rotativo de doutrina, nunca spinner genérico
- [x] **QueueCard/MatchCard structure** — layout e estados documentados mesmo sem backend

### Adicionar após V2.5 (Phase 5+)

- [ ] Queue timer no header (requer queue schema + realtime)
- [ ] Match Accept Screen cinematográfica (requer bot Steam)
- [ ] Presence realtime (requer lobby schema + Supabase channels)
- [ ] Queue counter breakdown "X em fila · Y em partida" (requer realtime)

### Deferir para V3+

- [ ] Sound stinger de entrada pra sessão (requer validação com usuários — pode ser intrusivo)
- [ ] Rich presence Discord SDK (requer Discord Game SDK — custo e complexidade altos)
- [ ] Perfil hero showcase interativo (requer Stratz GraphQL Phase 7)

---

## Feature Prioritization Matrix

| Feature | Valor pra Jogador | Custo de Implementação | Prioridade |
|---------|-------------------|------------------------|------------|
| Hierarquia de CTA clara (Play button) | HIGH | LOW | P1 |
| Navegação sem hamburger | HIGH | LOW | P1 |
| Background vivo (hero video) | HIGH | LOW (já codificado B5) | P1 |
| Empty states com personalidade | HIGH | LOW | P1 |
| Loading pattern não-genérico | HIGH | LOW | P1 |
| Rank badge proeminente no perfil | HIGH | MEDIUM | P1 |
| Sound feedback acoplado | HIGH | MEDIUM | P1 |
| Presence dot/ring no avatar | MEDIUM | LOW | P2 |
| Queue timer persistente no header | HIGH | HIGH (requer Phase 5) | P2 |
| Tip de doutrina em loading/empty | MEDIUM | LOW | P2 |
| Match Accept Screen cinematográfica | HIGH | HIGH (requer Phase 5) | P2 |
| Queue counter breakdown | MEDIUM | MEDIUM (requer realtime) | P2 |
| Sound stinger de entrada | MEDIUM | MEDIUM | P3 |
| Hero video contextual por seção | MEDIUM | LOW (infraestrutura pronta) | P2 |
| Onboarding doutrinário cinematográfico | HIGH | HIGH | P2 |

---

## Análise Comparativa por Categoria

### 1. Onboarding & Entry

| Client | Padrão | Aplicável ao FORMULADOTA? |
|--------|--------|--------------------------|
| Dota 2 client | Logo Valve + logo Dota 2 animado → hero background + música ambiente → tela principal. Sem "press any key". | Logo FORMULADOTA com fade-in em Cinzel + stinger de áudio (1s). Web = sem press any key. |
| Battle.net launcher | Cards por jogo com hero art, taglines, patch notes. Música de fundo baixa. Loading com hero art + dica. | Inspiração para cards de "próximas partidas" e loading com tip rotativo. |
| Riot Client (2026) | Tabs de jogo no topo, login screen com art animada por jogo, friend presence visible desde a home. | Tabs de seção no topo ou sidebar. Art animada (hero video) na tela de entrada. |
| FACEIT 2.0 | Login direto via Steam, hub page com player counter, recent matches. Zero splash screen. | Login via Discord = direto. Hub page com counter de online. Prioridade à ação, não ao espetáculo. |
| Discord | Tela de login minimal, depois direto ao servidor/DMs. | Login Discord = tela de aceite de doutrina pós-auth. Não há splash. |

**Síntese para FORMULADOTA**: Sem splash screen obrigatória (web = usuário já sabe para onde vai). Mas primeiro acesso = tela de doutrina cinematográfica (única, memorável, não skip). Sessions subsequentes = direto ao hub com hero video de fundo + presença de outros jogadores visível.

---

### 2. Navigation & Hierarchy

| Client | Padrão | Lição |
|--------|--------|-------|
| Dota 2 | Top bar horizontal: Play / Heroes / Items / Learn / Custom Games / Arcade / Watch. Ícone de perfil à direita. | Top bar funciona para 6-7 seções. Ordem: ação principal primeiro (Play). |
| Steam | Sidebar esquerda sempre visível: Biblioteca, Loja, Comunidade, etc. + mini-barra superior para conta/notificações. | Sidebar é mais adequada que top bar quando há muitas seções. |
| Riot Client | Tabs de jogos no topo da janela. Dentro de cada jogo: navegação lateral do jogo específico. | Hierarquia de dois níveis: game switcher (topo) + navegação interna (lateral). Não aplicável ao FORMULADOTA (não tem múltiplos "jogos"). |
| FACEIT 2.0 | Sidebar com ícones grandes + labels. Seções: Play / Stats / Leaderboard / Profile / Store. | Sidebar com ícones + labels é o padrão mais legível para game hubs web. |
| Discord | Sidebar de servidores (ícones apenas) + sidebar de canais (labels). | Dois níveis de sidebar. Comunidade pode futuramente ter "servidores/temporadas" como primeiro nível. |
| meta-liga.ggarena.pro | Top nav com: Home / Criar Lobby / Amigos / Ranking / Perfil / Minhas Partidas. Auth-only. | Referência mais próxima ao FORMULADOTA. Top nav simples, 6 itens. |

**Recomendação FORMULADOTA**: Top bar horizontal para desktop (6 itens máximo): **[Fila] [Ranking] [Partidas] [Perfil] [Doutrina] [Admin?]**. Em mobile: tab bar inferior com ícones (sem hamburger). Item de "Fila" sempre primeiro e com destaque visual.

---

### 3. Action Surfaces (CTAs)

| Client | Botão primário | Características |
|--------|---------------|-----------------|
| Dota 2 | "Play" — grande, central, fundo escuro com borda luminosa, glow pulsante verde quando modo ranqueado ativo | Ocupa área generosa. Pulse animation ativo. Muda para "Buscando... 0:32" durante queue. |
| CS2 | "Find a Match" — button grande e centralizado, estado changed para "Cancel" durante busca | Simplified, sem decoração excessiva. Timer inline no próprio botão. |
| FACEIT | "PLAY" tab proeminente na sidebar + botão de confirmação de modo | Hub-first: configura modo antes de jogar, ação final é o botão grande. |
| Battle.net | "Play" por jogo nos cards — button verde, hover com brilho. Download vs Play state. | Contexto de card: botão é ação do card, não da página inteira. |
| Dota 2 (queue) | Durante queue: glow vermelho pulsante no header area + "Buscando... 0:32" + "Cancelar" | Timer visível, state change claro, cancelar disponível sempre. |

**Regra FormulaDota**: Hierarquia máxima de três níveis:
- **Primário**: vermelho sólido (`--color-brand-red`), full-width contextual, glow animation quando idle/disponível
- **Secundário**: borda vermelha, fundo transparente — para ações de suporte
- **Terciário / Ghost**: texto sem borda — para ações de baixo impacto (cancelar, ver detalhes)
- **Danger**: vermelho escuro com ícone warning — banir, remover
- **Disabled**: 40% opacity, cursor not-allowed, SEM hover effect

---

### 4. Live State & Presence

| Client | Padrão | Detalhe técnico |
|--------|--------|-----------------|
| Dota 2 (queue) | "Buscando... 0:32" no topo da tela principal, pulse de cor (verde → amarelo → verde) | Timer up-counting, pulse animation, estado persiste ao navegar |
| FACEIT (hub) | Player counter "N jogadores em fila" substituído por "N jogadores online incluindo em partida" (FACEIT 2.0) | Badge na tab de Matches com live matches count |
| Discord | Dot colorido: verde (online), amarelo (idle), vermelho (dnd), cinza (offline). Mobile indicator separado. | Obrigatório: green/yellow/red/gray. Símbolos: circle/moon/minus/offline. Customizável em games mas core colors fixos. |
| CS2 | "Conectando..." → "Esperando jogadores..." → tela de loading | Não há counter no menu principal de partidas ativas |
| meta-liga.ggarena.pro | WebSocket para estado de amigos online, lobbies em tempo real | WebSocket separado do REST API |

**Padrões obrigatórios FORMULADOTA**:
1. Presence dot com 3 estados: vermelho fixo (online), vermelho pulsante (em partida/fila), cinza (offline)
2. Counter global "X jogadores agora" no header ou hero area — Supabase Realtime
3. Queue timer persistente no header: pill com cor pulsante + "Buscando · 2:14"
4. Estado de lobby: "5/10 jogadores no lobby" com slots visuais (círculos)

---

### 5. Feedback & Confirmation

| Client | Padrão | Exemplo específico |
|--------|--------|-------------------|
| Dota 2 | Sound stingers + visual flash. Match found = fullscreen overlay + som urgente + timer 35s. Hero selected = som de herói. | Feedback coupling: visual + áudio sempre juntos |
| CS2 | Match found = tela verde + countdown + som de alerta. Aceitar = animação de confirmação. | Sem toast. Fullscreen para eventos críticos. |
| FACEIT | Notificação no browser + som de ping + badge na tab | Combinação de browser notification + in-app |
| Riot Client | Match encontrada = overlay com anúncio do agente + music stinger | Contextual ao agente selecionado |
| Discord | Banners de notificação no topo (não toast bottom-right). Sons por tipo de evento. | Banners in-app, não floating toasts |

**Hierarquia de feedback FORMULADOTA**:
- **Crítico** (match found, kick, ban): fullscreen modal + stinger sonoro urgente
- **Importante** (compra confirmada, fila cancelada): banner no topo da view + som de confirmação
- **Informativo** (XP ganho, badge desbloqueado): inline animation no elemento + som suave
- **Erro**: inline no elemento + som dissonante curto (nunca toast isolado)
- **Proibido**: `<Sonner>` toast out-of-box sem customização de visual e sem som

---

### 6. Loading & Transition

| Client | Padrão | Lição |
|--------|--------|-------|
| Battle.net | Loading com hero art de fundo + rotação de dicas (WoW: lore tips, HotS: gameplay tips) | Dicas contextualmente úteis, não genéricas. Arte contextual ao jogo/zona. |
| Dota 2 | "Loading Match" com hero portraits dos 10 jogadores + barra de progresso | Loading é social: você vê os heróis dos outros enquanto espera |
| PoE (Path of Exile) | Arte da zona destino + nome da área + citação de lore | Contextual à ação: loading pra onde você vai mostrar onde você vai |
| Diablo IV | Personagem do player em silhueta sobre fundo dark + loading bar minimal | Character-centric: você vê seu próprio personagem carregando |
| WoW (World of Warcraft) | Arte de zona + dica rotativa no rodapé + barra de progresso | Padrão clássico eficaz. Dicas acessíveis depois no jornal do jogo. |

**Regras de loading FORMULADOTA**:
1. NUNCA spinner CSS padrão (`animate-spin` com border)
2. Sempre: barra de progresso animada na cor brand (vermelho) + tip rotativa de doutrina
3. Hero video como backdrop em loading de partida
4. Transições de rota: fade in/out em 150ms com `motion/react` (não flash brusco)
5. Loading states de componentes: skeleton screens (não spinners) com forma contextual

---

### 7. Profile & Identity

| Client | Padrão | Elementos-chave |
|--------|--------|----------------|
| Dota 2 Profile | Hero Showcase: hero portrait 3D grande, Plus Hero Badge (relic nível), relics no banner. Stats: wins, matches, MMR, commends. | Hero visual > stats. Conquistas são decoração, não lista. |
| CS2 Profile | Service medals visíveis, rank badge proeminente, recent matches grid, kill stats. | Rank é identidade. Medals são trophy wall. |
| FACEIT Profile | Avatar, username, skill level (1-10) como badge grande, winrate, K/D, recent matches list, elo history chart. | Competência técnica é o dado mais importante. |
| Steam Profile | Background art (cosmético), avatar com frame, badges de jogo, screenshots, hours played. | Customização é central. Identity como expressão pessoal. |
| Diablo IV | Personagem em renderização grande na tela principal. Clan tag. Achievement count. | Character-first: você é seu personagem. |

**Perfil FORMULADOTA** (`/perfil/[steamid]` ou `/me`):
- **40% da área**: hero portrait do top hero do jogador (via Stratz) ou hero neutro FORMULADOTA se sem dados
- **Elemento 2 mais visível**: tier badge (Herald→Immortal) + estrelas + MMR interno
- **Elemento 3**: Discord + Steam avatars linkados (identidade dupla)
- **Stats row**: partidas jogadas, win rate da season, MMR atual
- **Below fold**: histórico de partidas cards, histórico de seasons
- **Proibido**: foto de perfil Discord pequena como elemento principal. Avatar ≤ 48px = anti-padrão.

---

### 8. Social & Community

| Client | Padrão | Detalhe |
|--------|--------|---------|
| Discord | Friends list com presence dots + rich presence (jogo + estado). Party invites via DM direto. Voice indicators (anel de voz) | Presença é a feature central. Rich presence transforma o status em narrativa ("Jogando Dota 2 · 2:14 em partida"). |
| Dota 2 client | Steam friends integrado. Ver quem está jogando. Convite direto ao lobby via Steam. "Frequentemente joga com" na sidebar do perfil. | Integração profunda com Steam network. Lobby invite via Steam overlay. |
| FACEIT 2.0 | Player counter no hub (inclui em partida). Friends list com disponibilidade. Match history compartilhável. | Web-first: sem client nativo. Notificações browser. |
| meta-liga.ggarena.pro | Lista de amigos via WebSocket. Conversas. Status de partida. | Implementação própria sem Steam overlay. |
| Steam | Friends list omnipresente (overlay). Voice chat. Group invites. | O padrão gold de social gaming. Peso de infraestrutura alto. |

**Social FORMULADOTA (faseado)**:
- **V2.5 / Phase agora**: Sem social features de friends list (infraestrutura não existe). Mostrar online counter global apenas.
- **Phase 5-6**: Após lobby schema: "X jogadores no hub agora" com lista de quem está em fila/partida (sem chat)
- **Phase V3+**: Friends list real, convite de fila, "frequentemente joga com" baseado em co-matches históricos

**Discord como bridge social**: Em vez de construir social features do zero, FORMULADOTA usa o servidor Discord oficial como layer social. In-game state FORMULADOTA pode atualizar Discord Rich Presence futuramente (Phase V3+). Usuários que querem social → Discord. A plataforma foca em lobby e ranking, não em chat.

---

## Alinhamento com Cultura FORMULADOTA

Os padrões de UX descritos acima devem reforçar — não contradizer — os 14 princípios da doutrina:

| Princípio Doutrinário | Implicação de UX |
|----------------------|-----------------|
| "A culpa nunca é do outro" | Erros de sistema usam copy na primeira pessoa: "Não conseguimos criar sua partida" (não "Você errou"). Feedback de erro é construtivo. |
| "Ou você ganha, ou você aprende" | Empty state de histórico de derrotas não é negativo: copy "Cada derrota é um degrau" com link pra análise de partida. |
| Accountability | Ações críticas (entrar na fila, aceitar partida) têm confirmação visual pesada — o jogador não pode dizer "não vi". |
| Anti-toxicidade | Sistema 3-strikes: badge visual no perfil ("Conduta Exemplar" vs "Em Avaliação"). Não esconder o status de comportamento. |
| "Mentalidade competitiva" | A interface nunca é casual. Dark mode absoluto, tipografia pesada (Cinzel), sem tons pastéis, sem ilustrações fofinhas. |
| "FORMULADOTA é comunidade" | Online counter visível, partidas em andamento visíveis — o jogador nunca se sente sozinho no hub, mesmo antes de entrar na fila. |

---

## Fontes

**Riot Games / League / Valorant:**
- [Under the Hood of League Client Hextech UI](https://www.riotgames.com/en/news/under-hood-league-client%E2%80%99s-hextech-ui) — arquitetura navigation, Web Components, state machines
- [Preview the Future of VALORANT Interface](https://playvalorant.com/en-us/news/game-updates/preview-the-future-of-valorant-s-interface/) — redesign 2022-2024: agent art, lobby, pre-match screen
- [Riot Client FAQ](https://support-valorant.riotgames.com/hc/en-us/articles/4406274296339-Riot-Client-FAQ) — unified launcher 2026, tab switching
- [ProtoPie: Revolutionizing Game UX at Riot](https://www.protopie.io/blog/revolutionizing-game-ux-ui-design-riot-games) — design process e motion

**FACEIT:**
- [FACEIT 2.0 Changes](https://egamersworld.com/blog/new-faceit-20-what-has-changed-and-how-it-will-imp-Pt4sIQ1yUq) — rebrand, queue counter com "players in match", React rebuild
- [FACEIT January 2025 Patch Notes](https://www.faceit.com/en/news/january-2025-patchnotes) — player counter update que inclui jogadores em partida ativa

**Discord:**
- [Discord Status & Rich Presence Design Guidelines](https://docs.discord.com/developers/discord-social-sdk/design-guidelines/status-rich-presence) — especificações de cores (green/yellow/red/gray), símbolos, cross-game consistency

**Game Design — Loading, Feedback, Sound:**
- [Game Design Rules: Loading Screens](https://www.gamedeveloper.com/design/game-design-rules-loading-screens) — 6 regras de design para loading screens AAA
- [Best Practices for Game UI Sounds](https://sfxengine.com/blog/best-practices-for-game-ui-sounds) — 8 categorias de som UI, tabela AAA vs SaaS, coupling visual+sound
- [Game Sound Designer Guide to Button Interactions](https://uxdesign.cc/a-game-sound-designers-guide-to-button-interactions-6837dd5cc977) — hover/click/confirm/error sounds, attention hierarchy

**Competitor — meta-liga.ggarena.pro:**
- `.planning/research/integrations.md` (análise interna via Playwright) — navegação auth, WebSocket, player counter, ranking cards

**Dota 2 / CS2 / Steam:**
- [Dota 2 Profile Showcase Customization](https://hawk.live/posts/profile-showcase-customization-dota-2) — hero portrait, Plus Hero Badge, relics
- [CS2 Profile Ranks](https://blast.tv/article/what-are-cs2-profile-ranks-and-how-do-they-work) — rank display, service medals, scoreboard visibility
- [Steam Community — Dota 2 main menu backgrounds](https://steamcommunity.com/app/570/discussions/0/2245553353037696152/) — hero frontpage vpk, ambient background system

**GamersClub Case Study:**
- [Gamers Club UX/UI Estudo de Caso](https://danieldemonertr.medium.com/gamers-club-estudo-de-caso-de-ux-ui-74c1d70842c3) — dark UI, dark backgrounds, social integration no perfil

---

*Feature research para: FORMULADOTA — UX Patterns de Game Clients AAA*
*Researched: 2026-05-23*
*Confidence overall: HIGH — padrões verificados em múltiplos clients reais e documentação oficial*
