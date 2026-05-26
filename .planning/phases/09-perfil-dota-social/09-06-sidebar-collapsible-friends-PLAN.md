---
phase: 09-perfil-dota-social
plan: 06
type: execute
wave: 3
depends_on: ["09-05a", "09-05b"]
files_modified:
  - src/components/client-shell/shell.tsx
  - src/components/client-shell/left-sidebar.tsx
  - src/components/profile/friends-list.tsx
  - src/components/profile/friend-row.tsx
autonomous: true
requirements:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-05
  - D-06
  - D-07
  - D-34
  - D-35
  - D-36
  - D-37
  - C14
  - C17
  - C5
  - C6
  - B6
must_haves:
  truths:
    - "Sidebar tem 2 estados visuais: collapsed (72px só avatar+ícones) e expanded (340px ProfileCard+Fichas+Atalhos+Friends)"
    - "Toggle button usa ChevronsLeft (expanded) / ChevronsRight (collapsed) Lucide, aria-expanded correto"
    - "Cookie sidebar_expanded lido em Server Component (shell.tsx) — sem flash no SSR (pitfall 1)"
    - "Mini-perfil expanded envolto em <Link href='/me'> com hover state — card inteiro clicável (D-07)"
    - "FriendsList real renderiza online (ring+PresenceDot) e offline (grayscale + formatLastSeen)"
    - "Em mobile (<768px) sidebar vira drawer overlay (UI-SPEC mobile section)"
    - "Sidebar em width 72px em collapsed mode e default 340px (xl: 400px, 2xl: 460px) em expanded"
    - "ZERO console.error/console.log em FriendRow (CLAUDE.md proíbe console em Client Component)"
  artifacts:
    - path: "src/components/client-shell/shell.tsx"
      provides: "Shell refatorado que lê cookie e ajusta grid columns"
      contains: "getSidebarExpanded"
    - path: "src/components/client-shell/left-sidebar.tsx"
      provides: "Sidebar com 2 estados + toggle + FriendsList integration"
      contains: "ChevronsLeft"
    - path: "src/components/profile/friends-list.tsx"
      provides: "Lista realtime de amigos consumindo usePresenceChannel + getAcceptedFriends"
      contains: "usePresenceChannel"
    - path: "src/components/profile/friend-row.tsx"
      provides: "Row individual: avatar + nome + presence + actions"
      contains: "PresenceDot"
  key_links:
    - from: "shell.tsx"
      to: "src/lib/auth/sidebar-preference.ts::getSidebarExpanded"
      via: "await call no top do Server Component"
      pattern: "getSidebarExpanded"
    - from: "left-sidebar.tsx"
      to: "src/lib/auth/sidebar-preference.ts::toggleSidebar"
      via: "<form action={toggleSidebar}>"
      pattern: "action=\\{toggleSidebar\\}"
    - from: "friends-list.tsx"
      to: "src/lib/realtime/presence.ts::usePresenceChannel"
      via: "import + call com currentUserId"
      pattern: "usePresenceChannel"
    - from: "friends-list.tsx"
      to: "src/lib/queries/friends.ts::getAcceptedFriends (server fetch via parent)"
      via: "props.initialFriends passada do server"
      pattern: "initialFriends"
---

<objective>
Refatorar sidebar esquerda do ClientShell pra suportar 2 estados (collapsed 72px / expanded 340px) com toggle persistido em cookie + FriendsList real consumindo presence channel + render mini-perfil como link clicável pra /me.

Purpose: É a transformação visível principal da Phase 9 — toda página autenticada ganha sidebar Dota 2 client real (referência: `perfil-dota.png` + `perfil-dota-miniperfil+amigos-expandido.png`). Sem isso, /me reescrito em plan 09-07 fica solto sem o sistema de navegação Dota 2 ao redor.

Output: shell.tsx lê cookie SSR + ajusta grid columns dinâmico, left-sidebar.tsx renderiza 2 estados visuais com toggle button + integra FriendsList em modo expanded, 2 componentes novos (`FriendsList` + `FriendRow`) consomem hooks/queries dos plans 09-05a/09-05b.

Endereça decisões: D-01 a D-07 (sidebar), D-34 a D-37 (presence), C5 (WCAG aria-expanded), C6 (Lucide icons), C14 (zero hex), C17 (z-tokens), B6 (sem nome próprio Pedro em strings novas).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@.planning/phases/09-perfil-dota-social/09-UI-SPEC.md
@src/components/client-shell/shell.tsx
@src/components/client-shell/left-sidebar.tsx
@src/lib/auth/sidebar-preference.ts
@src/lib/realtime/presence.ts
@src/lib/queries/friends.ts
@.planning/phases/09-perfil-dota-social/09-05a-SUMMARY.md
@.planning/phases/09-perfil-dota-social/09-05b-SUMMARY.md

