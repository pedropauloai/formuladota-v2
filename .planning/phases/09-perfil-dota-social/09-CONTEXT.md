# Phase 9: Perfil Dota 2 + Social — Context

**Gathered:** 2026-05-26
**Status:** Ready for UI-SPEC then planning
**Milestone:** V2.6 — Player Identity + Social Layer

<domain>
## Phase Boundary

Player tem **identidade visual canônica estilo Dota 2 client** + **camada social completa**:

1. **Sidebar esquerda expansível/retrátil** com preferência persistida em qualquer rota
2. **Click no mini-perfil → /me** (avatar/nome/card inteiro são clicáveis)
3. **Página /me 100% fiel ao Dota 2** (referências: `perfil-dota.png` + `perfil-dota-miniperfil+amigos-expandido.png` na raiz)
4. **Sistema de edição** de status_message, heróis favoritos, hero portrait de fundo, avatar customizado
5. **Friendships completos**: mutual com confirmação, RLS, Server Actions, presença online via Supabase Realtime

**Fora de escopo (próximas phases):**
- Chat real-time entre amigos
- Notificações push de friend requests
- Discord/Steam presence integration
- Sistema de mensagens privadas
- Tab "Troféus" como Battle Pass (V2 — MVP usa achievements existentes)

</domain>

<decisions>
## Implementation Decisions

### A. Sidebar expansível (global, todas as rotas)
- **D-01:** Estado persistido via cookie SSR-safe (não httpOnly — client precisa ler no hydration pra evitar flash). Cookie `sidebar_expanded` com valor `1`/`0`.
- **D-02:** Default state = **expandida** pra novo user (descobrir lista de amigos imediatamente)
- **D-03:** **Colapsada** (~72px): só avatar do user (clicável → /me) + ícones empilhados de atalhos (Configurações, Conduta, Discord)
- **D-04:** **Expandida** (~340/400/460px atual): ProfileCard + FichasCard + Atalhos + lista de amigos
- **D-05:** Toggle button (`ChevronsLeft`/`ChevronsRight` ou similar) visível em ambos states no topo da sidebar
- **D-06:** Server Action `togglesidebar()` setta cookie e revalida `layout` (mesmo padrão de `togglePreviewMode`)

### B. Click no mini-perfil
- **D-07:** Card inteiro do mini-perfil (avatar + nome + tag) envolvido em `<Link href="/me">` com hover state sutil

### C. Página /me visual Dota 2
- **D-08:** Layout 3 colunas: stats à esquerda (~280px) | status_message + heróis favoritos no centro | hero portrait gigante como background
- **D-09:** Hero portrait de fundo = URL Valve do hero escolhido pelo user (`profiles.hero_portrait_slug` → lookup no bundle)
- **D-10:** Tabs no topo do main panel: **Perfil** / **Histórico** / **Conquistas** / **Conduta**
- **D-11:** Botão "EDITAR PERFIL" no canto superior direito (abre modal — ver D-19)
- **D-12:** **Tab Perfil** (default): identidade canônica (avatar XL + nome + DotaRankMedal + HonorRankMedal) + status_message editável + linha de 3 heróis favoritos + stats numéricos à esquerda
- **D-13:** **Tab Histórico**: embed das últimas 10-20 partidas via `<MatchCard>` (componente V2.5-F7). Link "Ver tudo → /partidas" no final
- **D-14:** **Tab Conquistas**: grid de `<AchievementBadge>` (15 variants V2.5) com tooltip explicando cada uma
- **D-15:** **Tab Conduta**: `<HonorRankMedal size="xl">` + breakdown (commends, strikes, doutrina_accepted_at) + `behavior_status` + link "Releia a Doutrina → /codigo-de-conduta"

