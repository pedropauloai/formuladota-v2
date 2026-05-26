"use client";

// Mini-Profile Panel — Phase 9 refatorado pra fidelidade Dota 2 client.
//
// Diferente da sidebar lateral anterior (full-height 340px lateral fixa),
// este painel é ancorado no canto inferior esquerdo (acima do bottom-bar):
//
//   FECHADO (~280x60px): caixa pequena com avatar + nome compacto.
//     Click no card todo expande (D-07 redefinido pelo Pedro 2026-05-26).
//
//   ABERTO (~340x600px slideup overlay): cresce verticalmente pra cima
//     sobreposto ao conteúdo. Mostra user header + status + lista de amigos
//     + link "Ver perfil completo" → /me.
//
// Conteúdo do main NÃO reajusta largura (overlay, não shift).
// z-index entre conteúdo e top-bar.
//
// Estado: useState client-side inicializado do cookie SSR-safe (passado
// como prop). Click toggle = instant + dispara Server Action em background
// pra persistir entre rotas.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Coins,
  ExternalLink,
  MessageSquare,
  BookOpen,
  LogIn,
  X,
  ChevronUp,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import { toggleSidebar } from "@/lib/auth/sidebar-preference";
import { FriendsList } from "@/components/profile/friends-list";
import { UserAvatar } from "@/components/ui/avatar";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  isVisitor: boolean;
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  /** Estado inicial do cookie sidebar_expanded — passado do shell SSR. */
  initialExpanded: boolean;
  /** UUID do user logado — pra usePresenceChannel. Null se visitante. */
  currentUserId: string | null;
  /** Amigos aceitos — fetched no shell.tsx (server-side). */
  initialFriends: FriendListEntry[];
}

export function MiniProfilePanel({
  isVisitor,
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  initialExpanded,
  currentUserId,
  initialFriends,
}: Props) {
  // Estado client-side pra UX instant (sem reload). Cookie persiste async.
  const [expanded, setExpanded] = useState(initialExpanded);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  // Click fora fecha (apenas quando expanded — UX Dota 2 client)
  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
        startTransition(() => {
          void toggleSidebar();
        });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  function handleToggle() {
    setExpanded((prev) => !prev);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  // Visitante: card minimal com CTA entrar (sem estado expand)
  if (isVisitor) {
    return (
      <div
        ref={panelRef}
        className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)] w-[280px]"
      >
        <VisitorCardCompact />
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)]"
    >
      {expanded ? (
        <ExpandedPanel
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          currentUserId={currentUserId}
          initialFriends={initialFriends}
          onClose={handleToggle}
        />
      ) : (
        <CollapsedCard
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          onClick={handleToggle}
        />
      )}
    </div>
  );
}

// ===========================================================================
// CollapsedCard — caixinha ~280x60px ancorada bottom-left
// Click todo expande (D-07 redefinido).
// ===========================================================================

function CollapsedCard({
  persona,
  avatar,
  tag,
  isAdmin,
  onClick,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Expandir mini-perfil + amigos"
      aria-expanded={false}
      className="flex w-[280px] items-center gap-3 rounded-md border border-brand-primary/30 bg-bg-deep/90 backdrop-blur-md px-3 py-2 hover:border-brand-primary/60 hover:bg-bg-elevated/80 transition-colors shadow-lg shadow-black/60"
    >
      <UserAvatar
        src={avatar ?? undefined}
        alt={`Avatar de ${persona ?? "Anônimo"}`}
        fallback={(persona ?? "??").slice(0, 2)}
        size="md"
        ringColor="brand"
      />
      <div className="flex-1 min-w-0 text-left">
        <p className="font-display text-sm font-semibold text-text-display truncate">
          {persona ?? "Anônimo"}
        </p>
        <p className="font-display text-sm font-semibold text-brand-primary/80 leading-tight">
          [{tag}]
          {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
        </p>
      </div>
      <ChevronUp size={14} className="text-text-muted shrink-0" aria-hidden="true" />
    </button>
  );
}

// ===========================================================================
// ExpandedPanel — slideup overlay ~340x600px com user + amigos + atalhos
// Cresce VERTICALMENTE pra cima a partir do bottom-left.
// ===========================================================================

function ExpandedPanel({
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  currentUserId,
  initialFriends,
  onClose,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  currentUserId: string | null;
  initialFriends: FriendListEntry[];
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Mini-perfil e lista de amigos"
      className="flex w-[340px] xl:w-[380px] flex-col gap-3 rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 max-h-[calc(100dvh-200px)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      {/* Header — avatar + nome + close button */}
      <header className="flex items-start gap-3">
        <UserAvatar
          src={avatar ?? undefined}
          alt={`Avatar de ${persona ?? "Anônimo"}`}
          fallback={(persona ?? "??").slice(0, 2)}
          size="lg"
          ringColor="brand"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-semibold text-text-display truncate">
            {persona ?? "Anônimo"}
          </p>
          <p className="font-display text-sm font-semibold text-brand-primary/80 mt-0.5">
            [{tag}]
            {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {/* Saldo de fichas compact */}
      <FichasCard balance={fichaBalance} isAdmin={isAdmin} />

      {/* Link "Ver perfil completo" → /me */}
      <Link
        href="/me"
        className="rounded border border-border-subtle bg-bg-elevated/40 px-3 py-2 text-center font-display text-sm font-semibold uppercase tracking-wide text-text-body hover:border-brand-primary/40 hover:text-text-display transition-colors"
      >
        Ver perfil completo →
      </Link>

      {/* Lista de amigos (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FriendsList
          currentUserId={currentUserId ?? ""}
          initialFriends={initialFriends}
        />
      </div>

      {/* Atalhos compactos no fim */}
      <nav aria-label="Atalhos" className="space-y-1 border-t border-border-subtle pt-3">
        <CompactLink href="/codigo-de-conduta" label="Código de Conduta" icon={BookOpen} />
        <CompactLink
          href="https://discord.com/invite/v3pSuZhjBE"
          label="Discord oficial"
          icon={MessageSquare}
          external
        />
      </nav>
    </aside>
  );
}

// ===========================================================================
// Subcomponentes
// ===========================================================================

function VisitorCardCompact() {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-deep/95 backdrop-blur-md p-3 shadow-lg shadow-black/60">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-full border-2 border-border-subtle bg-bg-deep/80 flex items-center justify-center">
          <LogIn size={14} className="text-text-muted" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-text-display">Visitante</p>
          <p className="font-display text-sm text-text-muted">Entre pra ver amigos</p>
        </div>
      </div>
      <form action={signInWithDiscord} className="mt-2">
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-brand-primary/60 bg-brand-primary/10 px-2 py-1.5 font-display text-sm font-semibold text-brand-primary hover:bg-brand-primary/20 transition-colors"
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
    <div className="rounded border border-brand-primary/30 bg-gradient-to-br from-brand-primary/10 to-transparent px-3 py-2">
      <div className="flex items-center gap-2">
        <Coins size={12} className="text-brand-primary" aria-hidden="true" />
        <p className="font-display text-sm font-semibold text-text-body">Saldo de fichas</p>
      </div>
      <p className="mt-1 font-display text-xl font-bold text-text-display">
        {isAdmin ? "∞" : balance}
        <span className="ml-2 font-display text-sm font-semibold text-text-body">
          {isAdmin ? "admin" : balance === 1 ? "ficha" : "fichas"}
        </span>
      </p>
    </div>
  );
}

function CompactLink({
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
    "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-sm text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={12} aria-hidden="true" />
        {label}
        <ExternalLink size={9} className="ml-auto text-text-faded" aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </Link>
  );
}
