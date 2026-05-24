// Header global — logo + botão entrar/perfil.
// MVP: sem navegação. Só logo (versão branca, fundo escuro) + auth state.
// Features tipo Lobbies/Ranking/Pacotes/Assinatura ficam disponíveis na v2.

import Link from "next/link";
import Image from "next/image";
import { LogIn, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signInWithDiscord, signOut } from "@/app/login/actions";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single()
    : null;

  const username = profile?.data?.username ?? "perfil";
  const avatarUrl = profile?.data?.avatar_url ?? null;

  return (
    <header className="sticky top-0 z-[var(--z-modal)] border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center"
          aria-label="FORMULADOTA — voltar à home"
        >
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="FORMULADOTA"
            width={1933}
            height={400}
            priority
            className="h-16 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu username={username} avatarUrl={avatarUrl} />
          ) : (
            <form action={signInWithDiscord}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] hover:bg-[var(--color-brand-red)] transition"
              >
                <LogIn size={14} />
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
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
        href="/dashboard"
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:border-[var(--color-brand-red)] transition"
        aria-label={`Painel de ${username}`}
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
