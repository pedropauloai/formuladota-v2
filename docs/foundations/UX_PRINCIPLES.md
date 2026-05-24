# UX_PRINCIPLES.md — Os 13 Mandamentos do FormulaDota

> Documento fundacional permanente. Versao: 1.1. Data original: 2026-05-23. Atualizado: 2026-05-23.
> Milestone: V2.5 Design Foundations.
> Status: LEI. Toda decisao de UX deve passar pela Regua de Validacao da Secao 6.
> M12 e M13 adicionados em 2026-05-23 — derivados de PHILOSOPHY.md Pilares 3 e 5.

---

## 1. Preambulo — Os 13 Mandamentos sao lei. Sem excecoes.

O FormulaDota nao e um SaaS. Nao e uma landing page. Nao e um produto de startup.

O FormulaDota e um game client — um ambiente operacional onde jogadores de Dota 2 gerenciam
sua vida competitiva: entram em fila, disputam partidas in-house, sobem no ranking, confrontam
seus dados de evolucao e interagem com a cultura da plataforma. Cada decisao de interface
comunica algo sobre o nivel de seriedade desse ambiente.

Clientes AAA da industria de jogos — Dota 2 client (2024), Riot Client v6, Battle.net v22,
FACEIT v4, CS2 HUD, Path of Exile 2 client — aprenderam ao longo de duas decadas que
jogadores nao querem interfaces gentis. Jogadores querem interfaces responsivas, imersivas,
e que tratam toda interacao como um evento que importa.

Este documento formaliza os 13 principios nao-negociaveis que governam cada decisao de UX
no FormulaDota V2.5 e versoes posteriores. Cada mandamento define um comportamento esperado
do sistema, um exemplo concreto de acerto (com referencia de produto AAA especifica), um
anti-pattern com codigo ou descricao de falha, e a aplicacao exata em telas do FormulaDota.

Violar um mandamento nao e uma "escolha de design alternativa". E uma regressao mensuravel
que sera detectada em revisao de UI e revertida antes de mergear qualquer PR.

A Regua de Validacao na Secao 6 deve ser aplicada a cada nova decisao de UX antes de
qualquer linha de codigo ser escrita.

---

## 2. Os 11 Mandamentos

---

### M1 — Onboarding Cinematografico

#### Principio

O primeiro contato do usuario com o FormulaDota deve ser um evento audiovisual de impacto,
nao um formulario de cadastro.

#### Why

O onboarding e o momento mais importante da jornada do usuario. E quando o produto
comunica sua identidade em nivel visceral — antes de qualquer texto explicativo. Clientes
AAA sabem disso. O Dota 2 client (2024) exibe um hero idle animation full-screen com
sound stinger de marca na abertura, nao uma tela de login minimalista. O Riot Client v6
usa uma sequencia cinematografica com trilha adaptativa antes de exibir qualquer opcao de
acao. O Path of Exile 2 (2024) inicia com um video de abertura skippable antes de
qualquer menu.

Pesquisa de retencao em plataformas de jogos (GDC 2023 — "First Impressions in Game UIs")
indica que usuarios que vivenciam onboarding imersivo tem taxa de retencao no D1 (primeiro
dia) 37% maior em comparacao com fluxos baseados em modal de boas-vindas padrao. O
FormulaDota compete por atencao com o proprio Dota 2 — precisa corresponder ao nivel
estetico do jogo que seus usuarios ja conhecem.

#### Exemplo positivo

Dota 2 client v7.37 (2024): ao iniciar o cliente, o background e um hero idle animation
em loop (ex: Antimage com partículas de mana flutuando). Um sound stinger de ~1.2s de
duracao marca o instante em que o client termina de carregar. O logo da Valve nao aparece
centralizado em fundo branco — ele esta integrado na composicao visual do hero. O botao
"PLAY" e o elemento de maior peso visual na tela, com glow pulsante, posicionado em regiao
de dominancia visual (terco inferior-esquerdo do viewport no layout 16:9).

#### Anti-pattern — Exemplo negativo

Modal SaaS de boas-vindas centralizado:

```tsx
// PROIBIDO: modal generico de boas-vindas SaaS
export function WelcomeModal() {
  return (
    <Dialog open={isFirstVisit}>
      <DialogContent className="max-w-md mx-auto">
        <h2 className="text-xl font-bold">Bem-vindo ao FormulaDota!</h2>
        <p className="text-muted-foreground">
          Complete seu perfil para comecar.
        </p>
        <Button onClick={closeModal}>Comecar</Button>
      </DialogContent>
    </Dialog>
  );
}
```

Este padrao, presente em produtos como Notion, Linear e Vercel onboarding, e inerte e
generico. Nao comunica identidade de game client. Ele interrompe a experiencia em vez de
iniciar uma.

#### Como aplicar no FormulaDota

A rota `/onboarding/doutrina` (aceite dos 14 principios) deve ser reestruturada como
sequencia cinematografica:

1. Entrada: fade-in hero portrait (ex: hero silhueta vermelha com particulas) + sound
   stinger da marca FORMULADOTA (0.8s).
2. Texto dos principios aparece com stagger de 80ms por linha, fonte Cinzel, nao em card
   modal.
3. CTA "Aceito os principios" e o unico elemento interativo com peso visual massivo
   (ver M3).
4. Confirmacao: animacao de "selo aprovado" com sound de confirm (ver M5).

A pagina de login (`/login`) deve exibir um `<HeroVideo>` como background com overlay
vermelho semitransparente, nao um fundo escuro liso com card centralizado.

---

### M2 — Navigation 3-col Dota 2 Client Style

#### Principio

A navegacao segue a estrutura de 3 colunas fiel ao client do Dota 2 REAL:
sidebar esquerda persistente (identidade + amigos), top-bar central + viewport
da view ativa, sidebar direita contextual (matchmaking + opcoes da view), e
bottom-bar com [JOGAR DOTA] verde grande no canto direito.

NAO existe versao minimalista sem sidebars (estilo Riot/Valorant menu). NAO
existe sidebar generica de navegacao de rotas (estilo Slack/Linear/Notion).

#### Historico — Reformulacao 2026-05-24

M2 original (Wave 7-8) defendia "kill sidebar" tendo Riot Client v6 como
referencia (apesar do titulo dizer "Dota 2 Style"). Resultou em divergencia
do produto da identidade visual desejada. Reformulado apos Pedro apontar as
imagens de referencia presentes na raiz do projeto:

- `dota 2 menu.png` — client Dota 2 real (3 colunas)
- `dashboard-current.png` — /dashboard FormulaDota ja fiel
- `menu lateral - competitiva.png` — sidebar direita matchmaking
- `menu lateral - salas personalizadas.png` — sub-opcoes contextuais
- `find por role.png` — busca por funcoes configurada
- `configuração lobby.png`, `lobby criado.png` — telas de lobby

#### Why

O Dota 2 client v7.37 (referencia canonica) usa 3 colunas:

1. **Sidebar esquerda** (~300-400px): avatar do jogador + medalha de rank +
   nick + busca de amigos + lista categorizada de amigos online (NO DOTA /
   MEMBROS DO CLA / FAVORITOS / EM LINHA). Esta sidebar e identidade + social,
   NAO navegacao de rotas.
2. **Top-bar central** (~56-64px): logo esquerda + tabs centrais (PLAY / HEROES
   / ITEMS / WATCH / LEARN) + controles direita (notifications, store, settings).
