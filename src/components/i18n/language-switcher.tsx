"use client";

// Seletor de idioma PT | EN. Com prefixo de URL (localePrefix "as-needed"), trocar
// de idioma NAVEGA pra mesma página na outra URL: PT em "/x", EN em "/en/x".
// O next-intl cuida do prefixo e persiste a escolha no cookie NEXT_LOCALE.

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === current || pending) return;
    startTransition(() => {
      // Mesma rota, outro idioma → URL muda (/x ↔ /en/x).
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={`inline-flex items-center gap-0.5 rounded-sm border border-border-subtle bg-bg-base/60 p-0.5 ${className ?? ""}`}
    >
      {LOCALES.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            onClick={() => change(l)}
            disabled={pending}
            aria-pressed={active}
            className={[
              "rounded-[2px] px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
              active
                ? "bg-brand-primary text-text-display"
                : "text-text-faded hover:text-text-body",
            ].join(" ")}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
