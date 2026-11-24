"use client";

// Busca por nome no /meta: filtra a tabela enquanto a pessoa digita.

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useMetaUi } from "./meta-ui";

export function SearchBox({ className }: { className?: string }) {
  const t = useTranslations("meta");
  const { query, setQuery } = useMetaUi();
  return (
    <label className={cn("relative flex h-10 items-center", className)}>
      <span className="sr-only">{t("searchLabel")}</span>
      <Search size={15} className="pointer-events-none absolute left-3 text-text-faded" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search")}
        className="h-10 w-full rounded-sm border border-border-strong bg-bg-deep/70 pl-9 pr-8 font-body text-sm text-text-display placeholder:text-text-faded focus:border-gold focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 flex size-6 items-center justify-center rounded-sm text-text-faded hover:text-text-display"
          aria-label={t("searchClear")}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}