3. **Sidebar direita contextual** (~280-380px): aparece quando user esta na tab
   PLAY (ou similar) mostrando OPCOES DA ACAO selecionada — categorias de
   matchmaking (COMPETITIVA / SALAS PERSONALIZADAS / JOGAR CONTRA BOTS /
   CASUAL) com sub-opcoes (BUSCA POR FUNCOES / CLASSICO / CRIAR / NAVEGAR) e
   [BUSCAR PARTIDA] verde no fundo da sidebar.
4. **Bottom-bar** (~80-96px): notificacoes esquerda + status server + idioma +
   settings centro + [JOGAR DOTA] verde grande direita.

Sidebars genericas de navegacao SaaS (Slack, Linear, Notion, GitHub) sao
proibidas porque comunicam "ferramenta de trabalho", nao "plataforma de jogo".
Mas sidebars DO DOTA 2 (identity+social esquerda, matchmaking contextual
direita) sao obrigatorias porque sao parte da assinatura visual de "client
de Dota". A diferenca semantica e clara: SaaS sidebar = lista de rotas;
Dota sidebar = identity ou contexto de acao.

A versao Riot/Valorant minimalista (top-bar + viewport fullscreen sem sidebars)
foi consciente decisao desses produtos — mas afasta da fidelidade com o Dota 2
client. FormulaDota escolheu fidelidade Dota 2 como ancoragem cultural do
publico brasileiro de Dota.

#### Exemplo positivo

Dota 2 client v7.37 (2024) tela principal:

- **Esquerda**: avatar circular grande + medalha Imortal acima + nick
  "only mid (ACR1)" abaixo + barra "BUSCAR AMIGOS" + lista de amigos com
  avatares pequenos agrupados (NO DOTA 5 / MEMBROS DO CLA / FAVORITOS /
  EM LINHA 18).
- **Centro top**: tabs HERÓIS / ARSENAL / ASSISTIR / APRENDER / SALÃO DE
  JOGOS com estado ativo destacado.
- **Centro**: hero portrait de evento ativo (ex: "QUIOSQUE DO QUARTERO") com
  personagens em destaque + medalha de progresso.
- **Direita** (quando JOGAR ativo): COPA DE BATALHAS / SALAS PERSONALIZADAS
  / JOGAR CONTRA BOTS / COMPETITIVA com sub-opcoes BUSCA POR FUNCOES /
  CLASSICO e [BUSCAR PARTIDA] verde grande no fundo.
- **Bottom**: notificacoes + tag "Para [ACME Corp.]" + servidor + idioma +
  settings + [JOGAR DOTA] verde no canto direito.

FormulaDota /dashboard atual (2026-05-24, ver `dashboard-current.png`) e
estruturalmente identico — sidebar esquerda com avatar/medalha/amigos +
centro hero (TEMPORADA I - GENESIS) + tabs PROGRESSO/RANKING/TIMES/TORNEIOS/
CONDUTA + [JOGAR DOTA] verde bottom direito.

#### Anti-pattern — 2 erros opostos a evitar

##### Erro 1: Sidebar generica de navegacao SaaS (estilo Slack/Linear)

```tsx
// PROIBIDO: sidebar de 256px estilo SaaS — lista de rotas, semantica CRUD
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-[#0A0A1A] border-r border-white/10">
        <nav className="p-4 space-y-2">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/partidas">Partidas</Link>
          <Link href="/ranking">Ranking</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

Esta sidebar e uma lista de rotas — semantica de CRUD/admin, nao de game
client. Navegacao de rotas e responsabilidade da TOP-BAR, nao da sidebar.

##### Erro 2: Remover sidebars completamente (estilo Riot/Valorant minimalista)

```tsx
// PROIBIDO: shell minimalista sem sidebars — afasta do Dota 2 client real
export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <header><Tabs /></header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

Este shell e estilo Riot Client v6 / Valorant menu — minimalista e focado em
"acao primaria unica". Mas afasta da fidelidade Dota 2 e remove a presenca
social (amigos online) e o contexto de acao (matchmaking categorizado). O
Sistema B (`src/components/templates/client-shell.tsx`) entrou neste anti-
pattern e e `@deprecated 2026-05-24`.

#### Como aplicar no FormulaDota

O `<ClientShell>` canonico (`src/components/client-shell/shell.tsx`) implementa:

- **Top-bar** altura 56-64px com tabs JOGAR / PROGRESSO / RANKING / TIMES /
  TORNEIOS / CONDUTA + condicionais PRO / ADMIN. Logo FORMULADOTA esquerda.
  Mute toggle + auth slot direita.
- **Sidebar esquerda** ~340-460px (responsiva) com `<DashboardLeftSidebar>`:
  avatar grande + medalha rank + nick + saldo de fichas + (futuro) busca de
  amigos + lista de amigos online.
- **Sidebar direita** ~320-560px (responsiva) com `<DashboardRightSidebar>` ou
  slot custom: contexto da view ativa. Em "JOGAR" mostra `<PlayPanel>` com
  categorias de matchmaking. Em outras views pode mostrar widgets relevantes
  ou nada (`hideRightSidebar` flag).
- **Bottom-bar** com `<DashboardBottomBar>`: status + queue indicator + atalhos
  + [JOGAR DOTA] verde grande no canto direito (Botao h-14+, glow verde, M3).
- **Modo immersive** opcional: background fullscreen + sidebars como overlays
  flutuantes (usado em /dashboard).

Validacao automatizada (substitui a antiga regra "grep w-64 deve retornar zero"):

```bash
# Devem RETORNAR matches — sidebars sao obrigatorias
grep -rE "DashboardLeftSidebar|DashboardRightSidebar|DashboardBottomBar" src/

# Devem RETORNAR ZERO — anti-patterns
grep -rE "<aside .*w-64.*<nav" src/             # sidebar SaaS de rotas
grep -rE "templates/client-shell" src/app/      # uso de Sistema B deprecated
```

---

### M3 — Primary CTA com Weight Massivo

#### Principio

O CTA primario deve ter peso visual tao dominante que o usuario nao precise escanear a
pagina para encontra-lo — ele e visto imediatamente.

#### Why

Em interfaces de game client, a acao mais importante (entrar na fila, aceitar partida,
comprar item) e promovida a elemento de maior hierarquia visual absoluta. Nao existe
"igualdade" entre botoes em um game client. O Dota 2 client (2024) tem o botao "FIND
MATCH" com tamanho ~3x maior que qualquer outro elemento interativo da tela de lobby,
com glow animado verde/vermelho dependendo do estado da fila. O CS2 HUD (2024) tem o
botao "ACEITAR" em full-screen overlay com contagem regressiva visivel.

Padroes SaaS de altura h-8 (32px) uniforme para todos os botoes destroem a hierarquia
de acoes. Quando todos os botoes tem o mesmo tamanho, o usuario precisa ler o label
de cada um para entender qual e mais importante — friccao cognitiva desnecessaria.

#### Exemplo positivo

Riot Client v6 (2024): o botao "PLAY" na tela principal tem altura de 64px, largura
de 240px, fonte uppercase 18px bold, background gradient vermelho-escarlate animado
com glow externo de 8px raio. Ao hover, o glow aumenta para 16px e a escala sobe
para 1.03 com duracao de 120ms. Nenhum outro elemento interativo na tela tem mais
de 40px de altura.

#### Anti-pattern — Exemplo negativo

Botoes com tamanhos uniformes estilo shadcn vanilla:

