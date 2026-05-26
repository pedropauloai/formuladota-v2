---
phase: 09-perfil-dota-social
verified: 2026-05-26T00:00:00Z
status: passed
score: 8/8 must-haves verified
gaps: []
human_verification:
  - test: "Sidebar collapse/expand toggle"
    expected: "Clicar no botão ChevronsLeft/ChevronsRight muda a sidebar de 340px pra 72px (ou vice-versa), sem flash de conteúdo no SSR, preferência persiste no reload da página."
    why_human: "Comportamento visual de transição, cookie persistência, e ausência de flash de hidratação não são verificáveis com grep."
  - test: "EditProfileModal — fluxo completo Status"
    expected: "Clicar EDITAR PERFIL abre modal takeover. Aba Status: textarea aceita até 60 chars, counter atualiza em tempo real, SALVAR STATUS chama Server Action e toast aparece com sucesso/erro, modal fecha após 800ms."
    why_human: "Interação Client Component com Server Action, toast UI, fechamento automático."
  - test: "EditProfileModal — aba Heróis Favoritos e Hero Portrait"
    expected: "Grid de 127 heróis aparece. Busca filtra em tempo real. Multi mode limita a 3; single mode seleciona 1. SALVAR X chama Server Action e atualiza profile.heroPortraitSlug / favorite_heroes no banco."
    why_human: "Interação visual do picker, busca client-side, toast de sucesso, revalidação de cache."
  - test: "AvatarUpload — pipeline completo"
    expected: "Selecionar imagem PNG/JPG/WebP >256px, upload para Supabase bucket profile-avatars, saveCustomAvatarUrl Server Action persiste URL. Avatar aparece na sidebar e no /me após revalidação."
    why_human: "Depende de Supabase Storage live + network, preview canvas crop, toast."
  - test: "FriendsList realtime presence"
    expected: "Amigo online com aba aberta aparece com ring colorido e sem opacity-60. Amigo offline aparece com opacity-60 e texto 'Visto há Xh'. Heartbeat 60s atualiza last_seen_at no banco."
    why_human: "Supabase Realtime channel requer conexão WebSocket live entre dois browsers."
  - test: "Hero portrait fullscreen no /me"
    expected: "Quando user tem hero_portrait_slug definido, o portrait do herói aparece como background fullscreen atrás das sidebars overlay. Quando não tem, cai pro fundo atmospheric padrão sem erro."
    why_human: "Visual fidelidade ao Dota 2 client, gradient overlay, z-index real no browser."
---

# Phase 9: Perfil Dota 2 + Social — Verification Report

**Phase Goal:** Player tem identidade visual canônica estilo Dota 2 client + camada social completa (sidebar expansível persistida em qualquer rota + click mini-perfil to /me + /me visual 100% fiel Dota 2 com layout 3-col + tabs Perfil/Histórico/Conquistas/Conduta + sistema de edição completo + sistema de friendships com presence realtime).