<interfaces>
<!-- shell.tsx CURRENT signature do DashboardLeftSidebar (left-sidebar.tsx): -->
```typescript
interface Props {
  isVisitor: boolean;
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  floating?: boolean;
}
```

<!-- NOVA signature pós-refactor (Phase 9): -->
```typescript
interface Props {
  isVisitor: boolean;
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  floating?: boolean;
  // NOVOS:
  expanded: boolean;  // cookie sidebar_expanded lido no shell.tsx
  currentUserId: string | null; // pra usePresenceChannel
  initialFriends: FriendListEntry[]; // server-fetched de getAcceptedFriends
}
```

<!-- UI-SPEC sidebar collapsed (72px): só toggle + UserAvatar md + 3 ícones empilhados. -->
<!-- UI-SPEC sidebar expanded (340px): toggle + ProfileCard (Link /me) + FichasCard + Atalhos nav + FriendsList. -->

<!-- Grid columns ajustados em shell.tsx (default mode): -->
<!-- expanded: [340px_1fr_320px] xl:[400px_1fr_360px] 2xl:[460px_1fr_380px] (atual) -->
<!-- collapsed: [72px_1fr_320px] xl:[72px_1fr_360px] 2xl:[72px_1fr_380px] -->

<!-- FriendsList consome FriendListEntry de src/lib/queries/friends.ts -->
<!-- e UserPresencePayload de src/lib/realtime/presence.ts -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar FriendRow + FriendsList components</name>
  <files>
    src/components/profile/friend-row.tsx,
    src/components/profile/friends-list.tsx
  </files>
  <read_first>
    - src/components/ui/avatar.tsx (UserAvatar API: size, ringColor, presence)
    - src/components/ui/presence-dot.tsx (PresenceDot API: status, size, showLabel)
    - src/components/ui/empty-state.tsx (EmptyState API)
    - src/lib/realtime/presence.ts (usePresenceChannel, getPresenceStatus, formatLastSeen)
    - src/lib/queries/friends.ts (FriendListEntry interface)
    - src/actions/friends.ts (removeFriend, acceptFriendRequest, rejectFriendRequest)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seção "Lista de amigos — row spec" + Copywriting Contract (toda string PT-BR)
    - CLAUDE.md (proibido console.* em Client Component fora de server actions)
  </read_first>
  <action>
    1. Criar `src/components/profile/friend-row.tsx`:

    **ATENÇÃO (WARNING #13 fix):** CLAUDE.md proíbe `console.error`/`console.log` fora de Server Actions. Erros de Server Action devem virar UI feedback (toast ou inline error), NÃO console. Usar try/catch silencioso (ou propagar pra parent) — sem console.

    ```tsx
    "use client";
    // Row individual de amigo na sidebar (Phase 9 — UI-SPEC "Lista de amigos — row spec").
    // - Avatar sm (32px) com presence dot
    // - Nome 13px font-display weight 600
    // - Status "Visto há Xh" se offline (formatLastSeen)
    // - Hover: bg-bg-elevated/60 + ícone UserMinus aparece pra remover
    // - Confirmação inline (não modal) ao clicar UserMinus
    //
    // CLAUDE.md: SEM console.* — Server Action errors são silent failure no MVP
    // (futura iteração: passar onError prop pro parent dispatch toast).

    import { useState, useTransition } from "react";
    import { UserMinus, X, Check } from "lucide-react";
    import { UserAvatar } from "@/components/ui/avatar";
    import { Button } from "@/components/ui/button";
    import { removeFriend, acceptFriendRequest, rejectFriendRequest } from "@/actions/friends";
    import { formatLastSeen, type PresenceStatus } from "@/lib/realtime/presence";
    import type { FriendListEntry } from "@/lib/queries/friends";

    interface Props {
      friend: FriendListEntry;
      presenceStatus: PresenceStatus | "offline";
    }

    export function FriendRow({ friend, presenceStatus }: Props) {
      const [confirming, setConfirming] = useState(false);
      const [isPending, startTransition] = useTransition();
      const isOnline = presenceStatus !== "offline";

      const handleRemove = () => {
        startTransition(async () => {
          try {
            await removeFriend(friend.friendshipId);
          } catch {
            // Silent fail — CLAUDE.md proíbe console em Client Component.
            // V2: propagar erro via onError prop pra parent disparar toast global.
          }
          setConfirming(false);
        });
      };

      // Confirmação inline (não modal) — UI-SPEC seção Interaction Contracts > Remoção de amigo
      if (confirming) {
        return (
          <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-bg-elevated/80">
            <p className="flex-1 min-w-0 truncate font-display text-[13px] font-semibold text-text-body">
              Remover {friend.friendUsername ?? "amigo"}?
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
              aria-label={`Confirmar remoção de ${friend.friendUsername ?? "amigo"}`}
            >
              REMOVER
            </Button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Cancelar remoção"
              className="text-text-faded hover:text-text-display p-1"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      }

      return (
        <div
          role="listitem"
          className={`group flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated/60 ${isOnline ? "" : "opacity-60"}`}
        >
          <UserAvatar
            src={friend.friendAvatarUrl ?? undefined}
            alt={`Avatar de ${friend.friendUsername ?? "amigo"}`}
            fallback={(friend.friendUsername ?? "??").slice(0, 2).toUpperCase()}
            size="sm"
            presence={isOnline ? (presenceStatus as PresenceStatus) : "offline"}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`font-display text-[13px] font-semibold truncate ${isOnline ? "text-text-body" : "text-text-faded"}`}
            >
              {friend.friendUsername ?? "Anônimo"}
            </p>
            {!isOnline && (
              <p className="font-display text-[13px] font-semibold text-text-faded truncate">
                {formatLastSeen(friend.friendLastSeenAt) ?? "—"}
              </p>
            )}
            {isOnline && presenceStatus === "in-match" && (
              <p className="font-display text-[13px] font-semibold text-play-primary truncate">
                Em partida
              </p>
            )}
            {isOnline && presenceStatus === "in-queue" && (
              <p className="font-display text-[13px] font-semibold text-brand-primary truncate">
                Na fila
              </p>
            )}
          </div>
          {friend.status === "accepted" && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remover ${friend.friendUsername ?? "amigo"} da lista de amigos`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-faded hover:text-error p-1"
            >
              <UserMinus size={14} aria-hidden="true" />
            </button>
          )}
          {friend.status === "pending" && friend.direction === "incoming" && (
            <>
              <button
                type="button"
                onClick={() => startTransition(() => acceptFriendRequest(friend.friendshipId))}
                disabled={isPending}
                aria-label={`Aceitar pedido de ${friend.friendUsername ?? "amigo"}`}
                className="text-text-faded hover:text-success p-1"
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => rejectFriendRequest(friend.friendshipId))}
                disabled={isPending}
                aria-label={`Recusar pedido de ${friend.friendUsername ?? "amigo"}`}
                className="text-text-faded hover:text-error p-1"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      );
    }
    ```

    2. Criar `src/components/profile/friends-list.tsx`:

    ```tsx
    "use client";
    // Lista realtime de amigos com presence (Phase 9).
    // Consome usePresenceChannel + initialFriends (server-fetched).

    import { useMemo } from "react";
    import { usePresenceChannel, getPresenceStatus } from "@/lib/realtime/presence";
    import { EmptyState } from "@/components/ui/empty-state";
    import { FriendRow } from "./friend-row";
    import type { FriendListEntry } from "@/lib/queries/friends";

    interface Props {
      currentUserId: string;
      initialFriends: FriendListEntry[];
    }

    export function FriendsList({ currentUserId, initialFriends }: Props) {
      const presenceMap = usePresenceChannel(currentUserId);

      const { online, offline, onlineCount } = useMemo(() => {
        const o: FriendListEntry[] = [];
        const off: FriendListEntry[] = [];
        for (const f of initialFriends) {
          const s = getPresenceStatus(f.friendUserId, presenceMap);
          if (s === "offline") off.push(f);
          else o.push(f);
        }
        return { online: o, offline: off, onlineCount: o.length };
      }, [initialFriends, presenceMap]);

      if (initialFriends.length === 0) {
        return (
          <EmptyState
            title="Sua lista de amigos está vazia."
            description="Encontre jogadores na comunidade e adicione-os como amigos."
          />
        );
      }

      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Online agora
            </p>
            {onlineCount > 0 && (
              <span className="font-display text-[13px] font-semibold text-brand-primary">
                {onlineCount}
              </span>
            )}
          </div>

          <div role="list" className="flex flex-col">
            {online.length === 0 ? (
              <p className="px-2 py-1 font-display text-[13px] font-semibold text-text-faded">
                Nenhum amigo online agora.
              </p>
            ) : (
              online.map((f) => (
                <FriendRow
                  key={f.friendshipId}
                  friend={f}
                  presenceStatus={getPresenceStatus(f.friendUserId, presenceMap)}
                />
              ))
            )}
          </div>

          {offline.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-2 mt-2 pt-2 border-t border-border-subtle">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text-faded">
                  Offline
                </p>
              </div>
              <div role="list" className="flex flex-col">
                {offline.map((f) => (
                  <FriendRow
                    key={f.friendshipId}
                    friend={f}
                    presenceStatus="offline"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && wc -l src/components/profile/friend-row.tsx src/components/profile/friends-list.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/profile/friend-row.tsx` existe com `"use client"`
    - `src/components/profile/friends-list.tsx` existe com `"use client"`
    - `grep "usePresenceChannel" src/components/profile/friends-list.tsx` retorna 1 match
    - `grep "formatLastSeen" src/components/profile/friend-row.tsx` retorna 1 match
    - `grep "removeFriend\|acceptFriendRequest\|rejectFriendRequest" src/components/profile/friend-row.tsx` retorna 3 matches
    - `grep "EmptyState" src/components/profile/friends-list.tsx` retorna >=1 match
    - `grep "PresenceDot\|presence=" src/components/profile/friend-row.tsx` retorna >=1 match (PresenceDot via UserAvatar prop)
    - `grep "aria-label" src/components/profile/friend-row.tsx` retorna >=3 matches (acessibilidade C5)
    - **`grep "console\." src/components/profile/friend-row.tsx` retorna 0 matches** (CLAUDE.md proíbe console em Client Component — WARNING #13 fix)
    - **`grep "console\." src/components/profile/friends-list.tsx` retorna 0 matches**
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/friend-row.tsx src/components/profile/friends-list.tsx` retorna 0 matches (C14)
    - `grep -E "z-\[?[0-9]" src/components/profile/friend-row.tsx src/components/profile/friends-list.tsx` retorna 0 matches (C17)
    - `pnpm typecheck` 0 erros
    - `pnpm lint src/components/profile/` 0 erros
    - Cada arquivo < 200 linhas
  </acceptance_criteria>
  <done>FriendsList renderiza dinâmico online/offline com presence + actions inline. Aceitar/recusar/remover funcionam via Server Actions sem reload. ZERO console.* (CLAUDE.md compliant).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Refatorar left-sidebar.tsx (collapsed/expanded + ProfileCard clicável + FriendsList)</name>
  <files>src/components/client-shell/left-sidebar.tsx</files>
  <read_first>
    - src/components/client-shell/left-sidebar.tsx (versão atual — entender ProfileCard, FichasCard, atalhos nav)
    - src/lib/auth/sidebar-preference.ts (toggleSidebar — chamado via form action)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Sidebar Esquerda — Estado Collapsed" e "Estado Expanded" e "Interaction Contracts > Sidebar Toggle"
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seção "Copywriting Contract" (tooltips e labels exatos PT-BR)
  </read_first>
  <action>
    Reescrever `src/components/client-shell/left-sidebar.tsx`. Estrutura:

    ```tsx
    // Left Sidebar — refatorada Phase 9.
    // 2 estados (D-03/D-04):
    //   - collapsed (72px): toggle + UserAvatar md (Link /me) + 3 ícones empilhados
    //   - expanded (340px): toggle + ProfileCard (Link /me) + FichasCard + Atalhos + FriendsList

    import Link from "next/link";
    import {
      Coins,
      ExternalLink,
      MessageSquare,
      BookOpen,
      LogIn,
      ChevronsLeft,
      ChevronsRight,
      User,
    } from "lucide-react";
    import { signInWithDiscord } from "@/app/login/actions";
    import { toggleSidebar } from "@/lib/auth/sidebar-preference";
    import { FriendsList } from "@/components/profile/friends-list";
    import type { FriendListEntry } from "@/lib/queries/friends";

    interface Props {
      isVisitor: boolean;
      persona: string | null;
      avatar: string | null;
      tag: string;
      isAdmin: boolean;
      fichaBalance: number;
      floating?: boolean;
      // NOVOS — Phase 9
      expanded: boolean;
      currentUserId: string | null;
      initialFriends: FriendListEntry[];
    }

    export function DashboardLeftSidebar({
      isVisitor,
      persona,
      avatar,
      tag,
      isAdmin,
      fichaBalance,
      floating,
      expanded,
      currentUserId,
      initialFriends,
    }: Props) {
      const baseWrapperCls = expanded
        ? "flex-col gap-3 bg-gradient-to-r from-black/70 via-black/40 to-transparent p-4 backdrop-blur-sm"
        : "flex-col items-center gap-3 bg-bg-base/90 backdrop-blur-sm py-4 px-3";

      const wrapperCls = floating
        ? `flex w-full ${baseWrapperCls} overflow-y-auto`
        : `hidden lg:flex ${baseWrapperCls} overflow-y-auto`;

      return (
        <aside className={wrapperCls} aria-label="Sidebar de identidade e amigos">
          {/* Toggle button — visível em ambos estados (D-05) */}
          <form action={toggleSidebar} className={expanded ? "self-end" : "self-center"}>
            <button
              type="submit"
              aria-label={expanded ? "Recolher sidebar" : "Expandir sidebar"}
              aria-expanded={expanded}
              title={expanded ? "Recolher sidebar" : "Expandir sidebar"}
              className="text-text-muted hover:text-text-display p-1 transition-colors"
            >
              {expanded ? (
                <ChevronsLeft size={16} aria-hidden="true" />
              ) : (
                <ChevronsRight size={16} aria-hidden="true" />
              )}
            </button>
          </form>

          {expanded ? (
            <ExpandedContent
              isVisitor={isVisitor}
              persona={persona}
              avatar={avatar}
              tag={tag}
              isAdmin={isAdmin}
              fichaBalance={fichaBalance}
              currentUserId={currentUserId}
              initialFriends={initialFriends}
            />
          ) : (
            <CollapsedContent
              isVisitor={isVisitor}
              avatar={avatar}
              persona={persona}
            />
          )}
        </aside>
      );
    }

    // ===========================================================================
    // EXPANDED state (340px)
    // ===========================================================================

    function ExpandedContent({
      isVisitor,
      persona,
      avatar,
      tag,
      isAdmin,
      fichaBalance,
      currentUserId,
      initialFriends,
    }: {
      isVisitor: boolean;
      persona: string | null;
      avatar: string | null;
      tag: string;
      isAdmin: boolean;
      fichaBalance: number;
      currentUserId: string | null;
      initialFriends: FriendListEntry[];
    }) {
      return (
        <>
          {isVisitor ? (
            <VisitorCard />
          ) : (
            <>
              {/* ProfileCard clicável → /me (D-07) */}
              <Link
                href="/me"
                aria-label="Ver meu perfil"
                className="block rounded-md border border-border-subtle bg-gradient-to-b from-bg-elevated/90 to-bg-deep/60 p-3 hover:bg-bg-elevated/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt={`Avatar de ${persona ?? "Anônimo"}`}
                      className="size-12 shrink-0 rounded-full border-2 border-brand-primary/60 ring-2 ring-brand-primary/20"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-full border-2 border-brand-primary/60 bg-bg-elevated" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-semibold text-text-display truncate">
                      {persona ?? "Anônimo"}
                    </p>
                    <p className="font-display text-sm font-semibold text-brand-primary/80 mt-0.5">
                      [{tag}]
                      {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
                    </p>
                  </div>
                </div>
              </Link>

              <FichasCard balance={fichaBalance} isAdmin={isAdmin} />
            </>
          )}

          <nav
            aria-label="Atalhos"
            className="space-y-1 rounded-md border border-border-subtle bg-bg-elevated/60 p-2"
          >
            {!isVisitor && (
              <SidebarLink href="/me" label="Meu perfil" icon={User} />
            )}
            <SidebarLink href="/codigo-de-conduta" label="Código de Conduta" icon={BookOpen} />
            <SidebarLink
              href="https://discord.com/invite/v3pSuZhjBE"
              label="Discord oficial"
              icon={MessageSquare}
              external
            />
          </nav>

          {!isVisitor && currentUserId && (
            <div className="flex-1 rounded-md border border-border-subtle bg-bg-deep/30 p-2 overflow-y-auto">
              <FriendsList currentUserId={currentUserId} initialFriends={initialFriends} />
            </div>
          )}
        </>
      );
    }

    // ===========================================================================
    // COLLAPSED state (72px) — D-03
    // ===========================================================================

    function CollapsedContent({
      isVisitor,
      avatar,
      persona,
    }: {
      isVisitor: boolean;
      avatar: string | null;
      persona: string | null;
    }) {
      return (
        <>
          {isVisitor ? (
            <form action={signInWithDiscord}>
              <button
                type="submit"
                aria-label="Entrar com Discord"
                title="Entrar com Discord"
                className="size-10 rounded-full border-2 border-border-subtle bg-bg-deep/80 flex items-center justify-center hover:border-brand-primary/60 transition-colors"
              >
                <LogIn size={16} className="text-text-muted" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <Link
              href="/me"
              aria-label="Ver meu perfil"
              title={persona ? `Ver perfil de ${persona}` : "Ver meu perfil"}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={`Avatar de ${persona ?? "Anônimo"}`}
                  className="size-10 rounded-full border-2 border-brand-primary/60 ring-2 ring-brand-primary/20 hover:ring-brand-primary/60 transition-all"
                />
              ) : (
                <div className="size-10 rounded-full border-2 border-brand-primary/60 bg-bg-elevated" />
              )}
            </Link>
          )}

          <div className="flex flex-col items-center gap-2 mt-2 border-t border-border-subtle pt-3 w-full">
            <CollapsedIcon
              href="/codigo-de-conduta"
              label="Código de Conduta"
              icon={BookOpen}
            />
            <CollapsedIcon
              href="https://discord.com/invite/v3pSuZhjBE"
              label="Discord oficial"
              icon={MessageSquare}
              external
            />
          </div>
        </>
      );
    }

    function CollapsedIcon({
      href,
      label,
      icon: Icon,
      external,
    }: {
      href: string;
      label: string;
      icon: typeof BookOpen;
      external?: boolean;
    }) {
      const cls =
        "size-9 flex items-center justify-center rounded text-text-muted hover:text-text-display hover:bg-bg-elevated/60 transition-colors";
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={cls}
            aria-label={label}
            title={label}
          >
            <Icon size={16} aria-hidden="true" />
          </a>
        );
      }
      return (
        <Link href={href} className={cls} aria-label={label} title={label}>
          <Icon size={16} aria-hidden="true" />
        </Link>
      );
    }

    // ===========================================================================
    // Reusables (preservados do original)
    // ===========================================================================

    function VisitorCard() {
      return (
        <div className="rounded-md border border-border-subtle bg-gradient-to-b from-bg-elevated/90 to-bg-deep/60 p-4">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-full border-2 border-border-subtle bg-bg-deep/80 flex items-center justify-center">
              <LogIn size={16} className="text-text-muted" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-text-display">Visitante</p>
              <p className="font-display text-sm font-medium text-text-muted mt-0.5">Sem sessão</p>
            </div>
          </div>
          <p className="mt-3 font-sans text-sm leading-relaxed text-text-body">
            Entre com Discord pra acompanhar seu perfil, saldo de fichas e fila.
          </p>
          <form action={signInWithDiscord} className="mt-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-3 py-2 font-display text-sm font-semibold text-brand-primary hover:bg-brand-primary/20 hover:text-text-display transition-colors"
            >
              <LogIn size={11} aria-hidden="true" />
              <span>Entrar com Discord</span>
            </button>
          </form>
        </div>
      );
    }

    function FichasCard({ balance, isAdmin }: { balance: number; isAdmin: boolean }) {
      return (
        <div className="rounded-md border border-brand-primary/40 bg-gradient-to-br from-brand-primary/10 to-transparent p-3">
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-brand-primary" aria-hidden="true" />
            <p className="font-display text-sm font-semibold text-text-body">Saldo de fichas</p>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-text-display">
            {isAdmin ? "∞" : balance}
            <span className="ml-2 font-display text-sm font-semibold text-text-body">
              {isAdmin ? "admin" : balance === 1 ? "ficha" : "fichas"}
            </span>
          </p>
          {!isAdmin && balance === 0 && (
            <p className="mt-1 font-mono text-sm text-text-faded">
              Compre uma pra entrar em fila
            </p>
          )}
        </div>
      );
    }

    function SidebarLink({
      href,
      label,
      icon: Icon,
      external,
    }: {
      href: string;
      label: string;
      icon: typeof BookOpen | null;
      external?: boolean;
    }) {
      const cls =
        "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-sm text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
      if (external) {
        return (
          <a href={href} target="_blank" rel="noreferrer" className={cls}>
            {Icon ? <Icon size={12} aria-hidden="true" /> : null}
            {label}
            <ExternalLink size={9} className="ml-auto text-text-faded" aria-hidden="true" />
          </a>
        );
      }
      return (
        <Link href={href} className={cls}>
          {Icon ? <Icon size={12} aria-hidden="true" /> : null}
          {label}
        </Link>
      );
    }
    ```

    Se o arquivo passar de 300 linhas (limite CLAUDE.md C2), extrair `ExpandedContent` e `CollapsedContent` pra arquivos separados em `src/components/client-shell/left-sidebar-expanded.tsx` e `left-sidebar-collapsed.tsx`.
  </action>
  <verify>
    <automated>pnpm typecheck && grep -cE "(ChevronsLeft|ChevronsRight|FriendsList|toggleSidebar)" src/components/client-shell/left-sidebar.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/client-shell/left-sidebar.tsx` modificado
    - `grep "ChevronsLeft" src/components/client-shell/left-sidebar.tsx` retorna >=1 match
    - `grep "ChevronsRight" src/components/client-shell/left-sidebar.tsx` retorna >=1 match
    - `grep "toggleSidebar" src/components/client-shell/left-sidebar.tsx` retorna >=2 matches (import + action)
    - `grep "FriendsList" src/components/client-shell/left-sidebar.tsx` retorna >=2 matches (import + JSX)
    - `grep "aria-expanded=" src/components/client-shell/left-sidebar.tsx` retorna 1 match (C5)
    - `grep "expanded: boolean" src/components/client-shell/left-sidebar.tsx` retorna 1 match (prop signature)
    - `grep "currentUserId" src/components/client-shell/left-sidebar.tsx` retorna >=2 matches
    - `grep "initialFriends" src/components/client-shell/left-sidebar.tsx` retorna >=2 matches
    - `grep "Link href=\"/me\"" src/components/client-shell/left-sidebar.tsx` retorna >=2 matches (D-07 — ProfileCard + Avatar collapsed)
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/client-shell/left-sidebar.tsx` retorna 0 matches (C14)
    - `grep "em breve V2" src/components/client-shell/left-sidebar.tsx` retorna 0 matches (placeholder removido)
    - `grep -i "pedro" src/components/client-shell/left-sidebar.tsx` retorna 0 matches (B6)
    - `pnpm typecheck` 0 erros
    - Arquivo (com extração se necessário) <= 300 linhas cada
  </acceptance_criteria>
  <done>Sidebar renderiza 2 estados visuais. Toggle funciona via form action. ProfileCard clicável. FriendsList integrada.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Refatorar shell.tsx pra ler cookie + passar props novas + ajustar grid (única abordagem)</name>
  <files>src/components/client-shell/shell.tsx</files>
  <read_first>
    - src/components/client-shell/shell.tsx (versão atual completa — modos default + immersive)
    - src/lib/auth/sidebar-preference.ts (getSidebarExpanded)
    - src/lib/queries/friends.ts (getAcceptedFriends)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md "Sidebar Esquerda" larguras (collapsed 72px, expanded 340/400/460px)
  </read_first>
  <action>
    **ABORDAGEM ÚNICA ESCOLHIDA (WARNING #10 fix):** classes Tailwind estáticas com seleção condicional via boolean `sidebarExpanded`. Tailwind purge resolve ambas as variantes em build time porque elas aparecem literalmente no source. SEM template literals dinâmicos, SEM inline style, SEM safelist.

    Modificar `src/components/client-shell/shell.tsx`:

    1. Adicionar imports no topo:
       ```typescript
       import { getSidebarExpanded } from "@/lib/auth/sidebar-preference";
       import { getAcceptedFriends } from "@/lib/queries/friends";
       ```

    2. Dentro de `ClientShell` async function, no `Promise.all` existente, adicionar 2 fetches paralelos:
       ```typescript
       const [
         privateData,
         prosWithQueues,
         fichaPackage,
         previewActive,
         sidebarExpanded,
         acceptedFriends,
       ] = await Promise.all([
         isVisitor ? Promise.resolve(null) : fetchPrivateData(supabase, user.id),
         getProsWithQueues(),
         getFichaPackage(),
         isVisitor ? Promise.resolve(false) : getPreviewModeActive(),
         getSidebarExpanded(),  // NOVO
         isVisitor ? Promise.resolve([]) : getAcceptedFriends(),  // NOVO
       ]);
       ```

    3. **Solução grid (Tailwind purge-safe — strings estáticas):**

       Localizar bloco existente (linhas ~247-256 do shell.tsx):
       ```typescript
       const gridCls = hideLeftSidebar
         ? wideRightSidebar
           ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] 2xl:grid-cols-[1fr_560px]"
           : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]"
         : wideRightSidebar
           ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr_480px] xl:grid-cols-[400px_1fr_520px] 2xl:grid-cols-[460px_1fr_560px]"
           : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr_320px] xl:grid-cols-[400px_1fr_360px] 2xl:grid-cols-[460px_1fr_380px]";
       ```

       Substituir POR (6 strings estáticas — Tailwind detecta tudo):
       ```typescript
       const sidebarColsExpanded = wideRightSidebar
         ? "lg:grid-cols-[340px_1fr_480px] xl:grid-cols-[400px_1fr_520px] 2xl:grid-cols-[460px_1fr_560px]"
         : "lg:grid-cols-[340px_1fr_320px] xl:grid-cols-[400px_1fr_360px] 2xl:grid-cols-[460px_1fr_380px]";
       const sidebarColsCollapsed = wideRightSidebar
         ? "lg:grid-cols-[72px_1fr_480px] xl:grid-cols-[72px_1fr_520px] 2xl:grid-cols-[72px_1fr_560px]"
         : "lg:grid-cols-[72px_1fr_320px] xl:grid-cols-[72px_1fr_360px] 2xl:grid-cols-[72px_1fr_380px]";
       const noSidebarCols = wideRightSidebar
         ? "lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] 2xl:grid-cols-[1fr_560px]"
         : "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]";

       const gridCls = `grid flex-1 min-h-0 grid-cols-1 ${
         hideLeftSidebar
           ? noSidebarCols
           : sidebarExpanded
             ? sidebarColsExpanded
             : sidebarColsCollapsed
       }`;
       ```

       Aplicar `gridCls` no `<div>` que substitui o que existia.

    4. Mesma lógica pro modo IMMERSIVE — ajustar widths das absolutes (linha 165 do shell.tsx):

       Substituir:
       ```typescript
       <div className={`hidden lg:flex absolute left-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-overlay)] w-[340px] xl:w-[400px] 2xl:w-[460px]`}>
       ```

       Por (com classes estáticas pra ambos estados):
       ```typescript
       <div className={`hidden lg:flex absolute left-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-overlay)] ${sidebarExpanded ? "w-[340px] xl:w-[400px] 2xl:w-[460px]" : "w-[72px]"}`}>
       ```

       E o `pl` do main no immersive (linha ~199):
       ```typescript
       <main
         className={`absolute inset-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-elevated)] overflow-y-auto ${
           !hideLeftSidebar
             ? (sidebarExpanded ? "lg:pl-[340px] xl:pl-[400px] 2xl:pl-[460px]" : "lg:pl-[72px]")
             : ""
         } lg:pr-[320px] xl:pr-[360px] 2xl:pr-[380px]`}
       >
       ```

    5. Passar props novas pra `<DashboardLeftSidebar>` em AMBOS os modos (default e immersive):
       ```tsx
       <DashboardLeftSidebar
         isVisitor={isVisitor}
         persona={persona}
         avatar={avatar}
         tag={userTag}
         isAdmin={adminFlag}
         fichaBalance={fichaBalance}
         expanded={sidebarExpanded}
         currentUserId={user?.id ?? null}
         initialFriends={acceptedFriends}
         // floating={true} no modo immersive
       />
       ```

    NÃO mexer em: bottom-bar, right-sidebar, top-bar, background atmospheric, modo immersive de centerHero, hideBottomBar logic, calcHeight com banner.
  </action>
  <verify>
    <automated>pnpm typecheck && grep -cE "(getSidebarExpanded|getAcceptedFriends|sidebarExpanded|expanded=|initialFriends=)" src/components/client-shell/shell.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/client-shell/shell.tsx` modificado
    - `grep "getSidebarExpanded" src/components/client-shell/shell.tsx` retorna >=2 matches (import + call)
    - `grep "getAcceptedFriends" src/components/client-shell/shell.tsx` retorna >=2 matches (import + call)
    - `grep "sidebarExpanded" src/components/client-shell/shell.tsx` retorna >=4 matches (declaração + 3+ usos no grid logic)
    - `grep "expanded={sidebarExpanded}" src/components/client-shell/shell.tsx` retorna >=1 match (prop passada)
    - `grep "initialFriends={acceptedFriends}" src/components/client-shell/shell.tsx` retorna >=1 match
    - `grep "currentUserId={user?.id ?? null}" src/components/client-shell/shell.tsx` retorna >=1 match
    - `grep "lg:grid-cols-\[72px" src/components/client-shell/shell.tsx` retorna >=2 matches (modo collapsed estático Tailwind purge-safe)
    - `grep "lg:pl-\[72px\]" src/components/client-shell/shell.tsx` retorna >=1 match (immersive collapsed)
    - **`grep "gridTemplateColumns" src/components/client-shell/shell.tsx` retorna 0 matches** (sem inline style)
    - **`grep "safelist" src/components/client-shell/shell.tsx` retorna 0 matches** (sem hack de safelist)
    - `pnpm typecheck` 0 erros
    - `pnpm lint src/components/client-shell/` 0 erros
    - Arquivo permanece <= 400 linhas (era ~344; +30-50 ok)
  </acceptance_criteria>
  <done>Shell lê cookie sidebar_expanded no SSR, faz fetch paralelo de friends, passa props novas pra DashboardLeftSidebar, grid columns ajustam dinâmico via classes Tailwind estáticas (purge-safe — sem template literal dinâmico nem safelist). Sem flash no hydration (pitfall 1).</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` 0 erros
