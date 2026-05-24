/**
 * PageTemplatesSection — FormulaDota V2.5
 *
 * Showcase do Sistema A canônico (src/components/client-shell/shell.tsx)
 * após reformulação M2 (2026-05-24). Permite Pedro visualizar:
 *
 *   1. As 2 variantes do shell (default 3-col vs immersive overlay)
 *   2. As 6 props do ClientShell e seus efeitos visuais
 *   3. Os 6 modos da sidebar direita stateful (PlayPanel)
 *   4. Status atual da migração Sistema B → Sistema A (#51, #52, #54)
 *
 * Análogo a TypographySection — componente puro (sem hooks), apenas
 * JSX + Tailwind com tokens semânticos.
 *
 * Referência canônica: docs/foundations/DOTA2_CLIENT_REFERENCE.md
 */

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-componente: card de modo da sidebar direita (PlayPanel)
// ---------------------------------------------------------------------------

interface PlayPanelModeCardProps {
  /** ID técnico do modo (ex: "matchmaking-idle") */
  id: string;
  /** Nome humano do modo (ex: "Matchmaking Idle") */
  name: string;
  /** Descrição curta do que aparece na sidebar nesse modo */
  description: string;
  /** Referência visual: arquivo no DOTA2_CLIENT_REFERENCE.md */
  reference: string;
  /** Texto do CTA persistente no rodapé da sidebar */
  cta: string;
  /** Cor do CTA — verde (default) ou vermelho (apenas lobby-ativo) */
  ctaColor?: "green" | "red";
}