**Verified:** 2026-05-26
**Status:** PASSED (com itens para verificação humana)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar esquerda tem estado collapsed (72px) e expanded (340px) com toggle persistido em cookie | VERIFIED | `left-sidebar.tsx` lê `expanded` prop do shell; `sidebar-preference.ts` implementa `toggleSidebar` Server Action com cookie `sidebar_expanded`; `shell.tsx` chama `getSidebarExpanded()` no SSR |
| 2 | Click no mini-perfil (avatar/nome/card) navega pra /me | VERIFIED | `left-sidebar-expanded.tsx` envolve o ProfileCard em `<Link href="/me">`; `left-sidebar-collapsed.tsx` envolve o avatar em `<Link href="/me">` |
| 3 | /me renderiza com ClientShell immersive + hero portrait fullscreen via centerHero prop | VERIFIED | `me/page.tsx` chama `<ClientShell currentRoute="/me" immersive centerHero={centerHero}>` onde `centerHero = profile.heroPortraitData?.portrait_url ?? undefined` |
| 4 | Tabs Perfil/Histórico/Conquistas/Conduta controladas por searchParams SSR-friendly | VERIFIED | `profile-tabs.tsx` usa `<Link href={tab === "perfil" ? "/me" : /me?tab=${tab}>`, zero useState; `me/page.tsx` lê `await searchParams` com fallback `"perfil"` |
| 5 | Sistema de edição funcional com 4 abas (Status, Heróis, Portrait, Avatar) | VERIFIED | `edit-profile-modal.tsx` tem 4 abas reais com Server Actions: `updateStatusMessage`, `updateFavoriteHeroes`, `updateHeroPortrait`, `saveCustomAvatarUrl` — todas com Zod + toast |
| 6 | Catálogo de 127 heróis com 10 campos (D-24) disponível como bundle estático | VERIFIED | `src/data/dota-heroes.json` tem 127 entradas; `node -e` confirma 10 chaves incluindo `complexity` |
| 7 | Sistema de friendships com 5 Server Actions (D-31) + RLS + indexes | VERIFIED | `src/actions/friends.ts` implementa `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`, `blockUser`; migration `035_friendships.sql` tem RLS policies e indexes |
| 8 | Presence realtime via Supabase Realtime channel com heartbeat 60s | VERIFIED | `src/lib/realtime/presence.ts` implementa `usePresenceChannel` com `supabase.channel("online-users")`, heartbeat `HEARTBEAT_MS=60000`, cleanup via `supabase.removeChannel` |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `next.config.ts` | Valve CDN whitelist | VERIFIED | 2 entries: `cdn.cloudflare.steamstatic.com` e `cdn.akamai.steamstatic.com` |
| `src/data/dota-heroes.json` | 127+ heróis, 10 campos D-24 | VERIFIED | 127 heróis confirmados; keys: id,slug,name_pt,name_en,roles,primary_attr,complexity,image_full,image_icon,portrait_url |
| `src/lib/queries/heroes.ts` | getHeroBySlug, searchHeroes, getAllHeroes, isValidHeroSlug, HeroData interface | VERIFIED | Todas as 4 funções + interface exportadas; complexity: number presente |
| `scripts/gen-heroes.ts` | Script regenerador OpenDota | VERIFIED | Arquivo existe com lógica de fetch + fallback |
| `supabase/migrations/034_profile_extended.sql` | 5 novas colunas profiles (D-38) | VERIFIED | status_message, hero_portrait_slug, favorite_heroes, avatar_custom_url, last_seen_at com CHECKs e index |
| `supabase/migrations/035_friendships.sql` | Tabela friendships + RLS + indexes (D-39) | VERIFIED | Tabela com unique_pair LEAST/GREATEST, 4 RLS policies, 2 indexes compostos |
| `supabase/migrations/036_storage_profile_avatars.sql` | Bucket profile-avatars + storage policies (D-40) | VERIFIED | Bucket public=true, 5MB limit, MIME whitelist, 4 storage policies |
| `src/types/database.ts` | Tipos regenerados com novas colunas | VERIFIED | status_message, hero_portrait_slug, favorite_heroes, avatar_custom_url, last_seen_at, friendships table presentes |
| `src/lib/auth/sidebar-preference.ts` | getSidebarExpanded + toggleSidebar Server Actions | VERIFIED | Cookie não-httpOnly, default expandida, revalidatePath("/", "layout") |
| `src/actions/profile.ts` | updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait, updateLastSeen | VERIFIED | Todas 4 actions com Zod, auth.getUser(), RLS gate |
| `src/actions/avatar.ts` | saveCustomAvatarUrl, clearCustomAvatar | VERIFIED | Zod URL validation com regex supabase bucket, folder ownership check |
| `src/actions/friends.ts` | 5 actions D-31 incluindo blockUser | VERIFIED | Todas 5 com UUIDSchema Zod, auth check, error handling explícito |
| `src/lib/realtime/presence.ts` | usePresenceChannel, getPresenceStatus, formatLastSeen | VERIFIED | Hook com cleanup obrigatório (pitfall 2), flatten presenceState (pitfall 3), heartbeat 60s |
| `src/lib/queries/friends.ts` | getAcceptedFriends, getPendingRequests | VERIFIED | Queries paralelas para outgoing+incoming, JOIN com profiles |
| `src/lib/queries/profile.ts` | getProfileForMe com ProfileForMe interface | VERIFIED | Resolve avatar (custom>steam>discord), heroPortraitData, favoriteHeroes como HeroData[] |
| `src/components/client-shell/shell.tsx` | Lê cookie sidebar_expanded + getAcceptedFriends + passa expanded+initialFriends ao DashboardLeftSidebar | VERIFIED | getSidebarExpanded() + getAcceptedFriends() em Promise.all; props expanded e initialFriends passados |
| `src/components/client-shell/left-sidebar.tsx` | Toggle collapsed/expanded com form action toggleSidebar | VERIFIED | form action={toggleSidebar} com ChevronsLeft/ChevronsRight |
| `src/components/client-shell/left-sidebar-collapsed.tsx` | Estado 72px com avatar clicável /me | VERIFIED | Link /me envolvendo avatar ou placeholder |
| `src/components/client-shell/left-sidebar-expanded.tsx` | Estado 340px com ProfileCard (Link /me) + FriendsList | VERIFIED | ProfileCard em Link /me; FriendsList com currentUserId e initialFriends |
| `src/components/profile/friends-list.tsx` | FriendsList com usePresenceChannel, online/offline split | VERIFIED | Usa usePresenceChannel, separa online/offline, onlineCount counter |
| `src/components/profile/friend-row.tsx` | Row com avatar, nome, last_seen, accept/reject/remove actions | VERIFIED | UserAvatar com presence prop, formatLastSeen, confirmação inline de remoção, accept/reject para pending |
| `src/app/me/page.tsx` | ClientShell immersive + centerHero + ProfilePage | VERIFIED | immersive centerHero={centerHero} passados; redirect para "/" se não autenticado |
| `src/components/profile/profile-page.tsx` | Orquestrador com EditProfileModal no canto direito + 2-col layout | VERIFIED | EditProfileModal no absolute top-4 right-4; ProfileStats + ProfileIdentity + ProfileTabs + tab content |
| `src/components/profile/profile-stats.tsx` | Avatar XL + stats numéricos + DotaRankMedal + HonorRankMedal lado a lado (M12) | VERIFIED | UserAvatar size="xl" + grid stats + DotaRankMedal + HonorRankMedal gap-3 |
| `src/components/profile/profile-identity.tsx` | Avatar XL + nome + tag FORMULADOTA + status_message + 3 heróis favoritos | VERIFIED | UserAvatar xl, h1 username, "FORMULADOTA" como brand string, status_message italic, favoriteHeroes slice(0,3) com Image |
| `src/components/profile/profile-tabs.tsx` | 4 tabs SSR via searchParams + VALID_TABS + ProfileTab type | VERIFIED | VALID_TABS array, ProfileTab type, Link-based routing sem useState |
| `src/components/profile/tab-conduta.tsx` | HonorRankMedal xl + breakdown + behavior_status badge + link releia | VERIFIED | HonorRankMedal size="xl", BreakdownCard grid, behaviorStatusLabel, Link /codigo-de-conduta |
| `src/components/profile/tab-historico.tsx` | EmptyState (aceito como stub V1 per PLAN 09-07) | VERIFIED (stub aceitavel) | EmptyState honesto documentado; MatchCard adiado pra V2 sem schema real |
| `src/components/profile/tab-conquistas.tsx` | EmptyState (aceito como stub V1 per PLAN 09-07) | VERIFIED (stub aceitavel) | EmptyState honesto; AchievementBadge adiado pra V2 sem RPC real |
| `src/components/profile/tab-perfil.tsx` | Link navegacional pra Tab Conquistas | VERIFIED | Link /me?tab=conquistas com texto contextual |
| `src/components/profile/edit-profile-modal.tsx` | Dialog takeover com 4 abas + toast + Server Actions | VERIFIED | DialogRoot, 4 abas (status/heroes/portrait/avatar), toast() em cada aba, closeAfterDelay 800ms |
| `src/components/profile/hero-picker.tsx` | Grid pesquisável 127 heróis, modo multi/single | VERIFIED | getAllHeroes()/searchHeroes() em useMemo, toggle logic com limite, role="listbox" |
| `src/components/profile/avatar-upload.tsx` | Upload Supabase Storage + canvas crop + saveCustomAvatarUrl | VERIFIED | createImageBitmap + Canvas crop 256x256 + supabase.storage.upload + saveCustomAvatarUrl Server Action |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shell.tsx` | `sidebar-preference.ts` getSidebarExpanded | import + await call in Promise.all | WIRED | Linha 36 import, linha 100 chamada |
| `shell.tsx` | `queries/friends.ts` getAcceptedFriends | import + await call in Promise.all | WIRED | Linha 37 import, linha 102 chamada |
| `left-sidebar.tsx` | `sidebar-preference.ts` toggleSidebar | form action={toggleSidebar} | WIRED | Linha 14 import, linha 62 form action |
| `left-sidebar-expanded.tsx` | `friends-list.tsx` FriendsList | import + render com props | WIRED | Linha 15 import, linha 98 render com currentUserId e initialFriends |
| `friends-list.tsx` | `presence.ts` usePresenceChannel | import + call | WIRED | Linha 8 import, linha 19 call com currentUserId |
| `friend-row.tsx` | `friends.ts` actions (remove/accept/reject) | import + startTransition calls | WIRED | Linha 15 import, ações nos botões com startTransition |
| `me/page.tsx` | `queries/profile.ts` getProfileForMe | import + await call | WIRED | Linha 13 import, linha 56 await call |
| `me/page.tsx` | ClientShell immersive centerHero | prop passada com portrait_url | WIRED | Linha 84: centerHero={centerHero} |
| `profile-page.tsx` | `edit-profile-modal.tsx` EditProfileModal | import + render no canto superior | WIRED | Linha 10 import, linha 36-44 render com props reais |
| `edit-profile-modal.tsx` | `actions/profile.ts` Server Actions | import + startTransition calls | WIRED | Linha 23 import, todos os handleSave chamam actions reais |
| `edit-profile-modal.tsx` | `hero-picker.tsx` HeroPicker | import + render em 2 abas | WIRED | Linha 21 import, linhas 272 e 327 render |
| `edit-profile-modal.tsx` | `avatar-upload.tsx` AvatarUpload | import + render na aba Avatar | WIRED | Linha 22 import, linha 112 render |
| `hero-picker.tsx` | `queries/heroes.ts` getAllHeroes/searchHeroes | import + useMemo call | WIRED | Linha 10 import, linha 28 em useMemo |
| `actions/profile.ts` | `queries/heroes.ts` isValidHeroSlug | import + Zod refine | WIRED | Linha 13 import, linhas 61 e 106 validation |
| `queries/profile.ts` | `queries/heroes.ts` getHeroBySlug | import + calls para portrait e favoritos | WIRED | Linha 5 import, linhas 78 e 87 calls |
| `avatar-upload.tsx` | `actions/avatar.ts` saveCustomAvatarUrl | import + startTransition call | WIRED | Linha 11 import, linha 99 call |
| `presence.ts` | `actions/profile.ts` updateLastSeen | import + heartbeat interval | WIRED | Linha 17 import, linha 82 heartbeat call |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `profile-identity.tsx` | favoriteHeroes, statusMessage | `getProfileForMe` via DB query + `getHeroBySlug` lookup | Sim — DB query real em `profiles` com `favorite_heroes` JSONB | FLOWING |
| `profile-stats.tsx` | mmr, partidas, vitorias, derrotas | `getProfileForMe` via `player_season_mmr` query | Sim — quando season ativa existe | FLOWING |
| `friends-list.tsx` | initialFriends | `getAcceptedFriends` em shell.tsx via `friendships` table JOIN `profiles` | Sim — DB query real | FLOWING |
| `friend-row.tsx` | presenceStatus | `usePresenceChannel` Supabase Realtime | Sim — channel "online-users" Supabase Realtime | FLOWING |
| `tab-conduta.tsx` | honorRank, behaviorStatus, doctrineAcceptedAt | `getProfileForMe` + RPC `get_honor_tier` | Sim — behaviorStatus e doctrineAcceptedAt do DB; commends/strikes = null (V2) | FLOWING (commends/strikes STATIC null por design) |
| `tab-historico.tsx` | N/A | EmptyState — sem dados | N/A — stub intencional per plan 09-07 | STATIC (intencional V1) |
| `tab-conquistas.tsx` | N/A | EmptyState — sem dados | N/A — stub intencional per plan 09-07 | STATIC (intencional V1) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| dota-heroes.json schema completo (127 heróis, 10 campos) | `node -e "const h=require('./src/data/dota-heroes.json'); console.log(h.length, Object.keys(h[0]).length)"` | 127 10 | PASS |
| TypeScript zero erros | `pnpm typecheck` | Sem output de erro (exit 0) | PASS |
| ESLint zero warnings/errors | `pnpm lint` | Sem output de erro (exit 0) | PASS |
| Valve CDN no next.config.ts | `grep -c "cdn.cloudflare.steamstatic.com" next.config.ts` | 1 | PASS |
| gen:heroes script registrado | `grep "gen:heroes" package.json` | `"gen:heroes": "npx tsx scripts/gen-heroes.ts"` | PASS |
| Heroes queries wired | `grep -r "getHeroBySlug\|searchHeroes\|getAllHeroes\|isValidHeroSlug" src/ \| grep -v heroes.ts \| wc -l` | 8 (actions/profile.ts, queries/profile.ts, components/profile/hero-picker.tsx) | PASS |
| Sidebar preference wired in shell | `grep "getSidebarExpanded\|getAcceptedFriends" src/components/client-shell/shell.tsx` | Ambas presentes | PASS |
| D-31 blockUser implementado | `grep "export async function blockUser" src/actions/friends.ts` | Found | PASS |

---

### D-01 a D-40 Coverage Table

| D | Descrição | Implementação | Status |
|---|-----------|--------------|--------|
| D-01 | Cookie sidebar_expanded não-httpOnly, SSR-safe | `sidebar-preference.ts` httpOnly: false intencional | COVERED |
| D-02 | Default state = expandida | `getSidebarExpanded` retorna true se cookie ausente | COVERED |
| D-03 | Collapsed 72px: avatar clicável + ícones empilhados | `left-sidebar-collapsed.tsx` | COVERED |
| D-04 | Expanded 340px: ProfileCard + FichasCard + Atalhos + FriendsList | `left-sidebar-expanded.tsx` | COVERED |
| D-05 | Toggle ChevronsLeft/ChevronsRight visível em ambos estados | `left-sidebar.tsx` form action no topo | COVERED |
| D-06 | Server Action toggleSidebar setta cookie + revalidatePath("layout") | `sidebar-preference.ts` toggleSidebar | COVERED |
| D-07 | Card inteiro mini-perfil envolvido em Link /me | `left-sidebar-expanded.tsx` ProfileCard em Link; `left-sidebar-collapsed.tsx` avatar em Link | COVERED |
| D-08 | Layout 3 colunas (stats 280px / identidade / hero portrait background) | ClientShell immersive com 2-col interno (stats + identidade), portrait via centerHero fullscreen | COVERED |
| D-09 | Hero portrait de fundo = URL Valve do hero selecionado | `me/page.tsx` centerHero={profile.heroPortraitData?.portrait_url}; `queries/profile.ts` getHeroBySlug | COVERED |
| D-10 | Tabs: Perfil / Histórico / Conquistas / Conduta | `profile-tabs.tsx` VALID_TABS; `me/page.tsx` routing por searchParams | COVERED |
| D-11 | Botão EDITAR PERFIL canto superior direito abre modal | `profile-page.tsx` absolute top-4 right-4; `edit-profile-modal.tsx` DialogRoot | COVERED |
| D-12 | Tab Perfil: identidade canônica (avatar XL + nome + medalhas + status + heróis) | `profile-identity.tsx`, `profile-stats.tsx`, `tab-perfil.tsx` | COVERED |
| D-13 | Tab Histórico: embed últimas partidas via MatchCard | EmptyState V1 stub per decisão do plan 09-07 (MatchCard adiado pra V2 sem schema real) | COVERED (stub aceito) |
| D-14 | Tab Conquistas: grid AchievementBadge com tooltip | EmptyState V1 stub per decisão do plan 09-07 (sem RPC get_user_achievements) | COVERED (stub aceito) |
| D-15 | Tab Conduta: HonorRankMedal xl + breakdown + behavior_status + link conduta | `tab-conduta.tsx` HonorRankMedal size="xl", BreakdownCard, behaviorStatusLabel, Link /codigo-de-conduta | COVERED |
| D-16 | Modal in-page via Dialog primitive (não rota dedicada) | `edit-profile-modal.tsx` DialogRoot/DialogContent variant="takeover" | COVERED |
| D-17 | Modal tem 4 abas internas: Status / Heróis / Portrait / Avatar | `edit-profile-modal.tsx` ModalTab type + 4 ModalTabButtons | COVERED |
| D-18 | Aba Status: textarea 60 chars com counter + updateStatusMessage | `edit-profile-modal.tsx` StatusForm; `actions/profile.ts` updateStatusMessage | COVERED |
| D-19 | Aba Heróis Favoritos: grid 127 heróis, até 3, JSONB array | `edit-profile-modal.tsx` HeroesForm + HeroPicker mode="multi"; `actions/profile.ts` updateFavoriteHeroes | COVERED |
| D-20 | Aba Hero Portrait: grid pesquisável, 1 herói, salva hero_portrait_slug | `edit-profile-modal.tsx` PortraitForm + HeroPicker mode="single"; `actions/profile.ts` updateHeroPortrait | COVERED |
| D-21 | Aba Avatar: upload 5MB max, png/jpg/webp, crop 256x256, bucket profile-avatars | `avatar-upload.tsx` canvas crop + supabase.storage.upload; `actions/avatar.ts` saveCustomAvatarUrl | COVERED |
| D-22 | Todas Server Actions com Zod + RLS gate (auth.uid() = user_id) | Todas actions em `actions/profile.ts`, `actions/avatar.ts`, `actions/friends.ts` com ZodSchema.safeParse + auth.getUser() | COVERED |
| D-23 | Bundle JSON estático sem fetch API live | `dota-heroes.json` importado diretamente; `heroes.ts` sem fetch | COVERED |
| D-24 | Schema 10 campos: id, slug, name_pt, name_en, roles[], primary_attr, complexity, image_full, image_icon, portrait_url | Confirmado via node verify — exatamente 10 chaves | COVERED |
| D-25 | Script gen:heroes pra regenerar via OpenDota | `scripts/gen-heroes.ts` + `"gen:heroes": "npx tsx scripts/gen-heroes.ts"` no package.json | COVERED |
| D-26 | Apenas URLs Valve oficiais pra portrait (sem upload custom de background) | URLs construídas como `cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/renders/{slug}.png` | COVERED |
| D-27 | Tabela friendships (id, requester_id, addressee_id, status, created_at, updated_at) | `035_friendships.sql` | COVERED |
| D-28 | Status: pending/accepted/rejected/blocked | CHECK constraint no `035_friendships.sql` | COVERED |
| D-29 | Modelo mutual com confirmação (não follow assimétrico) | friendships_unique_pair LEAST/GREATEST; acceptFriendRequest só por addressee | COVERED |
| D-30 | RLS: user só vê friendships onde participa | 4 RLS policies em `035_friendships.sql` | COVERED |
| D-31 | 5 Server Actions: sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser | `actions/friends.ts` todas 5 implementadas | COVERED |
| D-32 | Sem limite máximo de amigos em V1 | Sem constraint de limite em queries ou migration | COVERED |
| D-33 | Index em (requester_id, status) e (addressee_id, status) | `idx_friendships_requester_status` + `idx_friendships_addressee_status` em `035_friendships.sql` | COVERED |
| D-34 | Supabase Realtime presence channel — fonte única | `presence.ts` supabase.channel("online-users") | COVERED |
| D-35 | Online = aba aberta agora | channel.track() no SUBSCRIBED + presenceState sync | COVERED |
| D-36 | Lista amigos: online (ring colorido) e offline (grayscale + last_seen relativo) | `friend-row.tsx` opacity-60 pra offline + formatLastSeen; UserAvatar presence prop | COVERED |
| D-37 | Persiste last_seen_at via heartbeat 60s | `presence.ts` HEARTBEAT_MS=60000 + updateLastSeen(); `actions/profile.ts` updateLastSeen | COVERED |
| D-38 | Migration profile_extended.sql com 5 colunas + CHECKs | `034_profile_extended.sql` | COVERED |
| D-39 | Migration friendships.sql + RLS + indexes | `035_friendships.sql` | COVERED |
| D-40 | Migration storage_profile_avatars.sql + bucket + policies | `036_storage_profile_avatars.sql` | COVERED |

**Cobertura D: 40/40**

---

### Requirements Coverage

| Requirement | Plano | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| D-01 a D-40 | 09-01 a 09-08 | Todos os 40 decision requirements | SATISFIED | Ver tabela D acima — 40/40 cobertos |
| C14 | Todos os planos | Zero hex hardcoded em arquivos novos | SATISFIED | grep #[hex] em profile/, actions/, lib/ retornou zero matches |
| C5 | 09-07, 09-08 | Acessibilidade WCAG 2.1 AA | SATISFIED | role="tablist"/"tab"/aria-selected em profile-tabs.tsx; role="listbox"/"option" em hero-picker.tsx; role="status" em tab-conduta.tsx |
| B6 | Todos | Zero menção "Pedro Paulo" em strings user-facing | SATISFIED | grep retornou zero matches em profile/, actions/, me/ |

---

### Anti-Patterns Found

| Arquivo | Padrão | Severidade | Impacto |
|---------|--------|------------|---------|
| `tab-historico.tsx` | EmptyState sem dados reais (MatchCard adiado) | INFO | Intencional — documentado no SUMMARY e PLAN como stub V1. Não bloqueia goal. |
| `tab-conquistas.tsx` | EmptyState sem dados reais (AchievementBadge adiado) | INFO | Intencional — documentado no SUMMARY e PLAN como stub V1. RPC get_user_achievements não existe ainda. |
| `tab-conduta.tsx` | commends e strikes null (V2 RPCs) | INFO | Exibe "—" como placeholder honesto. Não bloqueia Tab Conduta — behaviorStatus e doctrineAcceptedAt são reais. |
| `src/lib/realtime/hooks.ts` | TODO comments em useCoachPresence/useCommunityStats | INFO | Arquivo PRE-EXISTENTE (não Phase 9). presence.ts novo substitui funcionalmente para friendships. |

**Nenhum anti-pattern blocker ou warning encontrado nos arquivos novos da Phase 9.**

---

### Human Verification Required

#### 1. Sidebar collapse/expand UX

**Test:** Abrir /dashboard ou /me logado. Clicar no botão ChevronsLeft (fechar) e ChevronsRight (abrir).
**Expected:** Sidebar anima de 340px pra 72px (ou vice-versa) sem flash. Fechar aba e reabrir: sidebar mantém estado anterior. ProfileCard inteiro clicável navega pra /me.
**Why human:** Transição visual, persistência de cookie no reload, ausência de flash de hidratação SSR.

#### 2. EditProfileModal — fluxo completo

**Test:** Logado em /me, clicar "EDITAR PERFIL". Navegar entre as 4 abas. Aba Status: digitar mensagem e salvar. Aba Heróis: selecionar 3 heróis e salvar. Aba Portrait: selecionar herói e salvar. Aba Avatar: enviar imagem PNG 300x300px.
**Expected:** Modal abre como takeover fullscreen. Cada save mostra toast de sucesso e fecha o modal após 800ms. Perfil atualiza no /me sem reload manual.
**Why human:** Interação Client Component completa, toast UI, revalidação de Server Cache, upload real para Supabase Storage.

#### 3. FriendsList presence realtime

**Test:** Abrir FormulaDota em 2 browsers com usuários diferentes que são amigos. Verificar status online/offline na sidebar.
**Expected:** User com aba aberta aparece online (ring colorido, sem opacity). User que fecha aba fica offline (opacity-60, "Visto há Xmin").
**Why human:** Requer dois browsers com sessões distintas e conexão WebSocket Supabase Realtime live.

#### 4. Hero portrait fullscreen no /me

**Test:** Logado, definir hero_portrait_slug via EditProfileModal. Abrir /me.
**Expected:** Portrait do herói aparece como fundo fullscreen cobrindo toda a viewport (incluindo atrás das sidebars overlay). Gradient overlay mantém legibilidade do conteúdo.
**Why human:** Fidelidade visual ao Dota 2 client — requer inspeção humana do layout no browser real.

#### 5. Sistema de friendships end-to-end

**Test:** User A envia pedido de amizade para User B (via sendFriendRequest). User B aceita na sidebar (FriendRow). Ambos aparecem na lista um do outro.
**Expected:** FriendRow pending mostra botões Check/X. Aceitar atualiza sidebar em ambas as sessões via revalidatePath.
**Why human:** Fluxo multi-user requer duas sessões ativas; revalidação de cache no lado do requester não é verificável programaticamente.

---

### Gaps Summary

**Nenhum gap blocker identificado.** Todos os 40 decision requirements (D-01 a D-40) têm implementação real no codebase.

Os dois stubs encontrados (Tab Histórico e Tab Conquistas) são intencionais, documentados no PLAN 09-07 como aceitáveis em V1, e não bloqueiam o goal da phase. Os dados (partidas e achievements) simplesmente não existem ainda no schema pós-Phase 8.

Cross-cutting compliance:
- `pnpm typecheck`: 0 erros
- `pnpm lint`: 0 erros
- console.log: zero em Client Components novos (apenas console.error em Server Actions — conforme CLAUDE.md)
- "Pedro Paulo" em strings user-facing: zero
- Hex hardcoded em arquivos novos: zero

---

_Verified: 2026-05-26_
_Verifier: Claude (gsd-verifier)_
