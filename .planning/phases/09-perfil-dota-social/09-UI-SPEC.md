---
phase: 9
slug: perfil-dota-social
status: approved
shadcn_initialized: true
preset: base-nova / neutral / cssVariables
created: 2026-05-26
reviewed_at: 2026-05-26
revision: 1
checker_verdict: VERIFIED
milestone: V2.6 — Player Identity + Social Layer
---

# Phase 9 — UI Design Contract: Perfil Dota 2 + Social

> Contrato visual e de interação para fidelidade extrema ao Dota 2 client real.
> Régua: "Isso parece o client do Dota 2 real?" — se não parecer, é bug de design.
> Gerado por gsd-ui-researcher. Verificado por gsd-ui-checker.
>
> Referências visuais primárias:
>   - `perfil-dota.png` — Perfil Dota 2 estado padrão (sidebar fechada)
>   - `perfil-dota-miniperfil+amigos-expandido.png` — Sidebar amigos expandida

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (style: base-nova) |
| Preset | base-nova, neutral base color, cssVariables: true |
| Component library | Radix UI primitives via shadcn |
| Icon library | lucide-react (NUNCA emojis em UI — C6) |
| Font display | Ubuntu Variable (`--font-display`) — ExitLag reference |
| Font body | Ubuntu Variable (`--font-body`) — mesmo da display |
| Font condensed | Teko Variable (`--font-display-condensed`) — apenas display impactante |
| Tokens | `src/styles/tokens/semantic.css` + `src/styles/globals.css` @theme |

---

## Spacing Scale

Escala base 4px herdada de V2.5-F2 — tokens `--space-*` via `src/styles/tokens/semantic.css`.

| Token | Value | Uso nesta Phase |
|-------|-------|-----------------|
| `--space-1` | 4px | Gaps inline, padding de ícones |
| `--space-2` | 8px | Gap interno de rows (lista de amigos), padding de pills |
| `--space-4` | 16px | Padding interno padrão de cards e seções |
| `--space-6` | 24px | Padding das colunas principais do /me |
| `--space-8` | 32px | Gap entre grupos de stats, margem entre tabs e conteúdo |
| `--space-12` | 48px | Margem top do hero portrait overlay |
| `--space-16` | 64px | Altura mínima do header do /me (nome + tabs) |

### Spacing Exceptions

Os tokens abaixo estão fora do standard set {4, 8, 16, 24, 32, 48, 64} mas são herdados do Token Layer V2.5 já estabelecido no projeto. Não substituir — apenas declarar formalmente como exceções.

| Token | Value | Justificativa |
|-------|-------|---------------|
| `--space-3` | 12px | Herdado de V2.5-F2 Token Layer — gap entre avatar e texto no mini-perfil; gap entre DotaRankMedal e HonorRankMedal |
| `--space-5` | 20px | Herdado de V2.5-F2 Token Layer — gap entre colunas do layout /me |

Exceções de constraint de layout (não escala de spacing):
- **Sidebar colapsada:** largura fixa `72px` (não escala 4px — constraint visual do Dota 2 real)
- **Sidebar expandida:** largura fixa `340px` (não escala 4px — constraint layout 3-col)
- **Hero portrait background:** cobre 100% altura do /me main panel — sem spacing constraint
- **Largura da coluna stats:** `280px` fixo (espelha proporção Dota 2 real)

---

## Typography

Fonte única: Ubuntu Variable (body + display). Teko Variable reservado para momentos épicos.
Body global usa `font-weight: 600` (semibold como default — decisão Pedro 2026-05-25).

### Escala Principal (máximo 4 tiers)

| Role | Size | Weight | Line Height | Fonte | Uso nesta Phase |
|------|------|--------|-------------|-------|-----------------|
| Display hero | 28px | 700 (bold) | 1.2 | Ubuntu (font-display) | Nome do usuário no topo do /me, seção hero |
| Heading | 20px | 700 (bold) | 1.2 | Ubuntu (font-display) | Títulos de tabs, seção headers |
| Body | 16px | 600 (semibold) | 1.5 | Ubuntu (font-body) | Status message, descrições, texto principal |
| Label/Caption | 13px | 600 (semibold) | 1.4 | Ubuntu (font-body) | Labels de stats, nomes de amigos, tags, counters, timestamps relativos, "visto há 2h", indicadores secundários |

### Exceções de Tipografia (fora da escala principal — justificadas individualmente)

| Contexto | Size | Weight | Justificativa |
|----------|------|--------|---------------|
| Tabs do /me ("PERFIL", "HISTÓRICO", "CONQUISTAS", "CONDUTA") | 13px | 700 | UPPERCASE com letter-spacing 0.08em — espelha Dota 2 client real; letter-spacing diferencia de Label/Caption padrão |
| Stats numéricos (Partidas, Vitórias, MMR, Destaques) | 24px | 700 | `font-display-condensed` (Teko Variable), `tabular-nums` — Teko reservado pra momentos de impacto máximo; tamanho entre Heading e Display para dar peso sem conflito |
| Separator online/offline na lista de amigos | 11px | 600 | UPPERCASE `text-text-faded` — elemento puramente estrutural que não deve competir com conteúdo; mínimo legível aceitável |
| Hero name abaixo do portrait no picker | 11px | 600 | Contexto de grid 56×32px — espaço físico extremamente limitado |

