// Top Bar — réplica do header do Dota 2 client.
// Esquerda: logo + separador + settings (gear) + tabs
// Centro: banner notification (placeholder)
// Direita: yellow subscription badge (FORMULA+ pra /assinatura) + bell + logout

import Image from "next/image";
import Link from "next/link";
import { Bell, Settings, LogOut, Star } from "lucide-react";
import { signOut } from "@/app/login/actions";

// Tabs apenas pra navegação não-monetização. /pacotes e /assinatura entram
// via SubscriptionBadge (yellow Formula+ no canto direito).
const TABS = [
  { href: "/ranking", label: "Ranking" },
  { href: "/times", label: "Times" },
  { href: "/torneios", label: "Torneios" },
  { href: "/codigo-de-conduta", label: "Conduta" },
];

export function DashboardTopBar({
  currentRoute,
}: {
  currentRoute?: string;
}) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-gradient-to-b from-black/85 via-black/55 to-transparent px-4 backdrop-blur-md xl:h-16 xl:px-6">
      {/* Esquerda — Logo + separador + Settings + Tabs */}
      <div className="flex items-center gap-2 xl:gap-4">
        <Link
          href="/dashboard"
          aria-label="FORMULADOTA — dashboard"
          className="shrink-0"
        >
          <Image
            src="/brand/logo-horizontal.png"
            alt="FORMULADOTA"
            width={140}
            height={32}
            priority
            className="h-7 w-auto xl:h-8"
          />
        </Link>

        {/* Separador vertical entre logo e settings */}
        <div className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1" aria-hidden="true" />

        <TopBarIcon icon={Settings} label="Configurações" href="/me" />

        {/* Outro separador entre settings e tabs */}
        <div className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1" aria-hidden="true" />

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-1"
        >
          {TABS.map((t) => (
            <TopBarTab
              key={t.href}
              href={t.href}
              label={t.label}
              active={currentRoute?.startsWith(t.href) ?? false}
            />
          ))}
        </nav>
      </div>

      {/* Centro — Banner notification (placeholder) */}
      <div className="hidden xl:flex items-center gap-2 rounded-md border border-[var(--color-brand-red)]/30 bg-[var(--color-brand-red)]/5 px-4 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]/80">
          Temporada Genesis
        </span>
        <span className="text-xs text-white/70">
          — Premiação por patrocinadores em breve
        </span>
      </div>

      {/* Direita — Yellow subscription badge + Bell + LogOut */}
      <div className="flex items-center gap-1.5 xl:gap-2">
        <SubscriptionBadge />
        <TopBarIcon icon={Bell} label="Notificações" />
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sair"
            className="flex size-9 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}

function SubscriptionBadge() {
  // Yellow gradient badge — entry point pra subscription / store FORMULADOTA.
  // V2 pode receber status sub via prop pra mudar label dinamicamente
  // (ex: "Ativa" vs "Assinar" baseado em subscription.status).
  return (
    <Link
      href="/assinatura"
      aria-label="Assinatura FORMULA+"
      className="group inline-flex items-center gap-1.5 rounded-md border border-amber-400/70 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.15em] text-black shadow-md shadow-amber-500/40 hover:brightness-110 hover:shadow-amber-400/60 transition-all xl:px-4 xl:py-2 xl:text-sm xl:tracking-[0.2em]"
    >
      <Star size={12} fill="currentColor" aria-hidden="true" />
      <span>Formula+</span>
    </Link>
  );
}

function TopBarTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.15em] transition-colors xl:px-4 xl:text-sm xl:tracking-[0.2em] ${
        active
          ? "bg-[var(--color-brand-red)]/15 text-white border-b-2 border-[var(--color-brand-red)] rounded-b-none"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function TopBarIcon({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Bell;
  label: string;
  href?: string;
}) {
  const cls =
    "flex size-9 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Icon size={16} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
