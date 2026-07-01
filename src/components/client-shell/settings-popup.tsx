"use client";

// Popup de configurações (engrenagem no topbar). Abre um dropdown com o toggle de
// idioma + atalho pro perfil + sair. Pedro 2026-07-01: tirar o idioma solto do topbar
// e agrupar em "configurações".

import { useState, useRef, useEffect } from "react";
import { Settings, User, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";

export function SettingsPopup() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("topbar.settings")}
        aria-expanded={open}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors",
          open
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <Settings size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[var(--z-system)] mt-2 w-56 overflow-hidden rounded-md border border-border-strong bg-bg-deep shadow-2xl shadow-black/70 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="border-b border-border-subtle p-3">
            <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
              {t("common.language")}
            </p>
            <LanguageSwitcher />
          </div>
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 font-display text-[13px] text-text-body hover:bg-bg-elevated transition-colors"
          >
            <User size={14} aria-hidden="true" /> {t("topbar.myProfile")}
          </Link>
          <form action={signOut} className="border-t border-border-subtle">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-display text-[13px] text-text-muted hover:bg-error/10 hover:text-error transition-colors"
            >
              <LogOut size={14} aria-hidden="true" /> {t("topbar.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