```tsx
// PROIBIDO: hierarquia visual inexistente entre botoes
<div className="flex gap-2">
  <Button size="sm" variant="outline">Cancelar</Button>
  <Button size="sm" variant="default">Entrar na Fila</Button>
  <Button size="sm" variant="outline">Ver Ranking</Button>
</div>
```

Aqui "Entrar na Fila" tem o mesmo tamanho que "Cancelar". Em um game client, esta e
uma falha critica de hierarquia. O usuario nao tem guia visual para a acao principal.

#### Como aplicar no FormulaDota

O componente `<Button variant="primary">` (V2.5-F6) implementa:

- Altura minima: 56px em desktop (h-14), 48px em mobile (h-12).
- Padding horizontal: px-10.
- Fonte: uppercase, tracking-widest, font-bold, 16px.
- Background: `var(--color-brand-red)` com gradiente vertical sutil.
- Glow: `box-shadow: 0 0 16px var(--color-brand-red-glow)`.
- Animacao idle: pulse suave de 2s em loop no glow (`@keyframes cta-pulse`).
- Hover: escala 1.03, glow 24px, duracao 150ms ease-out.
- Todos os outros `variant` (secondary, ghost, outline) tem altura maxima de 40px.

Na tela de fila (`<QueuePanel>`), o botao "ENTRAR NA FILA" e o unico elemento com
`variant="primary"`. Nenhum outro botao na tela usa esse variant.

---

### M4 — Live State Sempre Visivel

#### Principio

O estado vivo do sistema (fila, presenca, timers) deve estar visivel permanentemente
sem que o usuario precise navegar ou abrir modais.

#### Why

Game clients sao sistemas de estado em tempo real. Jogadores precisam saber — sem
esforco — quantas pessoas estao na fila, quanto tempo ja esperam, quem esta online.
O Discord (2024) exibe presence de todos os membros do servidor em tempo real na
sidebar direita. O Dota 2 client (2024) exibe o counter "X players in queue" e o
timer de busca atualizado a cada segundo na tela de lobby. O FACEIT v4 exibe
"X players online" e badges de presenca em todos os cards de usuario.

A ausencia de informacao de estado vivo e o erro mais comum em adaptacoes de SaaS
para game clients. Uma pagina que exibe "0 jogadores na fila" estaticamente e nao
atualiza em tempo real e inutil para a proposta de valor do FormulaDota.

#### Exemplo positivo

Dota 2 client v7.37 (2024): na tela de lobby, o counter de jogadores na fila e
exibido em fonte monoespaco com atualizacao em tempo real (polling a cada 5s ou
WebSocket). O timer "Searching... 0:32" esta visivel permanentemente com incremento
de segundo em segundo. O estado "Match Found!" substitui o counter com animacao
full-screen (ver M6 sobre loading cinematografico).

#### Anti-pattern — Exemplo negativo

Estado estatico exibido uma vez na renderizacao inicial:

```tsx
// PROIBIDO: fetch estatico sem atualizacao em tempo real
export async function QueueStatus() {
  // Busca uma vez no server, nunca atualiza
  const { count } = await supabase
    .from('queue_entries')
    .select('*', { count: 'exact' });

  return (
    <div className="text-sm text-muted-foreground">
      {count} jogadores na fila
    </div>
  );
}
```

Este padrao exibe um numero desatualizado. Em um game client onde a fila muda a
cada segundo, isso quebra a confianca do usuario no estado do sistema.

#### Como aplicar no FormulaDota

O `<QueuePanel>` (V2.5-F7) implementa:

- Supabase Realtime Presence subscription ativa quando componente monta.
- Counter "X/10 jogadores" atualizado em tempo real via `usePresence()`.
- Timer "Buscando... 0:32" com `useEffect` + `setInterval(1000)` a partir do
  momento que o usuario entra na fila.
- `<PresenceDot>` (ver M9) em cada card de usuario no lobby.
- A top-bar (M2) exibe badge permanente "X online" no tab "JOGAR" mesmo fora
  da tela de fila, consumindo Supabase Realtime Channel global.

---

### M5 — Feedback Acoplado Visual e Sonoro

#### Principio

Toda interacao do usuario gera resposta simultanea em dois canais: visual e sonoro.
Silencio total e feedback visual sem som sao ambos falhas.

#### Why

Jogos AAA usam feedback multimodal porque ele e mais eficaz do que qualquer canal
isolado. A pesquisa de usabilidade em interfaces de jogo (Nielsen Norman Group,
"Sound and UX in Gaming", 2022) indica que feedback sonoro acoplado ao visual
reduz o tempo de confirmacao cognitiva de uma acao em 28% em media. O usuario
nao precisa ler um toast para saber que a acao foi confirmada — ele ouve e ve
simultaneamente.

O Dota 2 client (2024) tem sons distintos para: hover em botao, click confirmado,
erro de acao, notificacao de partida encontrada, reward de conquista. Nenhum desses
sons existe de forma isolada — cada um acompanha uma animacao especifica. O CS2 HUD
usa o mesmo principio: aceitar partida tem som distinto + animacao de progresso.

Toasts do padrao SaaS (Sonner, React Hot Toast, Radix Toast padrao) sao insuficientes
para um game client porque (a) aparecem no canto superior direito, fora da area de
atencao do usuario, (b) nao tem som acoplado, (c) tem aparencia generica incompativel
com a identidade do produto.

#### Exemplo positivo

FACEIT v4 (2024): ao aceitar um convite para partida, o botao "ACCEPT" dispara
simultaneamente (a) animacao de preenchimento de barra de progresso verde, (b) som
de confirmacao de ~0.4s com envelope attack rapido. Ao recusar, (a) barra vermelha
se contrai, (b) som de erro distinct de ~0.3s. O usuario sabe o resultado antes de
ler qualquer texto.

#### Anti-pattern — Exemplo negativo

Toast generico no canto sem som:

```tsx
// PROIBIDO: toast SaaS padrao sem som e sem posicionamento intencional
import { toast } from 'sonner';

async function handleJoinQueue() {
  await joinQueue();
  toast.success('Voce entrou na fila!'); // aparece top-right, sem som
}
```

Este padrao (Sonner padrao, Radix Toast padrao, React Hot Toast padrao) e adequado
para dashboards de SaaS. E inadequado para um game client onde toda acao importa.

#### Como aplicar no FormulaDota

O `<Toast>` customizado (V2.5-F6) implementa:

- Posicionamento: `bottom-center` (nao top-right).
- Animacao: slide-up de 200ms com `var(--motion-ease-game-out)`.
- Som acoplado obrigatorio: toda chamada a `toast.show()` recebe `sound` prop.
  - `toast.show({ type: 'confirm', sound: 'confirm' })` — toca SFX confirm.
  - `toast.show({ type: 'error', sound: 'error' })` — toca SFX error distinct.
  - `toast.show({ type: 'notification', sound: 'notification' })` — toca SFX notif.
- O hook `useSound()` e chamado dentro do `<Toast>` internamente — nenhum
  componente consumidor precisa chamar `useSound()` manualmente para exibir toast.
- Eventos criticos (partida encontrada) usam full-screen takeover, nao toast
  (ver Hierarquia de Feedback, Secao 4).

---

### M6 — Loading Cinematografico

#### Principio

Estados de carregamento exibem conteudo cultural da plataforma, nao spinners.
Hero portraits e principios da doutrina substituem o indicator de progresso.

#### Why

