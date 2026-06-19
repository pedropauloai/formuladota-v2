"use client";

// Seletor de idioma PT | EN. Grava o cookie via Server Action e dá router.refresh()
// pra re-renderizar tudo (Server Components leem o novo cookie). Sem mudar a URL.

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === current || pending) return;
    startTransition(async () => {
      await setLocale(next);
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
