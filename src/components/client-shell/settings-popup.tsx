"use client";

// Popup de configurações (engrenagem no topbar). Pedro 2026-07-07: era um dropdown
// absoluto preso ao contexto de empilhamento do topbar — na home o miniperfil da
// coluna esquerda ficava POR CIMA dele. Virou um MODAL CENTRAL (estilo o menu de
// configurações do próprio Dota 2): renderizado num portal com backdrop, então
// nada da página cobre. Agrupa idioma + atalho pro perfil + sair.

import { useState } from "react";
import { Settings, User, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

export function SettingsPopup() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Engrenagem no topbar — abre o modal central */}
      <Dialog.Trigger
        aria-label={t("topbar.settings")}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors",
          "text-white/60 hover:bg-white/5 hover:text-white",
          "data-[popup-open]:bg-white/10 data-[popup-open]:text-white",
        )}
      >
        <Settings size={16} aria-hidden="true" />
      </Dialog.Trigger>

      <Dialog.Content variant="centered" className="max-w-sm">
        <Dialog.Title>{t("topbar.settings")}</Dialog.Title>

        {/* Idioma */}
        <div className="mt-[var(--space-4)]">
          <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
            {t("common.language")}
          </p>
          <LanguageSwitcher />
        </div>

        {/* Ações — perfil + sair */}
        <div className="mt-[var(--space-4)] flex flex-col gap-1 border-t border-border-subtle pt-[var(--space-4)]">
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 font-display text-[13px] text-text-body transition-colors hover:bg-bg-elevated"
          >
            <User size={14} aria-hidden="true" /> {t("topbar.myProfile")}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left font-display text-[13px] text-text-muted transition-colors hover:bg-error/10 hover:text-error"
            >
              <LogOut size={14} aria-hidden="true" /> {t("topbar.signOut")}
            </button>
          </form>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