### D. Sistema de edição
- **D-16:** **Modal in-page** usando `<Dialog>` primitive V2.5 (não rota dedicada `/me/editar`)
- **D-17:** Modal tem 4 abas internas: **Status** / **Heróis Favoritos** / **Hero Portrait** / **Avatar**
- **D-18:** Aba **Status**: textarea ~60 chars com counter visível, salva via Server Action `updateStatusMessage(text)`
- **D-19:** Aba **Heróis Favoritos**: grid pesquisável dos 124 heróis do bundle, user seleciona até 3, ordem importa. Salva como `profiles.favorite_heroes` JSONB array de slugs.
- **D-20:** Aba **Hero Portrait**: grid pesquisável (mesmo dos favoritos), user seleciona 1 que vira background do /me. Salva como `profiles.hero_portrait_slug`.
- **D-21:** Aba **Avatar**: upload de imagem custom (sobrescreve Discord/Steam). Bucket Supabase Storage `profile-avatars`. Max 5MB, formatos `png|jpg|webp`. Crop quadrado obrigatório (256x256 min). Salva URL em `profiles.avatar_custom_url`.
- **D-22:** Toda Server Action de edição usa **Zod validation** + RLS gate (`auth.uid() = user_id`).

### E. Catálogo de heróis Dota
- **D-23:** Bundle **estático JSON** em `src/data/dota-heroes.json` (~150KB). Sem fetch API live.
- **D-24:** Schema completo OpenDota por herói: `id`, `slug`, `name_pt`, `roles[]`, `primary_attr`, `complexity`, `image_full`, `image_icon`, `portrait_url`.
- **D-25:** Atualização manual quando Valve adiciona herói novo (raro — 1-2/ano). Script `pnpm gen:heroes` opcional pra regenerar via OpenDota API.

### F. Hero portrait de fundo
- **D-26:** **Apenas URLs Valve oficiais** do catálogo (sem upload custom de background — só avatar tem upload). MVP simples, sem bucket extra de background.

### G. Sistema de friendships
- **D-27:** Tabela `friendships` (id, requester_id, addressee_id, status, created_at, updated_at)
- **D-28:** Estados: `pending` / `accepted` / `rejected` / `blocked`
- **D-29:** **Modelo mutual com confirmação** (estilo Dota 2/Discord — não follow assimétrico)
- **D-30:** RLS obrigatória: user só vê friendships onde `requester_id = auth.uid() OR addressee_id = auth.uid()`
- **D-31:** Server Actions: `sendFriendRequest(addresseeId)`, `acceptFriendRequest(friendshipId)`, `rejectFriendRequest(friendshipId)`, `removeFriend(friendshipId)`, `blockUser(userId)`
- **D-32:** Sem limite máximo de amigos em V1 (revisar se virar problema de UX)
- **D-33:** Index em `(requester_id, status)` e `(addressee_id, status)` pra queries de "minhas amizades aceitas" e "requests pendentes"

### H. Presença online
- **D-34:** **Supabase Realtime presence channel** — fonte única da verdade. Sem integração Discord/Steam.
- **D-35:** Online = aba FormulaDota aberta agora (channel `presence` com heartbeat automático)
- **D-36:** Lista de amigos mostra online (ring colorido + PresenceDot) e offline (grayscale + texto last_seen relativo)
- **D-37:** Persiste `profiles.last_seen_at` em background pro fallback de "visto há 2h"

### I. Migrations Supabase (precisam aprovação Pedro per CLAUDE.md)
- **D-38:** Migration `00X_profile_extended.sql`:
  - `profiles.status_message TEXT CHECK (char_length(status_message) <= 60)`
  - `profiles.hero_portrait_slug TEXT REFERENCES heroes(slug)` (ou só TEXT validado em app)
  - `profiles.favorite_heroes JSONB DEFAULT '[]'::jsonb CHECK (jsonb_array_length(favorite_heroes) <= 3)`
  - `profiles.avatar_custom_url TEXT`
  - `profiles.last_seen_at TIMESTAMPTZ`
- **D-39:** Migration `00Y_friendships.sql`: tabela friendships + RLS policies + indexes
- **D-40:** Migration `00Z_storage_profile_avatars.sql`: bucket `profile-avatars` + storage policies (user só upload pro próprio user_id, public read)