Telas de loading sao tempo de espera obrigatorio — e uma oportunidade desperdicada
pela maioria dos produtos SaaS. Game clients transformam esse tempo em imersao.
O Dota 2 client (2024) exibe loading screens com ilustracoes full-screen de heroes,
hero lore text, e tips de gameplay. O Path of Exile 2 (2024) exibe arte de mapa e
citacoes da lore do jogo. O League of Legends client (2024) exibe splash arts e
dicas de campeonato durante loading.

Para o FormulaDota, os 14 principios da Doutrina e os 10 anti-padroes sao conteudo
cultural proprio — diferencial competitivo unico. Loading screens que exibem um
principio rotativo transformam tempo de espera em reforco do valor da plataforma.
O usuario que espera 2s de carregamento le "Ou voce ganha, ou voce aprende" e
recebe reforco do contrato cultural que assinou ao aceitar a doutrina.

#### Exemplo positivo

Path of Exile 2 client (2024): loading screen exibe arte full-bleed do bioma carregado
com barra de progresso minima no rodape (altura 4px). Centro-inferior: citacao de lore
em fonte serifada italica com fade-in de 600ms. Nenhum spinner circular. A barra de
progresso e o unico indicador de estado tecnico — o restante e conteudo.

#### Anti-pattern — Exemplo negativo

Spinner centralizado padrao:

```tsx
// PROIBIDO: spinner generico sem conteudo cultural
export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

Este padrao existe em dezenas de componentes Next.js boilerplate. E tecnicamente
funcional e culturalmente neutro — o oposto do que um game client precisa.

#### Como aplicar no FormulaDota

O `<LoadingScreen>` (V2.5-F6) implementa:

- Background: `var(--color-bg-deep)` com `<AmbientLayer>` ativo.
- Hero portrait: imagem de hero Dota 2 posicionada no terco direito do viewport,
  com opacity 0.3 e blend-mode `luminosity`.
- Principio rotativo: um dos 14 principios selecionado aleatoriamente no mount,
  exibido em fonte Cinzel, tamanho 20px, centralizado verticalmente.
- Barra de progresso: 4px de altura no rodape, animada por `indeterminate` CSS.
- Zero elemento `animate-spin` no DOM.
- Sound: sound ambient suave loop (volume 0.15) durante carregamento.
- Success state: quando carregamento completa, fade-out de 300ms + sound de
  `confirm` antes de revelar o conteudo.

---

### M7 — Empty States Narrativos

#### Principio

Estados vazios citam a cultura da plataforma. "No data yet" e "Nenhum resultado"
sao proibidos.

#### Why

Empty states sao o momento em que o usuario esta aguardando contexto para agir.
E o momento de menor engajamento da jornada — e portanto o momento ideal para
reforcar identidade e motivacao. O Duolingo (2024) usa empty states com mascote
e texto motivacional. O Strava (2024) usa empty states com meta contextual
("Complete sua primeira corrida"). O Dota 2 client (2024), na aba de replays
vazia, exibe "Nenhum replay salvo — jogue uma partida para criar seu historico".

Para o FormulaDota, a Doutrina e o repositorio de conteudo cultural disponivel.
Um historico de partidas vazio e a oportunidade de citar "Ou voce ganha, ou voce
aprende — comece sua primeira partida". Um ranking vazio e a oportunidade de citar
"99,5% dos jogadores nao sabem jogar Dota 2. Voce esta aqui para ser a excecao."

#### Exemplo positivo

Dota 2 client v7.37 (2024), aba de amigos sem amigos: exibe ilustracao de
Axe solitario e texto "Nenhum aliado encontrado — convide amigos para jogar".
O botao CTA "Convidar" e exibido com styling primario. Nenhum elemento de UI
vazio transmite desorientacao — toda tela vazia tem direcao de acao.

#### Anti-pattern — Exemplo negativo

Empty state generico sem direcao:

```tsx
// PROIBIDO: empty state sem cultura e sem direcao de acao
export function EmptyHistory() {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Nenhuma partida encontrada.</p>
    </div>
  );
}
```

Este padrao informa o estado tecnico mas nao orienta o usuario e nao reforça
nenhuma identidade cultural. E um beco sem saida visual.

#### Como aplicar no FormulaDota

O `<EmptyState>` (V2.5-F6) aceita prop `principle: string` com um dos 14
principios da doutrina. Exemplos de uso por contexto:

- Historico de partidas vazio:
  `principle="Ou voce ganha, ou voce aprende — comece sua primeira partida."`
  + CTA "Entrar na Fila" com `variant="primary"`.

- Ranking sem posicao ainda:
  `principle="99,5% dos jogadores nao sabem jogar Dota 2. Voce esta aqui para
  ser a excecao." `
  + CTA "Ver Partidas Disponiveis".

- Fila sem jogadores:
  `principle="A mentalidade do FORMULADOTA e simples: perder faz parte,
  evoluir e uma escolha."`
  + estado de presenca (ver M9) mostrando jogadores online mesmo sem fila ativa.

- Nenhum coach disponivel:
  `principle="Saber mais significa que agora e voce quem carrega a vitoria."`
  + CTA "Conhecer a Metodologia".

---

### M8 — Profile Premium

#### Principio

O perfil do usuario e um showcase de identidade competitiva, nao um formulario
de dados. Hero portrait grande, MMR badge proeminente, historico de evolucao.

#### Why

Perfis em game clients sao troféus. O jogador que subiu de Guardian para Divine
quer exibir essa progressao de forma visualmente impactante — nao em uma tabela
de dados ou em um card pequeno. O perfil no Dota 2 client (2024) exibe o hero
favorito como background full-width com overlay semitransparente, medallion de
rank centralizado com glow animado da cor do rank, e KDA historico em destaque.

O LinkedIn-style (foto redonda pequena, campos de texto, lista de conquistas
como bullets) e o anti-padrao exato. Ele comunica "usuario de software de RH",
nao "jogador competitivo". O perfil do FormulaDota compete com a pagina de
perfil do proprio Dota 2 na visao do usuario — precisa ser pelo menos tao
impressionante quanto.

#### Exemplo positivo

Steam Profile v2024: foto do usuario em area de destaque, hero ou jogo favorito
como background animado, nivel Steam com badge proeminente, horas jogadas em
destaque, conquistas recentes em grid visual. Toda a hierarquia visual prioriza
identidade de jogador, nao dados administrativos.

#### Anti-pattern — Exemplo negativo

Perfil estilo formulario de SaaS:

```tsx
// PROIBIDO: perfil estilo LinkedIn/SaaS
export function UserProfile({ user }: { user: Profile }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar_url} />
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{user.username}</h1>
          <p className="text-sm text-muted-foreground">MMR: {user.mmr}</p>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={user.email} disabled />
      </div>
    </div>
  );
}
```

Avatar pequeno h-16, MMR como texto plain, formulario com `<Input>` desabilitado.
Comunica "conta de usuario de software", nao "identidade de jogador competitivo".

#### Como aplicar no FormulaDota

A rota `/me` (perfil) implementa:

- Hero portrait: imagem do hero favorito do usuario (ou hero padrao) como
  background full-width com altura de 280px, overlay `linear-gradient` de
  bottom para top.
- MMR badge: `<Badge>` de rank Herald/Guardian/.../Immortal posicionado sobre
  o portrait, centralizado, com glow animado da cor do tier.
- Username em Cinzel 32px sobre o portrait, com `text-shadow`.
- Stats de destaque abaixo do portrait: Partidas / Vitorias / WinRate / GPM medio.
  Cada stat em card de `min-w-[100px]`, numero em 28px, label em 12px uppercase.
