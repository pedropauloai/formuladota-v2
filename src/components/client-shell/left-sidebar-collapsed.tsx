// Sidebar esquerda — estado COLLAPSED (72px) — Phase 9 D-03.
// Exibe apenas: toggle (no parent), UserAvatar md clicável (Link /me), ícones públicos.
// Importado por left-sidebar.tsx — não usar diretamente.

import Link from "next/link";
import { MessageSquare, BookOpen, LogIn } from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";

// ===========================================================================
// CollapsedContent
// ===========================================================================

export function CollapsedContent({
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
        /* Avatar clicável → /me (D-07 estado collapsed) */
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

// ===========================================================================
// CollapsedIcon helper
// ===========================================================================

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
