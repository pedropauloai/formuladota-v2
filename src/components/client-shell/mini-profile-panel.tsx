"use client";

// Mini-Profile Panel — Phase 9 refator 2026-05-26 (fidelidade Dota 2 client).
//
// LAYOUT:
//
//   ESTADO FECHADO (sempre visível):
//     ┌────────────────────────┐ ┌───┐
//     │ Avatar | Nome [tag]    │ │ U │  ← card retraído + ícone AO LADO direito
//     └────────────────────────┘ └───┘     (ícone é trigger, card é Link → /me)
//
//   ESTADO ABERTO (panel cresce ACIMA do card retraído):
//     ┌──────────────────────────┐
//     │ Painel grande            │
//     │ avatar + nome + saldo    │
//     │ AMIGOS lista             │
//     │ atalhos                  │
//     └──────────────────────────┘
//     ┌────────────────────────┐ ┌───┐
//     │ Avatar | Nome [tag]    │ │ U │  ← continuam visíveis
//     └────────────────────────┘ └───┘     (ícone com estado ativo brand)
//
// Click no ícone alterna abrir/fechar.
// Avatar+nome no card retraído (e no header do painel) são Link → /me.
// Painel só fecha pelo ícone (sem click-outside, sem X interno).

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Coins,
  ExternalLink,
  MessageSquare,
  BookOpen,
  LogIn,
  Users,
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

  function handleToggle() {
    setExpanded((prev) => !prev);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  // Visitante: card minimal com CTA entrar (não tem painel de amigos)
  if (isVisitor) {
    return (
      <div className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)] w-[280px]">
        <VisitorCardCompact />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto fixed left-4 bottom-[88px] xl:bottom-[104px] z-[var(--z-overlay)] flex flex-col items-start">
      {/* Painel expandido — cresce A PARTIR do card retraído (conectado, sem gap).
          Quando expanded=true, borda inferior do painel + borda superior do card
          são planas, formando um único componente visual contínuo. */}
      {expanded && (
        <ExpandedPanel
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          currentUserId={currentUserId}
          initialFriends={initialFriends}
        />
      )}

      {/* Linha inferior — card retraído + ícone toggle SEMPRE visíveis.
          Card conecta visualmente ao painel quando expanded (sem gap, bordas planas).
          Ícone fica FORA (externo ao card) na lateral direita. */}
      <div className="flex items-stretch gap-2">
        <CollapsedCard
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          connectedTop={expanded}
        />
        <ToggleIcon expanded={expanded} onToggle={handleToggle} />
      </div>
    </div>
  );
}

// ===========================================================================
// CollapsedCard — card avatar+nome (Link pra /me) sempre visível na linha base
// ===========================================================================

function CollapsedCard({
  persona,
  avatar,
  tag,
  isAdmin,
  connectedTop = false,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  /** Quando true (painel expandido aberto), borda superior + canto superior
      ficam planos pra conectar visualmente ao ExpandedPanel acima. */
  connectedTop?: boolean;
}) {
  return (
    <Link
      href="/me"
      aria-label="Ver meu perfil"
      className={`flex w-[340px] xl:w-[380px] items-center gap-3 border border-brand-primary/30 bg-bg-deep/90 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60 hover:border-brand-primary/60 hover:bg-bg-elevated/80 transition-colors ${
        connectedTop
          ? "rounded-b-md rounded-t-none border-t-0"
          : "rounded-md"
      }`}
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
  );
}

// ===========================================================================
// ToggleIcon — botão Users à direita do card retraído (trigger único)
// ===========================================================================

function ToggleIcon({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Fechar painel de amigos" : "Abrir painel de amigos"}
      aria-expanded={expanded}
      title={expanded ? "Fechar amigos" : "Abrir amigos"}
      className={`flex w-12 shrink-0 items-center justify-center rounded-md border backdrop-blur-md transition-all shadow-lg shadow-black/60 ${
        expanded
          ? "border-brand-primary bg-brand-primary/20 text-text-display shadow-[0_0_16px_var(--color-brand-primary-glow)]"
          : "border-brand-primary/30 bg-bg-deep/90 text-text-muted hover:border-brand-primary/60 hover:text-text-display"
      }`}
    >
      <Users size={20} aria-hidden="true" />
    </button>
  );
}

// ===========================================================================
// ExpandedPanel — slideup overlay ~340x600px com user + amigos + atalhos.
// Aparece ACIMA do card retraído + ícone quando expanded=true.
// ===========================================================================

function ExpandedPanel({
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  currentUserId,
  initialFriends,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  currentUserId: string | null;
  initialFriends: FriendListEntry[];
}) {
  return (
    <aside
      aria-label="Mini-perfil e lista de amigos"
      className="flex w-[340px] xl:w-[380px] flex-col gap-3 rounded-t-md rounded-b-none border border-b-0 border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 max-h-[calc(100dvh-260px)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      {/* Header — avatar + nome = Link pra /me */}
      <header>
        <Link
          href="/me"
          aria-label="Ver meu perfil"
          className="flex items-start gap-3 rounded hover:bg-bg-elevated/40 transition-colors p-1 -m-1"
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
