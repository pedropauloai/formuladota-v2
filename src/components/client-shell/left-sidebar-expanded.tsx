// Sidebar esquerda — estado EXPANDED (340px) — Phase 9 D-04.
// Exibe ProfileCard clicável (Link /me), FichasCard, Atalhos nav e FriendsList realtime.
// Importado por left-sidebar.tsx — não usar diretamente.

import Link from "next/link";
import {
  Coins,
  ExternalLink,
  MessageSquare,
  BookOpen,
  LogIn,
  User,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import { FriendsList } from "@/components/profile/friends-list";
import type { FriendListEntry } from "@/lib/queries/friends";

// ===========================================================================
// ExpandedContent
// ===========================================================================

export function ExpandedContent({
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
// Reusables internos do expanded
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
