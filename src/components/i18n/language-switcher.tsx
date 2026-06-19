"use client";

// Seletor de idioma PT | EN. Slugs traduzidos (sem /en):
//   - Rotas com slug próprio (/torneios ↔ /tournaments): troca = navega pro slug.
//   - Rotas compartilhadas (/, /dashboard, /ranking): URL não muda → grava o
//     cookie NEXT_LOCALE e dá refresh (o middleware decide o idioma pelo cookie).

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { localizePath, internalizePath } from "@/i18n/pathnames";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLocale() as Locale;
  const router = useRouter();
  const rawPath = usePathname();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === current || pending) return;
    // Lembra a escolha — rotas compartilhadas resolvem o idioma pelo cookie.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const target = localizePath(internalizePath(rawPath), next);
    startTransition(() => {
      router.replace(target);
      router.refresh();
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
