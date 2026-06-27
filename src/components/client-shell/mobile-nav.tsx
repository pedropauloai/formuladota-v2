"use client";

// MobileNav — navegação mobile (<lg) do topbar. O cliente Dota 2 é denso e usa
// colunas; no celular essas colunas viram UMA gaveta acessível pelo hambúrguer.
// Conteúdo: tabs principais + contextuais (PRO/Admin) + comunidade (Discord/Conduta)
// + idioma + Entrar/Sair. Mantém a pele da marca (escuro, Teko condensed, tokens).

import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { Menu, X, MessageSquare, BookOpen, LogIn, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut, signInWithDiscord } from "@/app/login/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

type Tab = { href: string; label: string };

export function MobileNav({
  principalTabs,
  contextualTabs,
  isVisitor,
}: {
  principalTabs: Tab[];
  contextualTabs: Tab[];
  isVisitor: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const close = () => setOpen(false);

  // A gaveta é renderizada via PORTAL no document.body. Sem isso ela fica presa no
  // topbar: o <header> tem `backdrop-blur-xl` (backdrop-filter), que cria um containing
  // block e faz o `position: fixed` se ancorar no header (48px), não na viewport.
  // Seguro no SSR: `open` começa false, então o createPortal nunca roda no servidor —
  // só após o clique do usuário (sempre pós-hidratação).
  const drawer = open && (
    <div className="fixed inset-0 z-[var(--z-modal)]">
          {/* Backdrop tocável */}
          <button
            type="button"
            aria-label={t("topbar.close")}
            onClick={close}
            className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm animate-in fade-in duration-150"
          />
          {/* Gaveta da esquerda */}
          <nav
            aria-label={t("topbar.mainNavAria")}
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col border-r border-brand-primary/40 bg-bg-deep shadow-2xl shadow-black/80 animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <span className="font-display-condensed text-xl uppercase tracking-wide text-text-display">
                {t("topbar.mainNavAria")}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label={t("topbar.close")}
                className="flex size-10 items-center justify-center rounded-sm text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {principalTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={close}
                  className="flex min-h-[44px] items-center rounded-sm px-3 font-display-condensed text-lg uppercase tracking-[0.08em] text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors"
                >
                  {tab.label}
                </Link>
              ))}

              {contextualTabs.length > 0 && (
                <>
                  <div className="my-2 h-px bg-border-subtle" />
                  {contextualTabs.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={close}
                      className="flex min-h-[44px] items-center rounded-sm px-3 font-display-condensed text-lg uppercase tracking-[0.08em] text-brand-primary hover:bg-bg-elevated transition-colors"
                    >
                      {tab.label}
                    </Link>
                  ))}
                </>
              )}

              <div className="my-2 h-px bg-border-subtle" />
              <a
                href="https://discord.com/invite/USntaFRS6x"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] items-center gap-2.5 rounded-sm px-3 font-body text-base text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors"
              >
                <MessageSquare size={16} aria-hidden="true" />
                {t("shell.discordOfficial")}
              </a>
              <Link
                href="/codigo-de-conduta"
                onClick={close}
                className="flex min-h-[44px] items-center gap-2.5 rounded-sm px-3 font-body text-base text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors"
              >
                <BookOpen size={16} aria-hidden="true" />
                {t("nav.conduta")}
              </Link>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border-subtle p-3">
              <LanguageSwitcher />
              {isVisitor ? (
                <form action={signInWithDiscord}>
                  <button
                    type="submit"
                    className="flex min-h-[44px] items-center gap-2 rounded-md border-2 border-brand-primary bg-gradient-to-b from-brand-primary to-brand-primary-hover px-4 font-display text-sm font-bold uppercase tracking-[0.15em] text-text-display"
                  >
                    <LogIn size={16} aria-hidden="true" />
                    {t("nav.entrar")}
                  </button>
                </form>
              ) : (
                <form action={signOut}>
                  <button
                    type="submit"
                    aria-label={t("topbar.signOut")}
                    className="flex min-h-[44px] items-center gap-2 rounded-md border border-border-subtle px-4 font-body text-sm text-text-muted hover:text-text-body transition-colors"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {t("topbar.signOut")}
                  </button>
                </form>
              )}
            </div>
          </nav>
        </div>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("topbar.mainNavAria")}
        className="flex size-10 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}