- `pnpm lint` 0 erros
- `pnpm build` completa sem erro (verifica Tailwind purge resolveu todas as classes)
- Manual smoke test: `pnpm dev`, login, abrir / ou /dashboard:
  - Sidebar expandida por padrão (cookie ausente — D-02)
  - Click no toggle (ChevronsLeft) → sidebar colapsa pra 72px sem flash
  - Refresh página → sidebar permanece colapsada (cookie persistiu)
  - Click no toggle (ChevronsRight) → expande, vê ProfileCard + FichasCard + Atalhos + "Sua lista de amigos está vazia" (EmptyState)
  - Click no ProfileCard (expanded) ou Avatar (collapsed) → vai pra /me
  - Visitante deslogado: collapsed mostra LogIn + ícones públicos; expanded mostra VisitorCard
- Manual realtime test: 2 browsers logados em accounts diferentes A e B (B é amigo aceito de A):
  - A vê B em "Online agora"
  - B fecha aba → após ~30s, A vê B em "Offline" com "Visto há 0min" (formatLastSeen)
- `grep "console\." src/components/profile/friend-row.tsx` retorna 0 matches (CLAUDE.md compliance)
</verification>

<success_criteria>
- Sidebar 2 estados funcionais (D-03 + D-04)
- Toggle persistido em cookie (D-01 + D-06)
- ProfileCard/Avatar clicável → /me (D-07)
- FriendsList realtime com presence (D-34 a D-36)
- last_seen fallback funcional (D-37 — formatLastSeen)
- Zero hex hardcoded em arquivos novos (C14)
- aria-expanded / aria-label / aria-hidden em todos os interativos (C5)
- Zero console.* em Client Components (CLAUDE.md)
- Sem regressão em rotas existentes (todas as 18 pages Sistema A continuam funcionando)
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-06-SUMMARY.md` com:
- Arquivos modificados (3 esperados + opcional split de left-sidebar se >300 linhas)
- Output do `pnpm build` (deve passar — confirma Tailwind purge-safe)
- Confirmação manual da smoke test (Pedro registra)
- Confirmação ZERO console.* em arquivos novos
- Screenshot da sidebar collapsed + expanded (Pedro tira)
</output>
</content>
</invoke>