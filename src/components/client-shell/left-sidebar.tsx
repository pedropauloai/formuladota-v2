// Left Sidebar — perfil do user + saldo de fichas + comunidade.
// MVP: removidos tier badge/MMR (v2 quando tiver sistema interno),
// busca amigos / filtros "No jogo/Comunidade/etc" (v2), lista amigos
// placeholder (v2).

import Link from "next/link";
import { Coins, ExternalLink, MessageSquare, BookOpen } from "lucide-react";

interface Props {
  persona: string;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  /** Modo flutuante (immersive shell): wrapper transparente. */
  floating?: boolean;
}

export function DashboardLeftSidebar({
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  floating,
}: Props) {
  // Sidebar discreta por default (opacidade 75%), realça em hover.
  const wrapperCls = floating
    ? "flex w-full flex-col gap-3 p-3 overflow-y-auto opacity-75 hover:opacity-100 transition-opacity"
    : "hidden lg:flex flex-col gap-3 bg-gradient-to-r from-black/70 via-black/40 to-transparent p-4 backdrop-blur-sm overflow-y-auto opacity-75 hover:opacity-100 transition-opacity";

  return (
    <aside className={wrapperCls}>
      {/* Profile Card */}
      <div className="rounded-md border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-card)]/90 to-black/60 p-3">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="size-12 shrink-0 rounded-full border-2 border-[var(--color-brand-red)]/60 ring-2 ring-[var(--color-brand-red)]/20"
            />
          ) : (
            <div className="size-12 shrink-0 rounded-full border-2 border-[var(--color-brand-red)]/60 bg-[var(--color-card)]" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm uppercase tracking-wide text-white truncate">
              {persona}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]/80 mt-0.5">
              [{tag}]
              {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Saldo de Fichas — card destaque */}
      <FichasCard balance={fichaBalance} isAdmin={isAdmin} />

      {/* Links rápidos */}
      <nav aria-label="Atalhos" className="space-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/60 p-2">
        <SidebarLink href="/me" label="Meu perfil" icon={null} />
        <SidebarLink href="/codigo-de-conduta" label="Código de Conduta" icon={BookOpen} />
        <SidebarLink
          href="https://discord.com/invite/v3pSuZhjBE"
          label="Discord oficial"
          icon={MessageSquare}
          external
        />
      </nav>

      {/* Espaço vazio reservado pra futuras features (amigos online, chat) */}
      <div className="flex-1 rounded-md border border-dashed border-white/10 bg-black/30 p-4 flex items-center justify-center">
        <p className="text-center font-sans text-[10px] text-white/30">
          Lista de amigos · em breve V2
        </p>
      </div>
    </aside>
  );
}

function FichasCard({ balance, isAdmin }: { balance: number; isAdmin: boolean }) {
  return (
    <div className="rounded-md border border-[var(--color-brand-red)]/40 bg-gradient-to-br from-[var(--color-brand-red)]/10 to-transparent p-3">
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-[var(--color-brand-red)]" aria-hidden="true" />
        <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-white/70">
          Saldo de fichas
        </p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-white">
        {isAdmin ? "∞" : balance}
        <span className="ml-2 font-mono text-xs text-white/50">
          {isAdmin ? "admin" : balance === 1 ? "ficha" : "fichas"}
        </span>
      </p>
      {!isAdmin && balance === 0 && (
        <p className="mt-1 font-mono text-[10px] text-white/40">
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
    "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {Icon ? <Icon size={12} aria-hidden="true" /> : null}
        {label}
        <ExternalLink size={9} className="ml-auto text-white/40" aria-hidden="true" />
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
