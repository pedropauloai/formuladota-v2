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

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Coins,
  ExternalLink,
  MessageSquare,
  BookOpen,
  LogIn,
  ChevronUp,
  ChevronDown,
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
  // Pedro 2026-05-26: removido click-outside-fecha (UX Dota 2 = só fecha
  // pelo chevron toggle).
  const [expanded, setExpanded] = useState(initialExpanded);
  const [, startTransition] = useTransition();

  function handleToggle() {
    setExpanded((prev) => !prev);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  // Visitante: card minimal com CTA entrar (sem estado expand)
  if (isVisitor) {
    return (
      <div className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)] w-[280px]">
        <VisitorCardCompact />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)]">
      {expanded ? (
        <ExpandedPanel
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          currentUserId={currentUserId}
          initialFriends={initialFriends}
          onToggle={handleToggle}
        />
      ) : (
        <CollapsedCard
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}

// ===========================================================================
// CollapsedCard — mesmo tamanho do expanded (340x px). Avatar+nome são Link
// pra /me; chevron à direita expande pra mostrar amigos.
// ===========================================================================

function CollapsedCard({
  persona,
  avatar,
  tag,
  isAdmin,
  onToggle,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex w-[340px] xl:w-[380px] items-center gap-3 rounded-md border border-brand-primary/30 bg-bg-deep/90 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60">
      {/* Avatar + nome = Link pra /me (D-07 redefinido pelo Pedro 2026-05-26) */}
      <Link
        href="/me"
        aria-label="Ver meu perfil"
        className="flex flex-1 min-w-0 items-center gap-3 rounded hover:bg-bg-elevated/40 transition-colors p-1 -m-1"
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
      </Link>
      {/* Chevron — único trigger pra expandir o painel de amigos */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Expandir lista de amigos"
        aria-expanded={false}
        className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
      >
        <ChevronUp size={14} aria-hidden="true" />
      </button>
    </div>
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
  onToggle,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  currentUserId: string | null;
  initialFriends: FriendListEntry[];
  onToggle: () => void;
}) {
  return (
    <aside
      aria-label="Mini-perfil e lista de amigos"
      className="flex w-[340px] xl:w-[380px] flex-col gap-3 rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 max-h-[calc(100dvh-200px)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      {/* Header — avatar + nome = Link pra /me; X fecha o painel */}
      <header className="flex items-start gap-3">
        <Link
          href="/me"
          aria-label="Ver meu perfil"
          className="flex flex-1 min-w-0 items-start gap-3 rounded hover:bg-bg-elevated/40 transition-colors p-1 -m-1"
        >
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
        </Link>
        {/* Mesmo chevron toggle do CollapsedCard, agora apontando pra baixo
            (= fechar). Pedro 2026-05-26: único trigger pra abrir/fechar. */}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Recolher lista de amigos"
          aria-expanded={true}
          className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
        >
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </header>

      {/* Saldo de fichas compact */}
      <FichasCard balance={fichaBalance} isAdmin={isAdmin} />

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
