// Header global — logo + nav + auth state.
// Server Component: lê profile do user logado pra mostrar avatar/dropdown OU botão login.

import Link from "next/link";
import Image from "next/image";
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
          className="flex items-center"
          aria-label="FORMULADOTA — voltar à home"
        >
          <Image
            src="/brand/logo-horizontal.png"
            alt="FORMULADOTA"
            width={180}
            height={40}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-6 md:flex">
          <NavLink href="/lobbies" label="Lobbies" />
          <NavLink href="/ranking" label="Ranking" />
          <NavLink href="/pacotes" label="Pacotes" />
          <NavLink href="/codigo-de-conduta" label="Conduta" />
          <NavLink href="/assinatura" label="Assinatura" />
          {isAdmin && <NavLink href="/admin/dashboard" label="Admin" />}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu username={username} avatarUrl={avatarUrl} />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] hover:bg-[var(--color-brand-red)] transition"
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
      className="font-sans text-sm font-medium uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
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
        href="/me"
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:border-[var(--color-brand-red)] transition"
        aria-label={`Meu painel ${username}`}
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
          className="font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
        >
          sair
        </button>
      </form>
    </div>
  );
}
