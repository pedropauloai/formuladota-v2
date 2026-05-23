/**
 * ClientShell — Template AAA Canônico V2.5 (DF8.1)
 *
 * Top-bar horizontal estilo Dota 2 client:
 *   Esquerda: logo FORMULADOTA
 *   Centro:   tabs principais (Jogar / Perfil / Comunidade / Loja)
 *   Direita:  mute toggle + auth slot
 *
 * CTA "PLAY" massivo: aparece centralizado abaixo da top-bar APENAS na tab Jogar.
 *
 * @deprecated legacy shell.tsx → será migrado em DF8.4
 * O componente legacy `src/components/client-shell/shell.tsx` permanece funcional
 * para callsites existentes até a migração em DF8.4.
 *
 * ZERO sidebar de 256px — layout fullscreen estilo game client.
 *
 * Tokens: apenas variáveis CSS semânticas de src/styles/tokens/semantic.css.
 * Zero hex hardcoded conforme regra C14 (DESIGN_LANGUAGE.md).
 */

"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMuteToggle } from "@/lib/sound/hooks";

// ---------------------------------------------------------------------------
// Tabs de navegação principal
// ---------------------------------------------------------------------------

interface NavTab {
  /** Rótulo exibido na tab */
  label: string;
  /** URL de destino ao clicar na tab */
  href: string;
  /** Regex para determinar se a tab está ativa (match no pathname) */
  match: RegExp;
}

const NAV_TABS: NavTab[] = [
  {
    label: "Jogar",
    href: "/dashboard",
    match: /^\/(dashboard|criar-lobby|lobbies)/,
  },
  {
    label: "Perfil",
    href: "/me",
    match: /^\/(me|perfil)/,
  },
  {
    label: "Comunidade",
    href: "/codigo-de-conduta",
    match: /^\/(codigo-de-conduta|onboarding|ranking)/,
  },
  {
    label: "Loja",
    href: "/pacotes",
    match: /^\/(pacotes|checkout|partidas|assinatura)/,
  },
];

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

interface ClientShellProps {
  /** Conteúdo principal da página — renderizado abaixo da top-bar */
  children: ReactNode;
  /**
   * Slot de autenticação (server-side): avatar do usuário logado ou botão de login.
   * Renderizado na extremidade direita da top-bar, após o mute toggle.
   */
  authSlot?: ReactNode;
  /**
   * Slot do CTA "PLAY" — exibido centralizado abaixo da top-bar APENAS quando
   * o pathname corresponde à tab Jogar (/dashboard, /criar-lobby, /lobbies).
   * Espera um botão/elemento de impacto máximo (ex: variante cinematic).
   */
  playSlot?: ReactNode;
  /** Classe extra aplicada ao wrapper externo (raramente necessária) */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ClientShell({
  children,
  authSlot,
  playSlot,
  className,
}: ClientShellProps) {
  const pathname = usePathname();

  // Tab Jogar ativa quando pathname corresponde a /dashboard, /criar-lobby ou /lobbies
  const isJogarTab = NAV_TABS[0]!.match.test(pathname);

  return (
    <div className={cn("min-h-screen flex flex-col bg-bg-deep", className)}>
      {/* ----------------------------------------------------------------
          TOP BAR — Dota 2 client style
          z-system (var(--z-system) = 100) garante sobreposição ao conteúdo
          backdrop-blur simula profundidade do client Dota
          ---------------------------------------------------------------- */}
      <header
        className={cn(
          "sticky top-0 flex items-center justify-between",
          "h-14 xl:h-16 px-4 xl:px-6",
          "border-b border-border-subtle",
          "bg-bg-deep/85 backdrop-blur-md",
        )}
        style={{ zIndex: "var(--z-system)" }}
      >
        {/* ---- Esquerda: logo FORMULADOTA ---- */}
        <Link
          href="/"
          aria-label="FORMULADOTA — início"
          className="shrink-0 flex items-center"
        >
          {/* Texto tipográfico — Cinzel Variable via --font-display */}
          <span
            className="font-display text-lg xl:text-xl font-bold uppercase tracking-widest text-text-display"
            style={{ letterSpacing: "0.2em" }}
          >
            FORMULA
            <span style={{ color: "var(--color-brand-primary)" }}>DOTA</span>
          </span>
        </Link>

        {/* ---- Centro: tabs de navegação principal ---- */}
        <nav
          className="hidden sm:flex items-center gap-0.5"
          role="navigation"
          aria-label="Navegação principal"
        >
          {NAV_TABS.map((tab) => {
            const active = tab.match.test(pathname);
            return (
              <TopBarTab
                key={tab.href}
                href={tab.href}
                label={tab.label}
                active={active}
              />
            );
          })}
        </nav>

        {/* ---- Direita: mute toggle + auth slot ---- */}
        <div className="flex items-center gap-2">
          <SoundToggle />
          {authSlot}
        </div>
      </header>

      {/* ----------------------------------------------------------------
          PLAY SLOT — CTA massivo centralizado, APENAS na tab Jogar
          Posicionado relativo ao topo do main, centrado horizontalmente.
          Exige que children tenha padding-top suficiente pra não sobrepor.
          ---------------------------------------------------------------- */}
      {isJogarTab && playSlot && (
        <div className="relative w-full flex justify-center pt-6 pb-2 px-4">
          {playSlot}
        </div>
      )}

      {/* ----------------------------------------------------------------
          CONTEÚDO PRINCIPAL — fullscreen wash (sem max-w-* SaaS)
          flex-1 garante que o main ocupa todo o espaço restante.
          ---------------------------------------------------------------- */}
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

/** Tab individual da top-bar — reflete estado ativo com borda brand inferior */
function TopBarTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative px-4 py-1.5 xl:px-5",
        "font-display text-xs xl:text-sm uppercase tracking-widest",
        "transition-colors duration-[var(--motion-duration-micro)]",
        "rounded-[var(--radius-sm)]",
        active
          ? [
              "text-text-display",
              // Sublinhado brand na parte inferior (borda ativa)
              "after:absolute after:bottom-0 after:inset-x-2",
              "after:h-[2px] after:rounded-full",
              "after:bg-brand-primary",
            ]
          : "text-text-muted hover:text-text-body hover:bg-bg-elevated",
      )}
    >
      {label}
    </Link>
  );
}

/** Botão de toggle de mute — ícone Volume2 / VolumeX */
function SoundToggle() {
  const { muted, toggleMute } = useMuteToggle();
  const Icon = muted ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "Ativar som" : "Silenciar"}
      className={cn(
        "flex size-9 items-center justify-center",
        "rounded-[var(--radius-sm)]",
        "text-text-muted hover:text-text-body hover:bg-bg-elevated",
        "transition-colors duration-[var(--motion-duration-micro)]",
      )}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