Regras especiais aplicadas à escala:
- **Status message** do usuário: Body (16px), weight 600, `italic` opcional se o user usar aspas
- **FORMULADOTA brand strings** em uppercase: 13px, weight 700, letter-spacing 0.1em
- **Stat labels** (ex: "PARTIDAS", "VITÓRIAS"): Label/Caption (13px), uppercase, `text-text-faded`

---

## Color

Paleta V2.5 herdada de `src/styles/tokens/semantic.css` — ZERO hex hardcoded (C14).

| Role | Token | Valor aproximado | Uso |
|------|-------|-----------------|-----|
| Dominant (60%) | `--color-bg-deep` | #0B0C0F | Background body, hero portrait overlay base |
| Secondary (30%) | `--color-bg-base` / `--color-bg-elevated` | #111317 / #191D24 | Sidebar, cards de stats, painel de amigos, modal |
| Accent brand (8%) | `--color-brand-primary` | #C42121 | Ver lista abaixo |
| Accent play (2%) | `--color-play-primary` | #5b8e3a | Botão JOGAR DOTA (bottom-bar canônica), PresenceDot in-match |
| Destructive | `--color-error` | #ef4444 | Botão "Remover amigo", confirmação de remoção, PresenceDot dnd |

**Accent brand (`--color-brand-primary`) reservado EXCLUSIVAMENTE para:**
1. Ring do avatar do usuário no mini-perfil da sidebar (estado padrão)
2. Ring do UserAvatar XL no topo do /me (tab Perfil)
3. Border do card selecionado na grade de heróis (modal Heróis Favoritos + Hero Portrait)
4. Borda ativa da tab selecionada no /me (underline 2px brand-primary)
5. Botão "EDITAR PERFIL" (variant `primary` do Button V2.5)
6. CTA "Enviar pedido de amizade" (botão de ação principal do perfil)
7. Focus ring global (já definido em globals.css via `*:focus-visible`)
8. `border-brand-primary` no FichasCard da sidebar (já existe)

**Accent play (`--color-play-primary`) reservado EXCLUSIVAMENTE para:**
1. Bottom-bar "JOGAR DOTA" (já existe no ClientShell canônico)
2. PresenceDot status `in-match`
3. Ring do avatar quando presence = `in-match`

**Gradiente hero portrait overlay (obrigatório — C14 compliance):**
```
background: linear-gradient(
  to left,
  transparent 0%,
  var(--color-bg-deep) 65%
)
```
Cobre o hero portrait para garantir legibilidade do conteúdo da coluna central e esquerda.

**Sidebar: gradiente de profundidade (C14 compliant — usa color-mix em vez de rgba literal):**
```
background: linear-gradient(
  to right,
  color-mix(in srgb, var(--color-bg-deep) 92%, transparent),
  color-mix(in srgb, var(--color-bg-deep) 70%, transparent)
)
```
Com `backdrop-blur-sm` para sensação de camadas.

---

## Layout Architecture

### Shell Global: 3 colunas Dota 2 canônico (ClientShell existente)

O `<ClientShell>` em `src/components/client-shell/shell.tsx` JÁ existe. Phase 9 o adapta, não recria.

```
[Sidebar Esquerda] [Main Content] [Sidebar Direita]
     72px / 340px      flex-1           ~280px
```

- Top-bar: já existe em `src/components/client-shell/top-bar.tsx`
- Bottom-bar "JOGAR DOTA": já existe em `src/components/ui/bottom-bar.tsx`
- Sidebar direita: já existe em `src/components/client-shell/right-sidebar.tsx`

### Sidebar Esquerda — Estado Collapsed (72px)

Estado: cookie `sidebar_expanded=0` — default expandida para novos users.

Layout vertical, items centralizados horizontalmente:

```
┌──────────────────────────────┐  72px largura
│  [>]  (toggle ChevronsRight) │  16px top, centrado
│                              │
│  [AV] UserAvatar md (40px)   │  Avatar clicável → /me
│       Link href="/me"        │
│                              │
│  [⚙]  Settings icon         │  Ícones empilhados 20px height
│  [📖] Conduta icon          │  gap-space-2 entre ícones
│  [💬] Discord icon          │
│                              │
└──────────────────────────────┘
```

- UserAvatar: size="md" (40px), ringColor="brand", presence={userPresence}
- Ícones: 16px Lucide, `text-text-muted`, hover `text-text-display`
- Tooltip obrigatório em cada ícone (aria-label + Radix Tooltip)
- Fundo: `bg-bg-base/90 backdrop-blur-sm`
- Toggle button: `ChevronsRight` Lucide 16px, position no topo, `text-text-muted`

### Sidebar Esquerda — Estado Expanded (340px)

Estado: cookie `sidebar_expanded=1`.