function PlayPanelModeCard({
  id,
  name,
  description,
  reference,
  cta,
  ctaColor = "green",
}: PlayPanelModeCardProps) {
  return (
    <div className="bg-bg-elevated rounded-md border border-border-subtle p-4 space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <code className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
          {id}
        </code>
      </div>
      <h4 className="font-display text-sm text-text-display tracking-wide uppercase">
        {name}
      </h4>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
      <div className="pt-2 border-t border-border-subtle/40 space-y-2">
        <p className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
          Ref. visual
        </p>
        <code className="block text-[10px] font-mono text-text-body bg-bg-deep px-2 py-1 rounded border border-border-subtle/60 truncate">
          {reference}
        </code>
      </div>
      <div className="pt-2">
        <div
          className={cn(
            "rounded-sm px-3 py-2 text-center font-display text-xs uppercase tracking-widest border",
            ctaColor === "red"
              ? "bg-error/10 border-error/60 text-error"
              : "bg-success/10 border-success/60 text-success"
          )}
        >
          [{cta}]
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: linha da tabela de props
// ---------------------------------------------------------------------------

interface PropRowProps {
  name: string;
  type: string;
  effect: string;
}

function PropRow({ name, type, effect }: PropRowProps) {
  return (
    <div className="grid grid-cols-[140px_140px_1fr] gap-4 px-4 py-3 border-b border-border-subtle/40 last:border-b-0 items-baseline">
      <code className="font-mono text-xs text-brand-primary">{name}</code>
      <code className="font-mono text-[11px] text-text-muted">{type}</code>
      <p className="font-body text-sm text-text-body leading-relaxed">{effect}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dados — extraídos como const pra manter o componente principal compacto
// ---------------------------------------------------------------------------

const SHELL_PROPS: PropRowProps[] = [
  {
    name: "immersive",
    type: "boolean",
    effect:
      "Sidebars viram overlay flutuante sobre background fullscreen. Sem essa prop, layout é grid 3-col com sidebars sólidas.",
  },
  {
    name: "centerHero",
    type: "string (url)",
    effect:
      "Imagem hero renderizada no centro com gradient de overlay pras laterais — atmosfera Dota 2 (ex: QUIOSQUE DO QUARTERO).",
  },
  {
    name: "hideLeftSidebar",
    type: "boolean",
    effect:
      "Esconde sidebar esquerda (avatar/fichas/amigos). Usado em /admin que tem sua própria sidebar interna.",
  },
  {
    name: "hideBottomBar",
    type: "boolean",
    effect:
      "Esconde bottom-bar [JOGAR DOTA]. Usado em /dashboard onde HeroState dominante já cumpre o CTA — evita duplicação.",
  },
  {
    name: "wideRightSidebar",
    type: "boolean",
    effect:
      "Sidebar direita cresce pra 480-560px (em vez do default 320-380px). Usado quando o widget direito precisa de espaço (ex: lobby ativo).",
  },
  {
    name: "rightSidebar",
    type: "ReactNode",
    effect:
      "Override custom do conteúdo da sidebar direita (substitui o DashboardRightSidebar padrão de news + comunidade).",
  },
];

const PLAY_PANEL_MODES: PlayPanelModeCardProps[] = [
  {
    id: "matchmaking-idle",
    name: "Matchmaking Idle",
    description:
      "Lista de modalidades inicial (Copa de Batalhas / Salas Personalizadas / Jogar Contra Bots / Competitiva).",
    reference: "menu lateral - competitiva.png",
    cta: "BUSCAR PARTIDA",
    ctaColor: "green",
  },
  {
    id: "competitivo",
    name: "Competitivo",
    description:
      "Sub-opções após selecionar COMPETITIVA: BUSCA POR FUNÇÕES / CLÁSSICO / ANCESTRAL.",
    reference: "menu lateral - competitiva.png",
    cta: "BUSCAR PARTIDA",
    ctaColor: "green",
  },
  {
    id: "busca-por-funcoes",
    name: "Busca por Funções",
    description:
      "Checkboxes verticais com as 5 funções (Suporte dedicado, Suporte, Tri intermediária, Trilha do meio, Trilha segura) + dialog central educativo.",
    reference: "find por role.png",
    cta: "BUSCAR PARTIDA",
    ctaColor: "green",
  },
  {
    id: "salas-personalizadas",
    name: "Salas Personalizadas",
    description:
      "Sub-opções [+ CRIAR] e [• NAVEGAR]. CRIAR dispara modal fullscreen de configurações; NAVEGAR muda pro modo salas-navegar.",
    reference: "menu lateral - salas personalizadas.png",
    cta: "BUSCAR PARTIDA",
    ctaColor: "green",
  },
  {
    id: "salas-navegar",
    name: "Navegar Salas",
    description:
      "Tabela de lobbies (NOME / VAGAS / MODO / REGIÃO) + filtros (REGIÃO, MODO, busca). Botões [BUSCAR] + [CRIAR SALA] + [ENTRAR NA SALA].",
    reference: "lobbys criados.png",
    cta: "BUSCAR PARTIDA",
    ctaColor: "green",
  },
  {
    id: "lobby-ativo",
    name: "Lobby Ativo",
    description:
      "Painel de times Iluminados vs Temidos (5 slots cada) + INSTRUTORES + [EQUILIBRAR EQUIPES] + [TROCAR EQUIPES]. Centro vira chat. CTA fica VERMELHO — ação comprometedora.",
    reference: "lobby criado.png",
    cta: "INICIAR PARTIDA",
    ctaColor: "red",
  },
];

const PAGES_SYSTEM_A: string[] = [
  "/dashboard",
  "/criar-lobby",
  "/progresso",
  "/ranking",
  "/times",
  "/torneios",
  "/perfil/[steamid]",
  "/checkout",
  "/pro (layout)",
  "/admin (layout)",
];

const PAGES_SYSTEM_B: string[] = [
  "/me",
  "/perfil",
  "/partidas",
  "/pacotes",
  "/codigo-de-conduta",
  "/metodologia",
];

const ASCII_DEFAULT = `┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR — logo + tabs (PROGRESSO/RANKING/TIMES/TORNEIOS/CONDUTA)│
├─────────────┬───────────────────────────────────┬───────────────┤
│             │                                   │               │
│   LEFT      │           CENTER                  │    RIGHT      │
│  SIDEBAR    │     (viewport — children)         │   SIDEBAR     │
│ avatar +    │     fundo: background hero        │  news +       │
│ fichas +    │     atmosférico                   │  comunidade   │
│ amigos      │                                   │  (ou custom)  │
│             │                                   │               │
├─────────────┴───────────────────────────────────┴───────────────┤
│             [JOGAR DOTA] verde grande →                        │
└─────────────────────────────────────────────────────────────────┘`;

const ASCII_IMMERSIVE = `┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR (overlay com backdrop-blur)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────┐                            ┌─────────┐              │
│ │ LEFT    │   BACKGROUND fullscreen   │ RIGHT   │              │
│ │ SIDEBAR │   (hero do Dota 2, ex:   │ SIDEBAR │              │
│ │ floating│    QUIOSQUE DO QUARTERO) │ floating│              │
│ └─────────┘                            └─────────┘              │
│             [JOGAR DOTA] verde →                                │
└─────────────────────────────────────────────────────────────────┘`;

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PageTemplatesSection() {
  return (
    <section className="space-y-4">
      {/* Title bar — recriado pra evitar dependência circular com page.tsx */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl text-text-display tracking-wide">
          Page Templates
        </h2>
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
          Sistema A · 2 variantes · 6 props · 6 modos
        </span>
      </div>

      {/* Nota explicativa do estado do shell canônico */}
      <div className="bg-bg-elevated/50 border-l-2 border-brand-primary/60 px-4 py-3 rounded-r">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-brand-primary font-mono uppercase tracking-widest text-[10px]">
            Sistema A · canônico 2026-05-24
          </span>
          <br />
          <code className="font-mono text-brand-primary">
            src/components/client-shell/shell.tsx
          </code>{" "}
          é o shell <strong className="text-text-body">canônico</strong> da plataforma
          — replica fielmente o client Dota 2 real (3 colunas + bottom-bar [JOGAR DOTA]).
          Hoje <strong className="text-text-body">18 páginas</strong> consomem este shell
          (migração Sistema B → A concluída em 2026-05-24, arquivo legacy{" "}
          <code className="font-mono text-text-faded">templates/client-shell.tsx</code> deletado).
          Referência visual:{" "}
          <code className="font-mono text-brand-primary">
            docs/foundations/DOTA2_CLIENT_REFERENCE.md
          </code>
          .
        </p>
      </div>

      <div className="space-y-12 pt-4">
        {/* ============================================================== */}
        {/* 1. DIAGRAMAS ASCII — 2 variantes principais                    */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Variantes
            </h3>
            <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
              default (grid) · immersive (overlay)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Variante: default (grid 3-col) */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <code className="font-mono text-xs text-brand-primary uppercase tracking-widest">
                  default
                </code>
                <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
                  grid 3-col, sidebars com bg sólido
                </span>
              </div>
              <pre className="font-mono text-[10px] leading-tight text-text-body bg-bg-elevated border border-border-subtle rounded-md p-4 overflow-x-auto">
                {ASCII_DEFAULT}
              </pre>
              <p className="text-xs text-text-muted leading-relaxed">
                Padrão da maioria das páginas (progresso, ranking, times, torneios,
                checkout, admin). Background fica contido na coluna central.
              </p>
            </div>

            {/* Variante: immersive (overlay) */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <code className="font-mono text-xs text-brand-primary uppercase tracking-widest">
                  immersive
                </code>
                <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
                  overlay sobre background fullscreen
                </span>
              </div>
              <pre className="font-mono text-[10px] leading-tight text-text-body bg-bg-elevated border border-border-subtle rounded-md p-4 overflow-x-auto">
                {ASCII_IMMERSIVE}
              </pre>
              <p className="text-xs text-text-muted leading-relaxed">
                Usado em <code className="font-mono text-brand-primary">/dashboard</code>{" "}
                — espelha o client Dota 2 real (background fullscreen tipo QUIOSQUE DO
                QUARTERO, sidebars flutuantes com backdrop-blur).
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. TABELA DE PROPS                                              */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Props
            </h3>
            <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
              6 props públicas do ClientShell
            </span>
          </div>

          <div className="bg-bg-elevated/40 border border-border-subtle rounded-md overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[140px_140px_1fr] gap-4 px-4 py-2 bg-bg-elevated border-b border-border-subtle">
              <span className="font-display text-[10px] uppercase tracking-widest text-text-faded">
                Prop
              </span>
              <span className="font-display text-[10px] uppercase tracking-widest text-text-faded">
                Tipo
              </span>
              <span className="font-display text-[10px] uppercase tracking-widest text-text-faded">
                Efeito visual
              </span>
            </div>

            {SHELL_PROPS.map((p) => (
              <PropRow key={p.name} {...p} />
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. 6 MODOS DA SIDEBAR DIREITA (PlayPanel stateful)              */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4 flex-wrap">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Sidebar Direita — 6 modos (PlayPanel)
            </h3>
            <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
              src/components/client-shell/play-panel.tsx
            </span>
          </div>

          <p className="text-sm text-text-muted mb-6 max-w-3xl">
            O <code className="font-mono text-brand-primary text-xs">PlayPanel</code> é
            stateful — alterna entre 6 modos conforme o user navega o matchmaking.
            CTA persistente no rodapé muda de cor apenas no modo{" "}
            <code className="font-mono text-error text-xs">lobby-ativo</code>{" "}
            (verde → vermelho), indicando ação comprometedora (&ldquo;começar&rdquo; vs &ldquo;buscar&rdquo;).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLAY_PANEL_MODES.map((m) => (
              <PlayPanelModeCard key={m.id} {...m} />
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. STATUS DA MIGRAÇÃO B → A                                    */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Status da Migração
            </h3>
            <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
              Sistema B → Sistema A · tasks #51 / #52 / #54
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sistema A — adopters */}
            <div className="bg-bg-elevated/50 border-l-2 border-success/60 rounded-r px-4 py-3 space-y-2">
              <p className="font-display text-[10px] uppercase tracking-widest text-success">
                ✓ 12 pages usam Sistema A
              </p>
              <ul className="text-xs text-text-body font-mono space-y-1">
                {PAGES_SYSTEM_A.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            {/* Sistema B — órfãs */}
            <div className="bg-bg-elevated/50 border-l-2 border-warning/60 rounded-r px-4 py-3 space-y-2">
              <p className="font-display text-[10px] uppercase tracking-widest text-warning">
                ⏳ 6 pages órfãs no Sistema B (a migrar)
              </p>
              <ul className="text-xs text-text-body font-mono space-y-1">
                {PAGES_SYSTEM_B.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Task tracking */}
          <div className="mt-4 bg-bg-elevated/30 border border-border-subtle/60 rounded-md px-4 py-3">
            <p className="font-display text-[10px] uppercase tracking-widest text-text-faded mb-2">
              Task tracking
            </p>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>
                <code className="font-mono text-brand-primary">#51</code> — migração
                das 6 órfãs do Sistema B → Sistema A
              </li>
              <li>
                <code className="font-mono text-brand-primary">#52</code> — aprimoramento
                da sidebar direita contextual estilo COMPETITIVA Dota 2
              </li>
              <li>
                <code className="font-mono text-success">#54</code> ✓ <strong className="text-success">CONCLUÍDO</strong>{" "}
                — Sistema B (<code className="font-mono text-text-faded">templates/client-shell.tsx</code>)
                deletado em 2026-05-24 após zero callsites
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
