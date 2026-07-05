"use client";

// Página de novidades (patch notes do FORMULADOTA). Lista as entradas publicadas,
// com filtro por mês e selo de categoria. Ao montar, marca tudo como visto (zera
// o badge do sino no topbar). Renderização do corpo via MiniMarkdown (seguro).

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Wrench, Bug, Scale } from "lucide-react";
import { MiniMarkdown } from "./mini-markdown";
import { markChangelogSeen } from "@/app/novidades/actions";
import type { ChangelogCategory, ChangelogEntry } from "@/lib/queries/changelog";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  ChangelogCategory,
  { labelKey: string; icon: typeof Sparkles; cls: string }
> = {
  novidade: { labelKey: "cat.novidade", icon: Sparkles, cls: "border-info/40 bg-info/10 text-info" },
  melhoria: { labelKey: "cat.melhoria", icon: Wrench, cls: "border-success/40 bg-success/10 text-success" },
  correcao: { labelKey: "cat.correcao", icon: Bug, cls: "border-gold/40 bg-gold/10 text-gold" },
  balanceamento: { labelKey: "cat.balanceamento", icon: Scale, cls: "border-brand-primary/40 bg-brand-primary/10 text-brand-primary" },
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function NovidadesView({ entries }: { entries: ChangelogEntry[] }) {
  const t = useTranslations("novidades");
  const locale = useLocale();
  const [month, setMonth] = useState<string>("all");

  // Marca como visto assim que a página abre (zera o sino). Roda 1x.
  useEffect(() => {
    void markChangelogSeen();
  }, []);

  const months = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      const k = monthKey(e.publishedAt);
      if (!seen.has(k)) {
        seen.set(
          k,
          new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
            new Date(e.publishedAt),
          ),
        );
      }
    }
    return Array.from(seen, ([key, label]) => ({ key, label }));
  }, [entries, locale]);

  const visible = month === "all" ? entries : entries.filter((e) => monthKey(e.publishedAt) === month);

  const dateFmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Cabeçalho */}
      <header className="space-y-2">
        <h1 className="font-display-condensed text-4xl font-bold uppercase tracking-wide text-text-display">
          {t("title")}
        </h1>
        <p className="font-body text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      {/* Filtro por mês */}
      {months.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={month === "all"} onClick={() => setMonth("all")}>
            {t("all")}
          </FilterChip>
          {months.map((m) => (
            <FilterChip key={m.key} active={month === m.key} onClick={() => setMonth(m.key)}>
              {m.label}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Lista */}
      {visible.length === 0 ? (
        <p className="py-16 text-center font-body text-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ol className="space-y-4">
          {visible.map((e) => {
            const meta = CATEGORY_META[e.category];
            const Icon = meta.icon;
            return (
              <li
                key={e.id}
                className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-display text-[0.65rem] font-bold uppercase tracking-wide",
                      meta.cls,
                    )}
                  >
                    <Icon size={11} aria-hidden="true" />
                    {t(meta.labelKey)}
                  </span>
                  <time
                    dateTime={e.publishedAt}
                    className="font-display text-xs uppercase tracking-wide text-text-muted"
                  >
                    {dateFmt.format(new Date(e.publishedAt))}
                  </time>
                </div>
                <h2 className="mb-1 font-display-condensed text-2xl font-semibold leading-tight text-text-display">
                  {e.title}
                </h2>
                {e.bodyMd.trim() !== "" && <MiniMarkdown source={e.bodyMd} />}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm border px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide capitalize transition-colors",
        active
          ? "border-brand-primary bg-brand-primary/15 text-text-display"
          : "border-border-subtle bg-bg-elevated/40 text-text-muted hover:text-text-display",
      )}
    >
      {children}
    </button>
  );
}