```
┌──────────────────────────────────────────────────────┐  340px
│  [<]  (toggle ChevronsLeft)             [340px wide] │  topo
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ ProfileCard (Link href="/me")                │   │  card clicável
│  │  [UserAvatar xl=96px] Nome           [RANK]  │   │  ring="brand"
│  │                       [tag FORMULADOTA]      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ FichasCard (já existe)                       │   │  border brand/40
│  │  Saldo de fichas    [N fichas]               │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Atalhos nav (já existe)                      │   │
│  │  Meu Perfil | Código de Conduta | Discord    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ LISTA DE AMIGOS                              │   │  seção nova
│  │  — header com count "X AMIGOS ONLINE"        │   │  Teko Variable 13px
│  │  — rows: [Avatar sm] Nome  [PresenceDot]     │   │  height: 40px/row
│  │  — rows offline: grayscale + "visto há Xh"  │   │
│  │  — EmptyState se sem amigos                  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Lista de amigos — row spec:**
- Avatar: `UserAvatar size="sm"` (32px), presence={friendPresence}
- Nome: 13px, weight 600, `text-text-body` (online) ou `text-text-faded` (offline)
- Offline rows: `opacity-60` no conjunto
- "visto há Xh": 13px Label/Caption, `text-text-faded`
- Hover: `bg-bg-elevated/60` no row inteiro
- Separator entre online/offline: linha `border-border-subtle` com label "OFFLINE" em 11px uppercase `text-text-faded` (exceção tipográfica — ver seção Typography)

**Amigos — header "AMIGOS ONLINE":**
- Teko Variable, 13px, weight 600, uppercase, `text-text-muted`
- Counter inline: `[N online]` em brand-primary quando > 0

### Página /me — Layout 3 colunas Dota 2

URL: `/me` | Autenticação obrigatória | Server Component base

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HERO PORTRAIT (background — cobre toda a área da main content)             │
│  img: CDN Valve via profiles.hero_portrait_slug | object-fit: cover        │
│  gradient overlay: linear-gradient(to left, transparent 0%, bg-deep 65%)   │
│                                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │  COLUNA STATS   │  │  COLUNA IDENTIDADE + STATUS                     │ │
│  │    ~280px       │  │     flex-1 (min ~380px)                         │ │
│  │                 │  │                                                  │ │
│  │  [UserAvatar]   │  │  [UserAvatar xl=96px ring=brand]                │ │
│  │   xl=96px       │  │  Nome (28px bold)                               │ │
│  │                 │  │  [DotaRankMedal size=lg] [HonorRankMedal lg]    │ │
│  │  PARTIDAS       │  │                                                  │ │
│  │   2.058         │  │  "status_message aqui..."                       │ │
│  │  VITÓRIAS       │  │  (16px, italic, text-text-body)                 │ │
│  │   1.103         │  │                                                  │ │
│  │  DERROTAS       │  │  ┌──────┐ ┌──────┐ ┌──────┐                   │ │
│  │   1.050         │  │  │ Hero1│ │ Hero2│ │ Hero3│  heróis favoritos  │ │
│  │  DESTAQUES      │  │  │ img  │ │ img  │ │ img  │  72x40px portrait  │ │
│  │    369          │  │  │name  │ │name  │ │name  │  rounded-md        │ │
│  │                 │  │  └──────┘ └──────┘ └──────┘                   │ │
│  │  [DotaRank sm]  │  │                                                  │ │
│  │  [HonorRank sm] │  └──────────────────────────────────────────────────┘ │
│  └─────────────────┘                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TABS  [PERFIL] [HISTÓRICO] [CONQUISTAS] [CONDUTA]    [EDITAR] btn  │   │
│  │         ─────                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [CONTEÚDO DA TAB ATIVA]                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Hero portrait background:**
- `position: absolute`, `inset: 0`, `z-[var(--z-atmosphere)]`
- `object-fit: cover`, `object-position: center top`
- Overlay gradient obrigatório (ver seção Color)
- Fallback quando nenhum hero selecionado: `bg-bg-base` com grid sutil `.bg-grid`

**Coluna stats — spec detalhada:**
- Container: `width: 280px`, `flex-shrink: 0`, padding `--space-6`
- UserAvatar: size="xl" (96px), ringColor="brand"
- Cada stat label: 13px uppercase `text-text-faded` (Label/Caption tier)
- Cada stat valor: `font-display-condensed` 24px bold `text-text-display tabular-nums` (exceção tipográfica — ver seção Typography)
- Separador entre stats: `border-border-subtle` 1px
- DotaRankMedal + HonorRankMedal: side-by-side, size="md", gap-space-3

**Coluna identidade — spec detalhada:**
- Container: `flex-1`, padding `--space-6`
- Nome: Ubuntu 28px weight 700 `text-text-display`
- Tag FORMULADOTA: 13px brand-primary, weight 700
- Sistema 2-eixos (M12): `DotaRankMedal size="lg"` + `HonorRankMedal size="lg"` sempre lado a lado, gap-space-3
- Status message: 16px, weight 600, `text-text-body`, placeholder "Clique em Editar para adicionar um status" em `text-text-faded italic`
- Heróis favoritos: 3 cards horizontais, cada um 72×40px portrait, border-1px `border-border-subtle`, rounded-md, `object-fit: cover`, hero name abaixo 11px muted (exceção — espaço físico limitado)

**Botão EDITAR PERFIL:**
- Position: absolute, top-space-4, right-space-4 (canto superior direito do /me)
- Variant: `"secondary"` do Button V2.5 (não primary — não competir com o play CTA)
- Label: "EDITAR PERFIL" uppercase
- Ícone Lucide `Pencil` 14px à esquerda

**Tabs:**
- Container: border-b `border-border-subtle`, padding-bottom 0
- Tab item: 13px, uppercase, letter-spacing 0.08em, weight 700 (exceção tipográfica — ver seção Typography)
- Ativa: `text-text-display` + `border-b-2 border-brand-primary`
- Inativa: `text-text-muted` hover `text-text-body`
- Transição de tab: FadeIn variant (--motion-duration-standard 240ms)

### Mobile Layout (< 768px)

Para viewports abaixo de 768px o layout 3-col colapsa nas seguintes regras:

**Sidebar esquerda:**
- Sidebar abandona o grid permanente e vira drawer overlay acionado por toggle no top-bar
- Toggle: ícone `Menu` Lucide 20px no canto esquerdo do top-bar (visível apenas em mobile)
- Drawer: desliza da esquerda, largura `min(340px, 100vw - 48px)`, backdrop `bg-bg-deep/80`
- Cookie `sidebar_expanded` continua funcionando — drawer abre na última preferência
- Fechamento: toque no backdrop ou botão X interno no topo do drawer

**Página /me em mobile:**
- Layout empilha verticalmente em coluna única
- Stats colapsam acima da identidade (ordem: stats → identidade → tabs → conteúdo)
- Hero portrait vira thumbnail 100% largura de 160px de altura no topo, com overlay gradient completo `linear-gradient(to bottom, transparent 30%, var(--color-bg-deep) 100%)`
- UserAvatar XL do stats move para o header inline — circular 64px, centralizado
- Nome reduz de 28px para 20px (Heading tier) para caber em tela estreita
- DotaRankMedal + HonorRankMedal mantêm side-by-side, size="sm"
- Heróis favoritos: os 3 cards em row horizontal com scroll se necessário — `overflow-x: auto`, `scroll-snap-type: x mandatory`
- Tabs: scroll horizontal com `overflow-x: auto` e `scroll-snap-type: x mandatory` — sem dropdown (manter visibilidade dos labels Dota 2)
- Stats numéricos: grid 2×2 em vez de lista vertical
- Botão "EDITAR PERFIL": width full em mobile (`w-full`), posicionado entre identidade e tabs

---

## Tab Contents — Specs

### Tab Perfil (default)

Já especificada no layout acima (identidade canônica). Conteúdo do painel abaixo das tabs:

Exibe resumo adicional abaixo da identidade:
- BadgeStack com AchievementBadges recentes (até 5, "+N" overflow)
- Link "Ver todas as conquistas →" em 13px brand-primary

### Tab Histórico

- Lista de `<MatchCard>` (componente V2.5-F7 existente em `src/components/patterns/match-card.tsx`)
- 10 partidas mais recentes
- Sem paginação no MVP — link "Ver todas em /partidas →" ao final
- EmptyState quando sem partidas: ver seção Copywriting

### Tab Conquistas

- Grid responsivo: 5 colunas em desktop, 3 em mobile
- Cada item: `<AchievementBadge>` com Radix Tooltip descrevendo a conquista (nome + critério)
- Badges desbloqueadas: opacity 100%, sombra sutil `--shadow-elevated`
- Badges bloqueadas: opacity 30%, grayscale, sem tooltip (ou tooltip "Bloqueada")
- EmptyState quando zero conquistas: ver seção Copywriting

### Tab Conduta

```
┌────────────────────────────────────────────────────────────┐
│  [HonorRankMedal size="xl"] ← principal visual desta tab  │
│  Nome do tier HONOR em Teko 20px                          │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Commends     │  │ Strikes      │  │ Doutrina     │    │
│  │    [N]       │  │    [N]       │  │  Aceita      │    │
│  │ texto label  │  │ texto label  │  │ [data]       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
│  behavior_status badge: "ATIVO" / "SUSPENSO" / "BANIDO"  │
│  [Botão] Releia a Doutrina → /codigo-de-conduta           │
└────────────────────────────────────────────────────────────┘
```

- `HonorRankMedal size="xl"`: 96px ou maior — é o elemento dominante
- behavior_status: badge colorida (success=ATIVO, warning=SUSPENSO, error=BANIDO)
- Link "Releia a Doutrina": Button variant="ghost" com icon `ExternalLink` 12px

---

## Modal Editar Perfil — Spec

Componente: `<Dialog>` V2.5 (fullscreen takeover variant — DF6.3).
4 abas internas controladas por tabs horizontais.

**Header modal:**
- Título: "EDITAR PERFIL" font-display uppercase 20px weight 700
- Botão fechar: ícone `X` Lucide, canto superior direito — ÚNICO controle de fechamento do modal (sem botão "CANCELAR" separado — padrão Dota 2 client)

**Aba Status:**
```
┌─────────────────────────────────────────────────────────────┐
│  MENSAGEM DE STATUS                                         │
│  ──────────────────                                         │
│  [textarea — 1 row, max 60 chars]                          │
│  "Escreva algo sobre você..."  placeholder                  │
│                                          [42/60] counter    │
│                                                             │
│  [SALVAR STATUS]                                            │
└─────────────────────────────────────────────────────────────┘
```
- Textarea: `bg-bg-elevated`, border `border-border-strong`, rounded-sm, 16px font-body
- Counter: 13px `text-text-faded`, muda para `text-error` quando >= 55 chars
- Server Action: `updateStatusMessage(text)` — Zod max 60 chars
- Toast de confirmação: "Status atualizado" (bottom-center, slide-up — DF6.4)
- Fechamento: apenas pelo X do header do Dialog

**Aba Heróis Favoritos:**
```
┌─────────────────────────────────────────────────────────────┐
│  HERÓIS FAVORITOS (até 3)                                   │
│  [Preview: Hero1] [Hero2] [Hero3]  ← selecionados          │
│                                                             │
│  [Buscar herói...]                                         │
│                                                             │
│  [Grid de heroes — 6 colunas]                              │
│  [img 56x32px] [img] [img] [img] [img] [img]               │
│  nome hero     ...                                          │
│   ✓ selecionado = border-2 border-brand-primary            │
│                                                             │
│  [SALVAR HERÓIS]                                            │
└─────────────────────────────────────────────────────────────┘
```
- Input busca: 13px, bg-bg-elevated, icon `Search` 14px à esquerda
- Hero card no grid: 56×32px portrait + nome 11px abaixo (exceção — espaço físico), rounded-sm
- Selecionado: `ring-2 ring-brand-primary ring-offset-1 ring-offset-bg-deep`
- Desabilitado quando 3 já selecionados (sem hover, opacity 50%) — exceto os já selecionados
- Server Action: `updateFavoriteHeroes(slugs[])` — Zod array max length 3
- Fechamento: apenas pelo X do header do Dialog

**Aba Hero Portrait:**
- Mesmo grid de heróis (sem restriction de seleção — sempre 1 ativo)
- Preview ao vivo: hero selecionado exibido em miniatura portrait 160×90px ao topo
- Botão de confirmação: "SALVAR PORTRAIT" variant=`primary` size=`md`
- Server Action: `updateHeroPortrait(slug)` — Zod string refere a slug válido
- Fechamento: apenas pelo X do header do Dialog

**Aba Avatar:**
```
┌─────────────────────────────────────────────────────────────┐
│  AVATAR PERSONALIZADO                                       │
│                                                             │
│  [Preview circular 96px do avatar atual]                   │
│                                                             │
│  [Área de drop: "Arraste ou clique para enviar"]           │
│  Formatos: PNG, JPG, WebP — máx 5MB                        │
│  Mínimo: 256×256px | Crop quadrado automático               │
│                                                             │
│  [Botão: Escolher arquivo]  [Usar avatar do Discord]       │
│                                                             │
│  [SALVAR AVATAR]                                            │
└─────────────────────────────────────────────────────────────┘
```
- Área de drop: border-dashed `border-border-strong`, rounded-lg, `bg-bg-elevated/40`
- Estado com arquivo selecionado: preview no círculo + nome do arquivo 13px
- "Usar avatar do Discord": Button variant="ghost", limpa `avatar_custom_url`
- Upload via Supabase Storage bucket `profile-avatars`
- Fechamento: apenas pelo X do header do Dialog

---

## Interaction Contracts

### Sidebar Toggle

| Trigger | Action | Duration |
|---------|--------|----------|
| Click toggle button | Expand/collapse sidebar | 200ms `--motion-ease-snappy` |
| Cookie write | `sidebar_expanded=0|1` via Server Action | Imediato |
| Rerender | Shell lê cookie SSR — sem flash no hydration | N/A |

- Animação: `width` de `72px → 340px` (ou reverso), `overflow-hidden`
- Conteúdo da sidebar expanded: FadeIn após 80ms do início do expand (evita flicker de texto durante animação de width)
- Ícone toggle: `ChevronsLeft` quando expandida, `ChevronsRight` quando colapsada

### Click no Mini-perfil (sidebar expandida)

- Card inteiro envolto em `<Link href="/me">`
- Hover: `bg-bg-elevated/40` no card, cursor pointer
- Sem indicador de loading — página /me é Server Component, Next.js faz prefetch automaticamente

### Tabs do /me

- Transição: FadeIn do conteúdo, 240ms `--motion-ease-soft-landing`
- URL: tabs controladas por `searchParams.tab=perfil|historico|conquistas|conduta` (SSR-friendly)
- Default: `tab=perfil`
- Tab ativa destaca com underline brand-primary 2px

### Abertura do Modal Editar Perfil

- Trigger: Button "EDITAR PERFIL" no /me
- Animação entrada: ScaleIn + FadeIn, 300ms `--motion-ease-spring`
- Z-layer: `var(--z-modal)` = 50
- Backdrop: `bg-bg-deep/80 backdrop-blur-sm`
- Sound: `confirm` via `useSound()` na abertura

### Formulários do Modal

- Loading state: Button com `disabled + spinner` via `<Button loading>` prop V2.5
- Sucesso: Toast bottom-center "X atualizado" + fechar modal automaticamente após 800ms
- Erro: Toast bottom-center variant error + modal permanece aberto
- Validação client-side: feedback inline 13px `text-error` abaixo do campo
- Fechamento: exclusivamente pelo ícone X no header do Dialog (sem botão "CANCELAR" nas abas)

### Lista de amigos — Presença Realtime

- Channel: `presence` Supabase Realtime
- Heartbeat: 30s interval
- Timeout offline: 60s sem heartbeat → status `offline`
- `last_seen_at` atualizado no disconnect pra fallback "visto há Xh"
- Reordenação da lista: online sempre acima, offline abaixo, separados por divider
- Animação quando amigo muda status: nenhuma (sem distrações — Dota 2 real é estático)

### Envio de pedido de amizade

- Botão: "ENVIAR PEDIDO" variant=`primary` size=`md` com ícone `UserPlus` Lucide
- Após envio: botão muda para "PEDIDO ENVIADO" disabled + icon `Check`
- Sem modal de confirmação — pedido não é destrutivo
- Toast: "Pedido de amizade enviado para [Nome]"

### Remoção de amigo

- Trigger: ícone `UserMinus` 14px no hover do row do amigo (visible apenas no hover)
- Requer confirmação inline: row expande para mostrar "Remover [Nome] da lista? [REMOVER] [X]"
- Botão confirmação: "REMOVER" variant=`destructive` size=`sm`
- Fechamento sem ação: ícone X inline no row expandido (não um botão nomeado)
- Sem modal separado — inline no próprio row

---

## Component Inventory

Mapeamento completo de quais primitives V2.5 usar e em qual configuração.

### Reutilizados sem modificação

| Componente | Arquivo | Configuração nesta Phase |
|---|---|---|
| `UserAvatar` | `src/components/ui/avatar.tsx` | Sidebar collapsed: `size="md" ringColor="brand" presence={status}` |
| `UserAvatar` | `src/components/ui/avatar.tsx` | Sidebar expanded ProfileCard: `size="xl" ringColor="brand" presence={status}` |
| `UserAvatar` | `src/components/ui/avatar.tsx` | Lista de amigos: `size="sm" presence={friendStatus}` |
| `UserAvatar` | `src/components/ui/avatar.tsx` | Topo /me coluna stats: `size="xl" ringColor="brand"` |
| `DotaRankMedal` | `src/components/ui/dota-rank-medal.tsx` | Tab Perfil coluna stats: `size="md"` |
| `DotaRankMedal` | `src/components/ui/dota-rank-medal.tsx` | Tab Perfil identidade: `size="lg"` (lado a lado com HonorRank) |
| `HonorRankMedal` | `src/components/ui/honor-rank-medal.tsx` | Tab Perfil coluna stats: `size="md"` |
| `HonorRankMedal` | `src/components/ui/honor-rank-medal.tsx` | Tab Perfil identidade: `size="lg"` (lado a lado com DotaRank) |
| `HonorRankMedal` | `src/components/ui/honor-rank-medal.tsx` | Tab Conduta: `size="xl"` — elemento dominante |
| `AchievementBadge` | `src/components/ui/achievement-badge.tsx` | Tab Conquistas: grid 5 colunas |
| `BadgeStack` | `src/components/ui/badge-stack.tsx` | Tab Perfil: preview de 5 achievements + overflow |
| `PresenceDot` | `src/components/ui/presence-dot.tsx` | Lista de amigos: `size="md" showLabel={false}` |
| `PresenceDot` | `src/components/ui/presence-dot.tsx` | Sidebar collapsed ícone status: `size="md" showLabel={true}` |
| `MatchCard` | `src/components/patterns/match-card.tsx` | Tab Histórico: lista de 10 partidas |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Tab Histórico, Tab Conquistas, Lista amigos vazia |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal Editar Perfil (fullscreen takeover variant) — fechamento apenas pelo X do header |
| `Button` | `src/components/ui/button.tsx` | "EDITAR PERFIL": variant=`secondary` size=`md` |
| `Button` | `src/components/ui/button.tsx` | "SALVAR STATUS" na aba Status do modal: variant=`primary` size=`md` |
| `Button` | `src/components/ui/button.tsx` | "SALVAR HERÓIS" na aba Heróis do modal: variant=`primary` size=`md` |
| `Button` | `src/components/ui/button.tsx` | "SALVAR PORTRAIT" na aba Hero Portrait do modal: variant=`primary` size=`md` |
| `Button` | `src/components/ui/button.tsx` | "SALVAR AVATAR" na aba Avatar do modal: variant=`primary` size=`md` |
| `Button` | `src/components/ui/button.tsx` | "ENVIAR PEDIDO": variant=`primary` size=`md` icon=`UserPlus` |
| `Button` | `src/components/ui/button.tsx` | "ACEITAR PEDIDO": variant=`primary` size=`sm` |
| `Button` | `src/components/ui/button.tsx` | "RECUSAR PEDIDO": variant=`ghost` size=`sm` |
| `Button` | `src/components/ui/button.tsx` | "REMOVER" confirm inline: variant=`destructive` size=`sm` |
| `Button` | `src/components/ui/button.tsx` | "Releia a Doutrina": variant=`ghost` size=`sm` icon=`ExternalLink` |
| `Card` | `src/components/ui/card.tsx` | ProfileCard sidebar: variant=`elevated` |
| `Card` | `src/components/ui/card.tsx` | Stats card /me: variant=`flat` |
| `LoadingScreen` | `src/components/ui/loading-screen.tsx` | Loading do /me quando buscando dados |

### Refatorados nesta Phase

| Componente | Arquivo | O que muda |
|---|---|---|
| `DashboardLeftSidebar` | `src/components/client-shell/left-sidebar.tsx` | Adiciona collapsed/expanded state, cookie toggle, lista de amigos real, FriendsList component |
| `ClientShell` | `src/components/client-shell/shell.tsx` | Lê cookie `sidebar_expanded`, passa como prop pra left-sidebar, ajusta grid column width; em mobile (< 768px) sidebar vira drawer overlay |

### Novos nesta Phase

| Componente | Arquivo sugerido | Descrição |
|---|---|---|
| `ProfilePage` | `src/components/profile/profile-page.tsx` | Orquestrador do /me — 3 colunas + hero portrait |
| `ProfileStats` | `src/components/profile/profile-stats.tsx` | Coluna de stats (280px) |
| `ProfileIdentity` | `src/components/profile/profile-identity.tsx` | Coluna de identidade + status_message + heróis |
| `ProfileTabs` | `src/components/profile/profile-tabs.tsx` | Tabs PERFIL/HISTÓRICO/CONQUISTAS/CONDUTA |
| `EditProfileModal` | `src/components/profile/edit-profile-modal.tsx` | Dialog com 4 abas de edição |
| `HeroPicker` | `src/components/profile/hero-picker.tsx` | Grid pesquisável dos 124 heróis |
| `AvatarUpload` | `src/components/profile/avatar-upload.tsx` | Drop zone + preview + upload para Supabase Storage |
| `FriendsList` | `src/components/profile/friends-list.tsx` | Lista realtime de amigos com presença |
| `FriendRow` | `src/components/profile/friend-row.tsx` | Row individual: avatar + nome + presença + actions |
| `FriendRequestButton` | `src/components/profile/friend-request-button.tsx` | Botão enviar/cancelar/aceitar pedido |

---

## Copywriting Contract

Voz de marca: **Mestre** — autoritativa, sem jargão startup, sem nome próprio "Pedro Paulo".
Strings em PT-BR. FORMULADOTA sempre em maiúsculo sem acento.

| Elemento | Copy |
|---------|------|
| CTA principal identidade | "EDITAR PERFIL" |
| CTA amizade | "ENVIAR PEDIDO" |
| CTA aceitar amizade | "ACEITAR PEDIDO" |
| CTA rejeitar amizade | "RECUSAR PEDIDO" |
| CTA remover amigo | "REMOVER DA LISTA" |
| Confirmação remoção inline — texto | "Remover [Nome] da sua lista de amigos?" |
| Confirmação remoção inline — botão | "REMOVER" |
| Botão salvar aba Status | "SALVAR STATUS" |
| Botão salvar aba Heróis | "SALVAR HERÓIS" |
| Botão salvar aba Hero Portrait | "SALVAR PORTRAIT" |
| Botão salvar aba Avatar | "SALVAR AVATAR" |
| Sidebar collapsed — tooltip avatar | "Ver meu perfil" |
| Sidebar collapsed — tooltip conduta | "Código de Conduta" |
| Sidebar collapsed — tooltip discord | "Discord FORMULADOTA" |
| Tab padrão /me | "PERFIL" |
| Status placeholder vazio | "Nenhum status definido. Clique em Editar Perfil para adicionar um." |
| Heróis favoritos — nenhum selecionado | "Nenhum herói favorito definido." |
| Toast: status salvo | "Status atualizado com sucesso." |
| Toast: heróis salvos | "Heróis favoritos atualizados." |
| Toast: portrait salvo | "Hero portrait atualizado." |
| Toast: avatar salvo | "Avatar personalizado salvo." |
| Toast: pedido enviado | "Pedido de amizade enviado." |
| Toast: amigo removido | "Amigo removido da sua lista." |
| Toast: erro genérico | "Não foi possível salvar. Tente novamente." |
| EmptyState Tab Histórico — heading | "Nenhuma partida ainda." |
| EmptyState Tab Histórico — body | "Suas partidas com o coach aparecerão aqui após a primeira sessão." |
| EmptyState Tab Conquistas — heading | "Nenhuma conquista desbloqueada." |
| EmptyState Tab Conquistas — body | "Participe de sessões, siga a doutrina e acumule conquistas ao longo das temporadas." |
| EmptyState Lista Amigos — heading | "Sua lista de amigos está vazia." |
| EmptyState Lista Amigos — body | "Encontre jogadores na comunidade e adicione-os como amigos." |
| EmptyState Pedidos pendentes | "[N] pedidos de amizade aguardando sua resposta." |
| Erro avatar — tamanho | "Arquivo muito grande. Máximo 5MB." |
| Erro avatar — formato | "Formato inválido. Use PNG, JPG ou WebP." |
| Erro avatar — dimensão | "Imagem muito pequena. Mínimo 256×256 pixels." |
| Label textarea status counter (normal) | "[N]/60" |
| Label textarea status counter (limite) | "[N]/60 — limite próximo" em text-error |
| Aba Status — instrução | "Escreva uma mensagem curta sobre você (máx. 60 caracteres)." |
| Aba Heróis — instrução | "Escolha até 3 heróis que representam seu estilo de jogo." |
| Aba Portrait — instrução | "Selecione o herói que aparecerá como background do seu perfil." |
| Aba Avatar — instrução | "Envie uma imagem personalizada. Será cortada em formato quadrado." |
| Botão restaurar avatar | "Usar avatar do Discord" |
| Tooltip achievement bloqueado | "Conquista bloqueada" |
| behavior_status ATIVO | "CONDUTA: APROVADA" |
| behavior_status SUSPENSO | "CONDUTA: SUSPENSA" |
| behavior_status BANIDO | "CONDUTA: BANIDA" |
| Link releia doutrina | "Releia o Código de Conduta" |
| Seção conduta — commends label | "COMMENDS" |
| Seção conduta — strikes label | "AVISOS" |
| Seção conduta — doutrina label | "DOUTRINA ACEITA EM" |
| Lista amigos — section online | "ONLINE AGORA" |
| Lista amigos — section offline | "OFFLINE" |
| Lista amigos — last seen | "Visto há [X]h" / "Visto há [X]min" / "Visto há 1 dia" |
| Lista amigos — in-queue | "Na fila" |
| Lista amigos — in-match | "Em partida" |

---

## Accessibility Contract (WCAG 2.1 AA — C5)

| Elemento | Requisito |
|----------|-----------|
| Sidebar toggle button | `aria-label="Recolher sidebar"` / `aria-label="Expandir sidebar"`, `aria-expanded={bool}` |
| Tabs /me | `role="tablist"`, cada tab `role="tab"`, painel `role="tabpanel"`, `aria-selected` ativo |
| Modal editar perfil | `role="dialog"`, `aria-modal="true"`, focus trap obrigatório, `aria-labelledby` apontando pro título |
| PresenceDot | `role="status"`, `aria-label="Online"` etc. (já implementado no componente) |
| UserAvatar | `alt` descritivo obrigatório (não vazio — `alt="Avatar de [Nome]"`) |
| Hero portrait background | `role="img"`, `aria-label="Hero portrait: [heroName]"` ou `aria-hidden` se puramente decorativo |
| Lista de amigos | `role="list"`, cada row `role="listitem"` |
| Textarea status | `aria-describedby` apontando pro counter |
| Upload de avatar | `aria-label="Enviar avatar personalizado"` na área de drop |
| Botões ação friends | `aria-label="Remover [Nome] da lista de amigos"` |
| Tab Conduta — behavior status | `role="status"` no badge |
| Focus order | Lógico top→bottom: sidebar toggle → conteúdo principal → tabs → botão editar |

---

## Motion Contract

Todas as animações usam tokens V2.5 — zero durations hardcoded (C15).

| Interação | Variant | Duration | Easing |
|-----------|---------|----------|--------|
| Sidebar expand/collapse | width animation CSS | 200ms | `--motion-ease-snappy` |
| Conteúdo sidebar (após expand) | FadeIn | 80ms delay + 160ms | `--motion-ease-soft-landing` |
| Abertura modal editar perfil | ScaleIn + FadeIn | `--motion-duration-standard` (240ms) | `--motion-ease-spring` |
| Fechamento modal | FadeOut + ScaleOut | `--motion-duration-micro` (100ms) | `--motion-ease-snappy` |
| Troca de tab no /me | FadeIn conteúdo | `--motion-duration-standard` (240ms) | `--motion-ease-soft-landing` |
| Toast aparecer | slide-up + FadeIn | `--motion-duration-standard` (240ms) | `--motion-ease-spring` |
| Toast desaparecer | FadeOut | `--motion-duration-micro` (100ms) | `--motion-ease-snappy` |
| Hero selecionado no picker | ring scale pulse | `--motion-duration-micro` (100ms) | `--motion-ease-spring` |
| Hover em row de amigo | bg-bg-elevated | `--motion-duration-micro` (100ms) | `--motion-ease-soft-landing` |
| PresenceDot pulse (estados ativos) | opacity 0.55→1→0.55 | 2000ms | easeInOut (já implementado) |
| Mobile drawer sidebar abrir | translateX 0 | 250ms | `--motion-ease-spring` |
| Mobile drawer sidebar fechar | translateX -100% | 200ms | `--motion-ease-snappy` |

`prefers-reduced-motion`: sidebar usa `@media (prefers-reduced-motion: reduce) { transition: none }`. Demais animações via `useMotionSafe()` já implementado no sistema V2.5.

---

## Sound Contract

Todos os sons via `useSound()` hook V2.5 — zero chamadas diretas ao Howler (C16).

| Trigger | SFX id | Volume layer |
|---------|--------|-------------|
| Abrir modal editar perfil | `confirm` | `--volume-interaction` |
| Salvar qualquer aba do modal (sucesso) | `confirm` | `--volume-interaction` |
| Erro ao salvar (validação ou server) | `error` | `--volume-interaction` |
| Enviar pedido de amizade | `click` | `--volume-interaction` |
| Aceitar pedido (aparecer toast) | `reward` | `--volume-reward` |
| Fechar modal (X do header) | `click` (suave) | `--volume-interaction` |
| Sidebar toggle expand/collapse | `click` | `--volume-interaction` |
| Amigo fica online (realtime) | `notification` | `--volume-interaction` |

---

## Registry Safety

| Registry | Blocks usados | Safety Gate |
|----------|---------------|-------------|
| shadcn official (base-nova) | Dialog, Button, Card, Toast, Badge — todos já instalados em V2.5 | Não requerido (oficial) |
| Third-party | Nenhum | N/A |

Nenhum registry de terceiros declarado para esta phase. Todos os componentes são primitivos V2.5 já existentes ou novos compostos sobre eles.

---

## Anti-patterns Proibidos (Cross-cutting)

Herdados de REQUIREMENTS.md C14-C20 e UX_PRINCIPLES.md:

- **PROIBIDO** hex hardcoded em qualquer componente desta phase (C14)
- **PROIBIDO** rgba literal com valores numéricos RGB — usar `color-mix(in srgb, var(--token) N%, transparent)` (C14)
- **PROIBIDO** z-index numérico ad-hoc — apenas `var(--z-*)` (C17)
- **PROIBIDO** motion duration inline — apenas tokens `--motion-duration-*` (C15)
- **PROIBIDO** Toast top-right SaaS — usar bottom-center slide-up V2.5 (C19)
- **PROIBIDO** spinner `animate-spin` — usar LoadingScreen V2.5 ou Button loading state (C19)
- **PROIBIDO** sidebar SaaS de rotas (tipo Slack/Linear) — o `<ClientShell>` Sistema A é canônico (M2)
- **PROIBIDO** nome próprio "Pedro Paulo" / "Pedro" / "PPA" em strings user-facing (B6)
- **PROIBIDO** `max-w-*` container SaaS no layout /me (C18) — fullscreen wash obrigatório
- **PROIBIDO** `console.log` em produção — `console.error` apenas em server actions (CLAUDE.md)
- **PROIBIDO** hero portrait sem gradient overlay — texto deve ser sempre legível sobre o background
- **PROIBIDO** botão "CANCELAR" em abas do modal — fechamento exclusivo pelo X do Dialog header (padrão Dota 2 client)
- **PROIBIDO** labels genéricos "SALVAR" sem contexto — usar "SALVAR STATUS" / "SALVAR HERÓIS" / "SALVAR PORTRAIT" / "SALVAR AVATAR"

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