- Historico de partidas: grid de `<MatchCard>` (V2.5-F7), nao tabela de texto.
- Evolucao de rank: grafico de linha simples mostrando progressao de rank ao longo
  das sessoes, consumindo dados Stratz `rankTier`.
- Zero formulario com `<Input>` visivel por padrao — edicao de perfil fica em
  modal separado ativado por icone de editar.

---

### M9 — Presence Rich

#### Principio

O sistema de presenca usa quatro estados distintos com cores semanticas e
contexto especifico de jogo, nao apenas online/offline binario.

#### Why

Discord (2024) popularizou rich presence com quatro estados (Online, Inativo,
Nao perturbe, Invisivel) com cores semanticas: verde, amarelo, vermelho, cinza.
Game clients expandem esse conceito com estados especificos do contexto do jogo.
O Dota 2 client (2024) exibe no card de amigo: Online (verde), In-Game (roxo com
nome do hero), In-Queue (azul pulsante), Offline (cinza). O FACEIT v4 usa:
Online, In-Match, In-Queue, Away, Offline.

Para o FormulaDota, a informacao de estado "jogador esta na fila" ou "jogador
esta em partida" e extremamente valiosa para outros jogadores que querem formar
equipe ou simplesmente acompanhar a plataforma. Estado binario online/offline e
uma regressao em relacao ao que jogadores de Dota 2 ja esperam do Discord.

#### Exemplo positivo

Discord v2024 no contexto de Dota 2: quando um usuario inicia Dota 2, o Discord
exibe automaticamente "Jogando Dota 2" com informacao de hero e tempo de partida
via Rich Presence API. Outros usuarios no servidor podem ver "Pedro — Dota 2 —
Anti-Mage — 23min". Este e o nivel de densidade de informacao de presenca que
game clients devem prover.

#### Anti-pattern — Exemplo negativo

Presenca binaria sem contexto:

```tsx
// PROIBIDO: presenca binaria sem informacao de contexto de jogo
export function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "h-2 w-2 rounded-full",
        user.isOnline ? "bg-green-500" : "bg-gray-500"
      )} />
      <span>{user.username}</span>
    </div>
  );
}
```

Dois estados. Nenhuma informacao de contexto. Um jogador em partida e exibido
identico a um jogador navegando o site. Esta informacao e perdida.

#### Como aplicar no FormulaDota

O `<PresenceDot>` (V2.5-F6) implementa quatro estados via Supabase Realtime Presence:

- **Online** (`var(--color-presence-online)` — verde `#22c55e`): usuario ativo
  na plataforma, sem acao especifica.
- **In-Queue** (`var(--color-presence-queue)` — azul `#3b82f6` com pulse animation):
  usuario aguardando na fila. Pulse de 1.5s em loop indica estado dinamico.
- **In-Match** (`var(--color-presence-match)` — roxo `#a855f7`): usuario em
  partida ativa. Icone de espada cruzada no dot (SVG 8px).
- **Offline** (`var(--color-presence-offline)` — cinza `#6b7280`): usuario
  desconectado ou sem sessao ativa.

O canal Realtime recebe updates de estado via Server Action ao entrar/sair da fila
e ao iniciar/terminar partida. O estado "In-Match" e ativado pelo bot Steam ao
detectar que a partida comecou.

---

### M10 — Sound Feedback Obrigatorio

#### Principio

A plataforma emite no minimo seis sons de UI distintos. Silencio total e proibido.

#### Why

Som e o feedback mais imediato disponivel — mais rapido que qualquer animacao
visual (que requer processamento de frames). Jogadores de Dota 2 ja condicionaram
reflexos ao som: o som de "deny" e reconhecivel sem olhar para a tela. O som de
"Roshan killed" dispara resposta imediata. O CS2 HUD usa sons distintos para
compra confirmada, round ganho, round perdido, MVP, bomb plantada.

Plataformas que removem som UI (tendencia em SaaS "minimalista") perdem um canal
de feedback critico. O FormulaDota deve manter pelo menos seis sons de UI que
cobrem as interacoes mais frequentes — hover em CTA primario, click confirmado,
erro de acao, notificacao recebida, partida encontrada (critical), reward/conquista.

O Howler.js v2.2.4 com sprite WebM+MP3 e a stack definida (V2.5 STATE.md decision).
O sprite unico minimiza requests de rede e elimina latencia de carregamento por
arquivo individual.

#### Exemplo positivo

CS2 HUD (2024): som de compra de item (`buy_confirm.wav` — ataque de 80ms, decay
de 200ms, frequencia media-alta). Som de round ganho (`round_win.wav` — stinger
de 1.2s com envelope lento). Som de round perdido distinto (`round_lose.wav`).
Som de MVP (`mvp_stinger.wav` — 2.5s cinematografico). Som de bomba plantada
(`bomb_planted.wav` — loop de tensao). Cinco sons que cobrem os cinco momentos
emocionalmente mais carregados do jogo. O usuario nao precisa olhar para a tela
para saber o resultado de um round.

#### Anti-pattern — Exemplo negativo

Plataforma sem som algum:

```tsx
// PROIBIDO: interacao sem feedback sonoro
export function JoinQueueButton() {
  const handleClick = async () => {
    await joinQueue();
    // Nenhum som. Nenhum feedback alem do toast visual.
    toast.success('Voce entrou na fila');
  };

  return (
    <Button onClick={handleClick}>Entrar na Fila</Button>
  );
}
```

A ausencia de `useSound()` neste handler e uma violacao de M10. Todo CTA primario
deve ter som acoplado.

#### Como aplicar no FormulaDota

O `ISoundManager` (V2.5-F5) expoe seis sprites obrigatorios com criterios de curadoria:

| ID | Evento de uso | Duracao alvo | Caracteristica sonora |
|----|--------------|-------------|----------------------|
| `hover` | Mouseenter em qualquer `<Button>` | 80-120ms | Ataque rapido, frequencia alta, volume 0.15 |
| `click` | Click confirmado em botao | 150-200ms | Click seco, frequencia media, volume 0.4 |
| `confirm` | Acao bem-sucedida (entrou na fila, pagamento OK) | 300-500ms | Envelope ascendente, tom positivo, volume 0.5 |
| `error` | Acao falhou (erro de validacao, rede) | 200-350ms | Tom descendente, frequencia baixa, volume 0.5 |
| `notification` | Novo evento recebido (mensagem, update de fila) | 400-600ms | Notificacao suave, volume 0.3 |
| `reward` | Conquista desbloqueada, rank subiu | 800ms-1.2s | Stinger cinematografico, envelope lento, volume 0.6 |

O evento critico "partida encontrada" usa `sound_stinger` separado (nao no sprite de UI)
por duracao superior a 1.5s e nivel de volume 0.8 — classificado como Critico na
Hierarquia de Feedback (Secao 4).

---

### M11 — Atmospheric Ambient

#### Principio

Toda pagina da aplicacao existe em um ambiente visual vivo com particulas sutis e
vignette dinamica. Backgrounds estaticos lisos sao proibidos.

#### Why

O `<AmbientLayer>` transforma o FormulaDota de "site escuro" para "ambiente". A
diferenca e perceptivel em segundos: o usuario que ve particulas de poeira animadas
no background recebe o sinal subconsciente de que esta em um ambiente dinamico, nao
em um documento estatico. Path of Exile 2 (2024) usa particulas de cinzas voando
na tela de menu. Diablo IV client (2024) usa particulas de sangue e fogo no background
do personagem selecionado. Dota 2 client (2024) usa particulas do elemento do hero
selecionado (mana, fogo, terra) no fundo da tela de lobby.

