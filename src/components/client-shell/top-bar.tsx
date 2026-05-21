// Top Bar — réplica do header do Dota 2 client, adaptada pro MVP.
// Esquerda: logo branca + settings + tabs (Conduta, Painel PROs admin)
// Centro: status PROs online em tempo real
// Direita: badge "Comprar Ficha" (yellow, ex-FORMULA+) + logout
//
// MVP: removidos tabs Progresso/Ranking/Times/Torneios (v2), bell de
// notificações (placeholder v2), badge mensalidade FORMULA+ (v2).

import Image from "next/image";
import Link from "next/link";
import { Settings, LogOut, Coins, Radio } from "lucide-react";
import { signOut } from "@/app/login/actions";

interface Props {
  currentRoute?: string;
  isAdmin: boolean;
  prosOnlineCount: number;
  fichaPackageId: string | null;
}

export function DashboardTopBar({
  currentRoute,
  isAdmin,
  prosOnlineCount,
  fichaPackageId,
}: Props) {
  const tabs: { href: string; label: string }[] = [
    { href: "/codigo-de-conduta", label: "Conduta" },
  ];
  if (isAdmin) {
    tabs.unshift({ href: "/admin/pros", label: "Painel PROs" });
  }

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between bg-gradient-to-b from-black/85 via-black/55 to-transparent px-4 backdrop-blur-md xl:h-20 xl:px-6">
      {/* Esquerda — logo + settings + tabs */}
      <div className="flex items-center gap-2 xl:gap-4">
        <Link
          href="/dashboard"
          aria-label="FORMULADOTA — dashboard"
          className="shrink-0"
        >
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="FORMULADOTA"
            width={1933}
            height={400}
            priority
            className="h-10 w-auto xl:h-12"
          />
        </Link>

        <div
          className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1"
          aria-hidden="true"
        />

        <TopBarIcon icon={Settings} label="Configurações" href="/me" />

        {tabs.length > 0 && (
          <>
            <div
              className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1"
              aria-hidden="true"
            />
            <nav
              aria-label="Navegação principal"
              className="hidden lg:flex items-center gap-1"
            >
              {tabs.map((t) => (
                <TopBarTab
                  key={t.href}
                  href={t.href}
                  label={t.label}
                  active={currentRoute?.startsWith(t.href) ?? false}
                />
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Centro — status PROs online em tempo real */}
      {prosOnlineCount > 0 && (
        <div className="hidden xl:flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/90">
            {prosOnlineCount}{" "}
            {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
          </span>
          <Radio size={12} className="text-emerald-400/80" aria-hidden="true" />
        </div>
      )}

      {/* Direita — Comprar Ficha + Logout */}
      <div className="flex items-center gap-1.5 xl:gap-2">
        {fichaPackageId && <BuyFichaBadge packageId={fichaPackageId} />}
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

function BuyFichaBadge({ packageId }: { packageId: string }) {
  // Mantém estética yellow do antigo FORMULA+ — gatilho principal de monetização.
  return (
    <Link
      href={`/checkout/${packageId}`}
      aria-label="Comprar Ficha"
      className="group inline-flex items-center gap-1.5 rounded-md border border-amber-400/70 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.15em] text-black shadow-md shadow-amber-500/40 hover:brightness-110 hover:shadow-amber-400/60 transition-all xl:px-4 xl:py-2 xl:text-sm xl:tracking-[0.2em]"
    >
      <Coins size={12} aria-hidden="true" />
      <span>Comprar Ficha</span>
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
  icon: typeof Settings;
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
