// Left Sidebar — refatorada Phase 9 (D-01 a D-07).
// 2 estados visuais:
//   - collapsed (72px): toggle ChevronsRight + UserAvatar md (Link /me) + ícones empilhados
//   - expanded (340px): toggle ChevronsLeft + ProfileCard (Link /me) + FichasCard + Atalhos + FriendsList
//
// Toggle persistido em cookie sidebar_expanded via Server Action toggleSidebar.
// Cookie não é httpOnly — Server Component lê no SSR (sem flash no hydration — Pitfall 1 RESEARCH).
//
// Extração em sub-arquivos (CLAUDE.md limite 300 linhas por arquivo):
//   - left-sidebar-expanded.tsx   → estado expanded (D-04)
//   - left-sidebar-collapsed.tsx  → estado collapsed (D-03)

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { toggleSidebar } from "@/lib/auth/sidebar-preference";
import { ExpandedContent } from "./left-sidebar-expanded";
import { CollapsedContent } from "./left-sidebar-collapsed";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  /** Visitante deslogado: troca ProfileCard + FichasCard por VisitorCard. */
  isVisitor: boolean;
  /** Null quando isVisitor=true. */
  persona: string | null;
  /** Null quando isVisitor=true. */
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  /** Modo flutuante (immersive shell): wrapper transparente. */
  floating?: boolean;
  /** Estado do cookie sidebar_expanded — lido no shell.tsx (SSR-safe, sem flash). */
  expanded: boolean;
  /** UUID do user logado — pra usePresenceChannel. Null se visitante. */
  currentUserId: string | null;
  /** Amigos aceitos — fetched no shell.tsx (server-side). */
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