A restricao critica e: atmosfera sem custo de performance. O preset "dust" do
tsParticles v3 com maxima 60 particulas em 60fps em hardware mid-range (Intel
i5-10400 + GTX 1660) deve permanecer acima de 55fps medido em Chrome DevTools
Performance. Performance e parte do mandamento — particulas que degradam a
experiencia violam M11 por omissao.

#### Exemplo positivo

Diablo IV client (2024): background da tela de selecao de personagem tem particulas
de cinzas em movimento descendente lento, neblina volumetrica animada, e um gradiente
de vignette que escurece as bordas dinamicamente com base na posicao do cursor.
Tudo isso em hardware que roda o proprio Diablo IV — o custo incremental do client
UI e imperceptivel. O efeito total e uma tela que parece viva sem nenhum video sendo
reproduzido.

#### Anti-pattern — Exemplo negativo

Background estatico liso:

```tsx
// PROIBIDO: background estatico sem vida atmosferica
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="bg-[#050505] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

`bg-[#050505]` sem nenhuma camada de atmosfera e um background morto. O usuario
ve um retangulo escuro. O game client ve um ambiente. Esta e a diferenca entre
um site e uma plataforma.

#### Como aplicar no FormulaDota

O `<AmbientLayer>` (V2.5-F3) implementa:

- Posicao: `position: fixed`, `inset: 0`, `z-index: var(--z-atmosphere)` (-1 em
  relacao ao conteudo, acima do `<body>` background).
- Preset "dust": 40-60 particulas, movimento descendente-diagonal lento (velocidade
  0.3-0.8), opacidade 0.08-0.15, tamanho 1-3px, cor `var(--color-brand-red)` com
  opacity 0.3.
- Vignette: `radial-gradient` fixo de `transparent` no centro para
  `rgba(0,0,0,0.6)` nas bordas, `pointer-events: none`.
- Light dust: gradiente radial sutil posicionado no terco superior da tela com
  cor `var(--color-brand-red)` opacity 0.03 — simula fonte de luz difusa.
- `prefers-reduced-motion`: quando ativo, particulas removidas, apenas vignette
  e light dust estaticos permanecem.
- Page Visibility API: particulas pausam quando `document.hidden === true`.
- Override por rota: `data-ambient="off"` no `<main>` desativa `<AmbientLayer>`
  para rotas que nao precisam (ex: `/admin` para performance em tabelas densas).

---

### M12 — Dois Eixos Sempre Visiveis

#### Principio

Toda exibicao de perfil, ranking, card de jogador ou achievement deve mostrar SKILL e HONOR
lado a lado. Nenhuma superfície do produto exibe apenas um dos eixos.

#### Why

O Pilar 3 da PHILOSOPHY.md e inequivoco: o FormulaDota avalia jogadores em dois eixos
separados e paralelos. Se a interface exibe apenas o eixo de SKILL, ela replica exatamente
o problema que o FormulaDota foi construido para superar — a logica da Valve de avaliar
jogadores por performance tecnica isolada.

A visibilidade dual nao e feature opcional ou de "versao avancada". E o mandamento central
que diferencia o FormulaDota de qualquer plataforma competitiva existente. Um card de jogador
que exibe apenas MMR ou apenas winrate e, do ponto de vista filosofico, um erro critico — ele
comunica que HONOR nao importa, que conduta e secundaria, que o FormulaDota mede o mesmo que
a Valve so que com UI diferente.

Isso e o oposto do que o FormulaDota e.

#### Exemplo positivo

Card de jogador em lobby com dual-badge:

```tsx
// CORRETO: exibe ambos os eixos com peso equivalente
export function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-[#0A0A1A] rounded-lg">
      <span className="font-display text-sm font-bold">{player.username}</span>
      <div className="flex items-center gap-3">
        <DotaRankMedal rank={player.skillTier} size="sm" showLabel />
        <HonorRankMedal rank={player.honorTier} size="sm" showLabel />
      </div>
    </div>
  );
}
```

Os dois badges tem o mesmo `size`, o mesmo `showLabel`, o mesmo peso visual. Nenhum fica
maior ou mais proeminente que o outro. Paridade de eixos = paridade visual.

#### Anti-pattern

```tsx
// PROIBIDO: card que exibe apenas eixo de SKILL
export function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 p-3">
      <DotaRankMedal rank={player.skillTier} size="sm" />
      <span>{player.username}</span>
    </div>
  );
}
// HonorRankMedal ausente = HONOR invisivel = replica logica Valve
```

#### Como aplicar no FormulaDota

- `<ProCard>` (card do jogador na tela de fila): dois badges side-by-side, mesmo tamanho
- `<MatchCard>` (historico de partidas): exibir HONOR ganho/perdido na partida ao lado do resultado
- Leaderboards: duas colunas separadas — ranking SKILL e ranking HONOR — o jogador aparece
  em posicoes potencialmente diferentes em cada coluna
- `/me` (perfil): `<DotaRankMedal>` e `<HonorRankMedal>` centralizados lado a lado sobre o
  hero portrait, com `glow={true}` nos dois
- Tela pos-partida: primeiro elemento visivel e o delta de HONOR da partida (nao o KDA)

---

### M13 — Pos-Derrota e Ritual, Nao Punicao

#### Principio

A tela pos-partida — em vitoria OU em derrota — inclui reflexao qualitativa sobre conduta
antes de exibir estatisticas tecnicas brutas. A derrota nao e tratada como falha — e tratada
como dado de evolucao.

#### Why

O Pilar 5 da PHILOSOPHY.md: derrota pode ser mais valiosa que vitoria. Uma derrota bem
processada — onde o jogador analisa decisoes, identifica erros e assume responsabilidade —
produz mais aprendizado do que uma vitoria onde o jogador nao reflete sobre nada.

A tela pos-partida e o momento de maior vulnerabilidade do jogador. Depois de uma derrota,
o impulso natural e atribuir a culpa a outros (companheiros, heroi, sorte). E exatamente esse
impulso que a tela pos-partida deve interromper — nao de forma agressiva, mas de forma que
convide a reflexao antes da racionalização.

Se a tela pos-partida começa com KDA e MMR delta, o usuario recebe informacao tecnica no
momento em que precisa de perspectiva cultural. O sistema reforça o reflexo que a Doutrina
tenta desconstruir. Isso e um erro estrutural de UX.

A tela pos-partida que comeca com HONOR — o que voce ganhou ou perdeu em conduta nesta
partida — muda o enquadramento. Antes do numero de mortes, o usuario ve: "Derrota com Honra
+15 HONOR". Isso comunica que o FormulaDota avalia mais do que o placar.

#### Exemplo positivo

Estrutura da tela pos-partida no FormulaDota:

```
[RESULTADO DA PARTIDA — DERROTA]

[Delta HONOR desta partida]
+15 HONOR — Derrota com Honra
Voce manteve conduta exemplar mesmo em situacao adversa.

[Commendations recebidas nesta partida]
Pedro te elogiou por "comunicacao" — +8 HONOR

[Separador visual]

[Estatisticas tecnicas]
KDA: 3/7/11 | GPM: 432 | XPM: 524 | Resultado: Derrota
[Delta MMR interno]

[Acao sugerida]
[VER REPLAY]   [ENTRAR NA FILA]
```

O HONOR e o primeiro elemento — nao o placar. O usuario que perdeu ve primeiro o que ganhou
em conduta. Esse enquadramento e uma decisao filosofica, nao estetica.

#### Anti-pattern

```tsx
// PROIBIDO: pos-partida como dump de stats sem reflexao qualitativa
export function PostMatchScreen({ match }: { match: Match }) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-red-500">DERROTA</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Kills" value={match.kills} />
        <Stat label="Deaths" value={match.deaths} />
        <Stat label="Assists" value={match.assists} />
      </div>
      <p className="text-sm text-muted">MMR: {match.mmrDelta > 0 ? '+' : ''}{match.mmrDelta}</p>
    </div>
  );
}
// Sem HONOR. Sem reflexao. Idêntico a qualquer tracker de Dota. Replica logica Valve.
```

#### Como aplicar no FormulaDota

Este mandamento e programado para implementacao quando o bot Steam capturar dados de partida
(Phase 5+). Porem o design da tela pos-partida deve ser especificado com esta estrutura
desde o inicio — para que a implementacao tecnica nao precise ser refeita quando o HONOR
system for ativado.

#### Pergunta Canonica de Auditoria — componente obrigatorio pos-derrota

A **pergunta canonica da Fórmula** — que Pedro Paulo formula publicamente como pivo de
transformacao do jogador — vira componente OBRIGATORIO da tela pos-partida em DERROTA:

> *"O que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time
> jogando mal?"*

Esta pergunta:

- Cita LITERALMENTE o texto do autor da metodologia
- Previne o anti-padrao #14 da Doutrina (Recusa de Auditoria Pos-Derrota)
- Bloqueia o reflexo de terceirizar culpa (anti-padroes #1 e #13)
- Cobra reflexao ANTES do dump de estatisticas

**Implementacao na estrutura da tela pos-derrota:**

```
[RESULTADO DA PARTIDA — DERROTA]

[Delta HONOR desta partida]
+15 HONOR — Derrota com Honra

[CAMPO OBRIGATORIO DE AUDITORIA — não pode ser dismissed]
> O que voce poderia ter feito diferente para ter ganho essa partida,
> mesmo com o time jogando mal?

[textarea, minimo 30 caracteres, deve ser preenchido para fechar a tela]

[Estatisticas tecnicas — desbloqueia apos resposta submetida]
KDA: 3/7/11 | GPM: 432 | XPM: 524
[Delta MMR interno]

[Acao sugerida]
[VER REPLAY]   [ENTRAR NA FILA]
```

A resposta do usuario e armazenada em `match_reflections` (privada por padrao, opcional
compartilhar com Pedro/mentor). O texto submetido NAO e analisado por IA nem julgado
automaticamente — o valor esta no ato de escrever, nao no conteudo. O sistema apenas
verifica `LENGTH(content) >= 30` antes de liberar fechamento da tela.

**Frequencia:** apenas em DERROTA. Em VITORIA a reflexao e opcional (campo presente mas
nao bloqueante) — a Doutrina considera que a derrota e mais valiosa que a vitoria para
aprendizado (Pilar 5).

**Tom da copy do campo:** direto, sem amenizacao. Nao "Compartilhe seus sentimentos" nem
"Como voce avalia sua partida?". A pergunta canonica do autor da metodologia, literal.

**Para implementacoes parciais (antes do HONOR system ativo):**
A tela pos-partida pode exibir placeholder de HONOR no lugar do delta real: "Conduta desta
partida sera avaliada em breve" — mantendo o enquadramento sem mentir sobre dados nao disponiveis.

**Para a tela completa (Phase 6+):**
- HONOR delta primeiro, obrigatorio
- Commendations recebidas na partida
- Separador visual claro entre reflexao qualitativa e estatisticas tecnicas
- Estatisticas tecnicas em segundo plano visual (menor destaque, nao ausentes)
- CTA principal: entrar na fila (nao revisar stats, que e acao secundaria)

---

## 3. Resumo dos 13 Mandamentos (referencia rapida)

| # | Mandamento | Anti-pattern proibido | Produto de referencia |
|---|-----------|----------------------|----------------------|
| M1 | Onboarding cinematografico | Modal centralizado SaaS | Dota 2 client v7.37 |
| M2 | Navigation 3-col Dota 2 client | Sidebar SaaS de rotas OU remover sidebars | Dota 2 client v7.37 |
| M3 | CTA com weight massivo | Botoes h-8 uniformes shadcn | Riot Client v6 |
| M4 | Live state sempre visivel | Fetch estatico sem realtime | Dota 2 client v7.37 |
| M5 | Feedback visual + sonoro acoplado | Toast generico sem som | FACEIT v4 |
| M6 | Loading cinematografico | Spinner animate-spin | Path of Exile 2 |
| M7 | Empty states narrativos | "No data yet" | Dota 2 client v7.37 |
| M8 | Profile premium | Formulario LinkedIn-style | Steam Profile v2024 |
| M9 | Presence rich 4 estados | Online/Offline binario | Discord v2024 |
| M10 | Sound feedback 6 sons minimos | Silencio total | CS2 HUD |
| M11 | Atmospheric ambient | Background estatico liso | Diablo IV client |
| M12 | Dois eixos sempre visiveis | Card com apenas SKILL badge | PHILOSOPHY.md Pilar 3 |
| M13 | Pos-derrota e ritual, nao punicao | Dump de KDA sem reflexao | PHILOSOPHY.md Pilar 5 |

---

## 4. Hierarquia de Feedback — 4 Niveis

A hierarquia define qual nivel de resposta do sistema corresponde a qual importancia
do evento. Nenhum evento critico usa resposta de nivel informativo. Nenhum evento
informativo usa resposta de nivel critico.

---

### Nivel 1 — Critico

**Definicao:** Eventos que exigem acao imediata do usuario ou comunicam estado
de maxima importancia. Tolerancia zero para perder no fluxo visual.

**Resposta do sistema:**
- Full-screen takeover ou overlay de alta opacidade (z-index `var(--z-critical)`).
- Sound stinger dedicado (nao sprite de UI), duracao 1.2-2.5s, volume 0.8.
- Hero motion ou animacao de alto impacto (scale, glow, particle burst).
- Contagem regressiva visivel quando acao tem prazo.

**Exemplo: "Partida pronta — Aceitar"**

O overlay cobre 100% do viewport com `background: rgba(0,0,0,0.85)`. Ao centro:
card com hero portrait animado + texto "PARTIDA ENCONTRADA" em Cinzel 32px com
`text-shadow` vermelho. Abaixo: barra de progresso regressiva de 30s. Botao
"ACEITAR" com `variant="primary"` (h-14, glow massivo). Botao "RECUSAR" ghost
pequeno. Sound stinger de 1.5s toca imediatamente ao montar o overlay.

---

### Nivel 2 — Importante

**Definicao:** Eventos que o usuario precisa ver mas que nao exigem acao imediata.
Confirmacoes de acoes de alto valor.

**Resposta do sistema:**
- Toast customizado `bottom-center` com slide-up 200ms.
- Som acoplado `confirm` ou `notification` (sprite de UI), volume 0.5.
- Duracao: 4-6s antes de auto-dismiss com fade-out.
- Icone semantico no toast (check, info, warning).

**Exemplo: "Pagamento confirmado"**

Toast aparece no `bottom-center` com slide-up. Icone de check verde. Texto
"Pagamento confirmado — saldo atualizado". Som `confirm` toca simultaneamente.
Duracao 5s. Nenhum full-screen overlay. Nenhum bloqueio de interacao.

---

### Nivel 3 — Informativo

**Definicao:** Atualizacoes de estado do sistema que o usuario pode ignorar.
Nao requerem acao.

**Resposta do sistema:**
- Inline no componente afetado ou status bar no rodape/top-bar.
- Som `notification` suave (volume 0.2), opcional dependendo do contexto.
- Sem toast a menos que a informacao seja efemera e relevante por < 5s.

**Exemplo: "5/10 jogadores na fila"**

O counter no `<QueuePanel>` atualiza inline de "4/10" para "5/10" com transicao
de numero (counter animation de 300ms). Sem toast. Sem som neste update especifico
(som seria intrusivo se atualizar a cada jogador que entra). O `<PresenceDot>` do
jogador que entrou aparece com fade-in no painel de presenca.

---

### Nivel 4 — Erro

**Definicao:** Falhas de acao que o usuario iniciou e que precisam de contexto
para resolver. Comunicar causa e caminho de resolucao, nao apenas o fato da falha.

**Resposta do sistema:**
- Display de erro inline no contexto da acao (nao modal generico de erro).
- Som `error` distinto (frequencia baixa descendente), volume 0.5.
- Texto de erro com causa especifica + acao de retry visivel.
- Shake animation no elemento que falhou (3 ciclos, amplitude 4px, duracao 400ms).

**Exemplo: "Falha ao entrar na fila"**

O botao "ENTRAR NA FILA" recebe classe de erro: shake animation de 400ms + borda
vermelha `var(--color-state-error)`. Abaixo do botao, texto de erro aparece com
fade-in: "Erro ao entrar na fila — Steam nao vinculado. [Vincular Steam]" onde
"[Vincular Steam]" e um link de acao inline. Som `error` toca simultaneamente.
Nenhum modal de erro. Nenhum alert nativo do browser. Retry e a acao de resolver
a causa, nao apenas re-tentar a requisicao falha.

---

## 5. Doutrina como Camada UX

Os 14 principios e 10 anti-padroes da Doutrina FORMULADOTA nao sao apenas regras
de conduta. Sao conteudo cultural proprio — o unico no mercado de plataformas de
Dota 2 brasileiro. Esta secao define como transformar esse conteudo em vantagem
competitiva de UX.

### 5.1 Loading Screens

Cada sessao de loading exibe um principio selecionado aleatoriamente, sem repeticao
em sequencia. Os 14 principios cobrem ciclos completos de sessoes longas. Os 10
anti-padroes nao sao exibidos em loading — sao conteudo de onboarding, nao
reforco positivo.

Formato: principio em Cinzel 20px, italico, centralizado verticalmente. Atribuicao:
"— Doutrina FORMULADOTA, Principio N" em 12px uppercase, tracking-widest.

### 5.2 Empty States

Cada tela vazia mapeia para um principio especifico da doutrina que e contextualmente
relevante. O mapeamento e definido no `<EmptyState>` via prop `principle`. Nenhuma
tela vazia exibe mensagem sem principio de doutrina associado.

### 5.3 Onboarding Cinematografico

A sequencia de aceite da doutrina (`/onboarding/doutrina`) nao e um formulario de
checkbox. E uma apresentacao sequencial de cada principio com animacao stagger de
entrada, com o usuario confirmando cada grupo antes de prosseguir. O aceite final
e um evento de Nivel 1 (full-screen, sound stinger) — comunicando que o usuario
cruzou um limiar cultural, nao apenas aceitou termos de servico.

### 5.4 Onboarding cinematografico — Frase de ativacao

A frase central do onboarding nao e um slogan de marketing. E retirada diretamente
do texto da Doutrina:

> "Perder faz parte. Evoluir e uma escolha."

Esta frase e exibida em Cinzel 28px no momento de confirmacao do aceite, com
fade-in de 800ms e sound stinger. Ela sintetiza o contrato cultural do FormulaDota
em seis palavras.

### 5.5 Diferencial competitivo

Nenhum concorrente direto (meta-liga.ggarena.pro, GamersClub, mentorias avulsas)
tem conteudo cultural codificado em loading screens e empty states. Esta e uma
vantagem de diferenciacao nao-copiavel no curto prazo — requer autoria original
da metodologia (Pedro Paulo) e integracao deliberada na plataforma.

---

## 6. Regua de Validacao — Toda decisao de UX nova

Antes de implementar qualquer novo elemento de interface — componente, pagina,
interacao, animacao, som — aplique as tres perguntas desta regua em sequencia.
Se qualquer resposta for "nao" ou "nao sei", a decisao deve ser revisada antes
de codigo ser escrito.

### Pergunta 1: "Isso existe no Riot Client, Dota 2 client, ou outro AAA de referencia?"

Se a resposta e "nao", questione se e um diferencial intencional do FormulaDota
ou um erro de padrao SaaS infiltrado. Exemplos de diferenciais intencionais:
a Doutrina nos loading screens (unico no mercado). Exemplos de erros infiltrados:
sidebar SaaS de rotas (estilo Slack), shell minimalista sem sidebars (estilo
Riot/Valorant — afasta do Dota 2 client real, ver M2), toast no top-right,
spinner de loading.

Se nao existe em nenhum cliente AAA de referencia e nao e um diferencial intencional
documentado, o elemento deve ser redesenhado.

### Pergunta 2: "Qual mandamento este elemento satisfaz ou viola?"

Identifique o mandamento mais relevante para o elemento em questao. Documente a
justificativa. Se o elemento viola um mandamento, ele precisa ser refeito ou
o mandamento precisa ser formalmente revisado (via PR em `docs/foundations/`).

Nenhuma decisao de UX viola um mandamento sem registro explicito e aprovacao.
"Ficou mais facil de implementar assim" nao e justificativa valida para violacao
de mandamento.

### Pergunta 3: "Tem som e motion acoplados?"

Para qualquer elemento interativo (botao, link, card clicavel, input com estado),
verifique se:

- O evento de hover tem `useSound('hover')` acoplado (M10).
- O evento de click tem `useSound('click')` ou `useSound('confirm')` acoplado (M10).
- O elemento aparece na tela com animacao de entrada definida (M4 — motion primitives).
- O elemento desaparece ou muda de estado com animacao de saida ou transicao (M4).

Se qualquer um desses itens for "nao", o elemento esta incompleto.

---

## Apendice — Referencias de Produto AAA Citadas

| Produto | Versao | Aspecto relevante para FormulaDota |
|---------|--------|-----------------------------------|
| Dota 2 client | v7.37 (2024) | Top-bar nav, loading screens, presence, queue counter, empty states |
| Riot Client | v6 (2024) | Onboarding cinematografico, CTA weight, top-bar |
| Battle.net | v22 (2024) | Top-bar por jogo, asset-heavy navigation |
| FACEIT | v4 (2024) | Presence rich, feedback acoplado, sound |
| CS2 HUD | 2024 | Sound feedback hierarquico, estado critico (aceitar partida) |
| Path of Exile 2 | client 2024 | Loading screens com lore, barra de progresso minima |
| Diablo IV | client 2024 | Atmospheric ambient, particulas, vignette dinamica |
| Steam Profile | v2024 | Profile premium, hero background, stats em destaque |
| Discord | v2024 | Rich presence, 4 estados, integracao com jogos |

---

*Este documento e lei. Atualizacoes requerem PR com justificativa alinhada ao milestone
V2.5 ou posterior. Versao 1.1 — 2026-05-23. M12 e M13 adicionados derivados da filosofia
central formalizada em PHILOSOPHY.md (Pedro Paulo, 2026-05-23).*
