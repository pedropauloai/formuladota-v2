// Header global — logo + nav + auth state.
// Server Component: lê profile do user logado pra mostrar avatar/dropdown OU botão login.

import Link from "next/link";
import { LogIn, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await supabase
        .from("profiles")
        .select("username, avatar_url, role, is_admin")
        .eq("id", user.id)
        .single()
    : null;

  const username = profile?.data?.username ?? "perfil";
  const avatarUrl = profile?.data?.avatar_url ?? null;
  const isAdmin = profile?.data?.is_admin ?? false;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-baseline gap-1 font-bold tracking-tight"
          aria-label="Fórmula Dota — voltar à home"
        >
          <span className="text-lg">Fórmula</span>
          <span className="text-lg text-[var(--color-cyan)] text-glow-cyan">Dota</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-6 md:flex">
          <NavLink href="/pacotes" label="Pacotes" />
          <NavLink href="/codigo-de-conduta" label="Código de Conduta" />
          {isAdmin && <NavLink href="/admin" label="Admin" />}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu username={username} avatarUrl={avatarUrl} />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-cyan)] px-4 py-2 text-sm font-medium text-[var(--color-cyan)] hover:bg-[var(--color-cyan)]/10 transition"
            >
              <LogIn size={14} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-cyan)] transition"
    >
      {label}
    </Link>
  );
}

function UserMenu({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/perfil"
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:border-[var(--color-cyan)] transition"
        aria-label={`Ver perfil de ${username}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-6 rounded-full"
          />
        ) : (
          <User size={14} aria-hidden="true" />
        )}
        <span className="hidden font-medium md:inline">{username}</span>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
        >
          sair
        </button>
      </form>
    </div>
  );
}
