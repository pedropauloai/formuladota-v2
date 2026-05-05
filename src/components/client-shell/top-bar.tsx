// Top Bar do dashboard — réplica do top do Dota 2 client.
// Esquerda: logo + tabs (LOBBIES · RANKING · PACOTES · ASSINATURA · ADMIN se admin).
// Centro: banner notification (placeholder pro Pedro vincular depois — tipo "Conquiste prêmios da temporada...")
// Direita: stats / saldo (placeholder) + ícones (notification + settings)

import Image from "next/image";
import Link from "next/link";
import { Bell, Settings, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

// Top-bar mostra apenas pages de navegação geral — fluxo "Jogar / Criar lobby"
// vive no PlayPanel (botão verde no bottom-bar). Tab Lobbies removida (redundância
// com PlayPanel > Salas Personalizadas > Navegar).
const TABS = [
  { href: "/ranking", label: "Ranking" },
  { href: "/pacotes", label: "Pacotes" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/codigo-de-conduta", label: "Conduta" },
];

export function DashboardTopBar({
  isAdmin,
  currentRoute,
}: {
  isAdmin: boolean;
  currentRoute?: string;
}) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-gradient-to-b from-black/95 to-black/80 px-4 backdrop-blur-md xl:h-16 xl:px-6">
      {/* Esquerda — Logo + Tabs */}
      <div className="flex items-center gap-2 xl:gap-6">
        <Link href="/dashboard" aria-label="FORMULADOTA — dashboard" className="shrink-0">
          <Image
            src="/brand/logo-horizontal.png"
            alt="FORMULADOTA"
            width={140}
            height={32}
            priority
            className="h-7 w-auto xl:h-8"
          />
        </Link>
        <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-1">
          {TABS.map((t) => (
            <TopBarTab
              key={t.href}
              href={t.href}
              label={t.label}
              active={currentRoute?.startsWith(t.href) ?? false}
            />
          ))}
          {isAdmin && (
            <TopBarTab
              href="/admin/dashboard"
              label="Admin"
              active={currentRoute?.startsWith("/admin") ?? false}
            />
          )}
        </nav>
      </div>

      {/* Centro — Banner notification (placeholder — Pedro vincula após) */}
      <div className="hidden xl:flex items-center gap-2 rounded-md border border-[var(--color-brand-red)]/30 bg-[var(--color-brand-red)]/5 px-4 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]/80">
          Temporada Genesis
        </span>
        <span className="text-xs text-white/70">— Premiação por patrocinadores em breve</span>
      </div>

      {/* Direita — ícones */}
      <div className="flex items-center gap-1 xl:gap-2">
        <TopBarIcon icon={Bell} label="Notificações" />
        <TopBarIcon icon={Settings} label="Configurações" href="/me" />
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