### Claude's Discretion
- Avatar upload: tamanho exato min/max, validação MIME server-side, transformação via Supabase Image Transform
- Heartbeat interval do presence channel (sugestão: 30s) + timeout pra considerar offline (sugestão: 60s)
- Margens/spacing exatas do layout 3-col do /me (segue UI-SPEC.md)
- Animation transition da sidebar collapse/expand (sugestão: 200ms ease-out)
- Ordem dos 3 heróis favoritos no display (esquerda→direita, do mais preferido pro menos)
- Comportamento exato quando addressee_id rejeita friendship (deletar row vs marcar `rejected`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Referências visuais Dota 2 (fidelidade extrema)
- `perfil-dota.png` (raiz do projeto) — Perfil Dota 2 estado padrão: header com tabs, stats à esquerda, status message + heróis no centro, hero portrait gigante background, botão EDITAR PERFIL canto superior direito
- `perfil-dota-miniperfil+amigos-expandido.png` (raiz do projeto) — MESMA tela mas com sidebar adicional aberta à esquerda mostrando lista de amigos online

### Doutrina e identidade FormulaDota
- `docs/foundations/PHILOSOPHY.md` — Sistema 2-eixos SKILL+HONOR (DotaRankMedal + HonorRankMedal lado a lado é padrão canônico — mandamento M12)
- `docs/foundations/HONOR_SYSTEM.md` — Breakdown do HONOR score (commends, strikes, etc) que aparece na Tab Conduta
- `docs/foundations/PRODUCT_CORE.md` — Princípios de produto que validam decisões de UX
- `.planning/PROJECT.md` — Vision do HUB Dota 2 brasileiro
- `.planning/REQUIREMENTS.md` — Requirements H5 (Phase 7) — overlap conceitual mas Phase 9 entrega antes

### Componentes V2.5 reutilizáveis
- `src/components/ui/avatar.tsx` — UserAvatar com sizes sm/md/lg/xl + ring colorido + badge overlay
- `src/components/ui/dota-rank-medal.tsx` — Medalhas SKILL Valve oficiais (9 tiers)
- `src/components/ui/honor-rank-medal.tsx` — Medalhas HONOR FormulaDota (8 tiers)
- `src/components/ui/achievement-badge.tsx` — 15 variants (8 SKILL + 7 HONOR)
- `src/components/ui/badge-stack.tsx` — Stack com overflow indicator
- `src/components/patterns/match-card.tsx` — Card de partida pra Tab Histórico
- `src/components/patterns/pro-card.tsx` — Card vertical hero (referência de layout)
- `src/components/client-shell/shell.tsx` — ClientShell 3-col canônico
- `src/components/client-shell/left-sidebar.tsx` — Sidebar atual (será refatorada pra expansível)

### Tokens e convenções globais
- `CLAUDE.md` (raiz) — Convenções de código, validação Zod, RLS obrigatória, voz Mestre sem nome próprio Pedro
- `src/app/globals.css` — Tokens semânticos (zero hex hardcoded — C14)

### Memory references (auto-loaded)
- `feedback_dota2_client_canonical.md` — Sistema A (sidebars + bottom-bar) é correto, Dota 2 client é referência canônica
- `project_culture_doctrine.md` — 14 princípios + 10 anti-padrões da Doutrina

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

| Componente | Localização | Uso na Phase 9 |
|---|---|---|
| `UserAvatar` | `src/components/ui/avatar.tsx` | Avatar XL hero portrait do perfil + sm na lista de amigos |
| `DotaRankMedal` | `src/components/ui/dota-rank-medal.tsx` | Medalha SKILL no Tab Perfil |
| `HonorRankMedal` | `src/components/ui/honor-rank-medal.tsx` | Medalha HONOR no Tab Perfil + xl no Tab Conduta |
| `AchievementBadge` | `src/components/ui/achievement-badge.tsx` | Grid no Tab Conquistas |
| `BadgeStack` | `src/components/ui/badge-stack.tsx` | Stack de achievements visíveis no Tab Perfil |
| `MatchCard` | `src/components/patterns/match-card.tsx` | Lista de partidas no Tab Histórico |
| `Card`, `Button`, `EmptyState` | `src/components/ui/*` | Primitives base |
| `mmrToDotaRank` | `src/components/queue/queue-helpers.ts` | Mapeamento MMR Valve → DotaRank |
| `togglePreviewMode` Server Action | `src/lib/auth/preview-mode.ts` | Padrão de cookie-based toggle (referência pra `toggleSidebar`) |
| Supabase Realtime presence | nativo `@supabase/supabase-js` | Sistema de presença |

### Established Patterns

- **Server Components by default**, Client Components só pra interatividade (CLAUDE.md)
- **Server Actions pra mutations** (não API routes pra forms internos)
- **Zod validation** em todos os inputs de Server Action
- **RLS policies obrigatórias** em todas as tables Supabase
- **Cookie-based preferences** (`preview_mode` é referência — sidebar_expanded segue o padrão)
- **Tokens semânticos via Tailwind** (zero hex hardcoded — C14)
- **`<ClientShell>` canônico** com `currentRoute` prop pra destacar tab ativa
- **Functions max 50 linhas, files max 300 linhas** (CLAUDE.md)
- **Comentários PT-BR onde não-óbvio**

### Integration Points

- **`src/components/client-shell/left-sidebar.tsx`** — refatorar pra suportar collapsed/expanded
- **`src/components/client-shell/shell.tsx`** — ler cookie `sidebar_expanded` no Server e passar como prop; ajustar widths do grid (immersive + default modes)
- **`src/app/me/page.tsx`** — reescrever completo pro layout 3-col Dota 2
- **`supabase/migrations/`** — 3 novas migrations (profile extended, friendships, storage avatars)
- **`src/lib/queries/`** — adicionar `friends.ts`, `presence.ts`, `heroes.ts`
- **`src/lib/auth/`** — adicionar `sidebar-preference.ts` (toggleSidebar Server Action)
- **`src/components/profile/`** (NOVO) — `ProfilePage`, `EditProfileModal`, `HeroPicker`, `AvatarUpload`, `FriendsList`
- **`src/data/dota-heroes.json`** (NOVO) — catálogo de 124 heróis

</code_context>

<specifics>
## Specific Ideas

- **Fidelidade visual ao Dota 2 client é critério de aceite** — "Isso parece o client do Dota 2 real?" é a régua. Referências:
  - `perfil-dota.png` (estado sidebar fechada)
  - `perfil-dota-miniperfil+amigos-expandido.png` (estado sidebar aberta)
- **Hero portrait gigante de background** é visualmente dominante — não competir com legibilidade do conteúdo (gradient overlay obrigatório)
- **Mensagem "AJUDAREI MEUS ALIADOS FRACOS E INSIGNIFICANTES DA MELHOR MANEIRA POSSÍVEL"** no exemplo Dota 2 — é só um placeholder; FormulaDota não copia esse texto literal mas o **formato** (status_message editável com voz pessoal do user)
- **Botão "JOGAR DOTA"** verde no canto inferior direito do Dota 2 → no FormulaDota é o bottom-bar canônico do `<ClientShell>` (já existe)
- **Sistema 2-eixos SKILL+HONOR é mandamento M12** — sempre lado a lado (DotaRankMedal + HonorRankMedal)
- **Brand voice "Mestre"** — autoritativa, sem jargão startup, sem giria de vendedor, sem nome próprio "Pedro Paulo"

</specifics>

<deferred>
## Deferred Ideas

### Não entram na Phase 9 (entram em phases futuras):
- **Chat real-time entre amigos** — V2 (precisa WebSocket + UI de chat + history)
- **Notificações push** de friend requests, posts, etc — V2
- **Discord presence integration** (mostrar amigos online no Discord mesmo offline no FormulaDota) — V2 ou backlog
- **Steam presence integration** (mostrar quem tá jogando Dota agora) — V3+
- **Bloqueio/report de usuário** com workflow de moderação — V2
- **Sistema de mensagens privadas (DMs)** — V2
- **Tab Troféus como Battle Pass real** (com tiers, rewards, season pass) — V3
- **Tab Ingressos do Dota 2** (tickets de torneio) — fora de escopo permanente (FormulaDota não vende tickets de tournament Valve)
- **Upload de hero portrait custom** (não-Valve) — V2 se demanda surgir
- **Backgrounds animados (Arcana animadas, etc)** — V3
- **Limite máximo de amigos** com UX de "amigos próximos" — revisar baseado em dados reais

</deferred>

---

*Phase: 09-perfil-dota-social*
*Context gathered: 2026-05-26*
*Mode: discuss*
*Milestone: V2.6 — Player Identity + Social Layer*
