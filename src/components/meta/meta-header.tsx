// Cabeçalho do /meta: título, linha de estado (de quando e de quem é o dado), filtros e avisos.
// Server Components: os filtros são links (o estado mora na URL); só a busca roda no navegador.

import Image from "next/image";
import { AlertTriangle, Info } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { plate } from "@/components/v2";
import { POSITION_ICON } from "@/lib/dota/hero-assets";
import { describePatches, formatMetaDay, formatUpdatedAt, patchesInWindow } from "@/lib/dota/meta-period";
import type { MetaPageData } from "@/lib/dota/meta/page-data";
import { MIN_OPTIONS, metaHref } from "@/lib/dota/meta/url-state";
import { META_ROLES, type MetaRole } from "@/lib/dota/meta/view";
import type { PeriodKind } from "@/lib/dota/meta/windows";
import { fmtNum } from "./meta-parts";

export async function pageLocale(): Promise<Locale> {
  const current = await getLocale();
  return isLocale(current) ? current : DEFAULT_LOCALE;
}

export function roleKey(role: MetaRole): "roleAll" | "role1" | "role2" | "role3" | "role4" | "role5" {
  return role === "all" ? "roleAll" : `role${role}`;
}

export async function MetaTitle({ data, className }: { data: MetaPageData; className?: string }) {
  const t = await getTranslations("meta");
  const p = data.view.period;
  const title =
    data.period === "patch" ? t("titlePatch", { patch: p.patch ?? "" }) : data.period === "previous" ? t("titlePrevious", { patch: p.patch ?? "" }) : t("titleRecent");
  return <h1 className={cn("font-display-condensed uppercase leading-none tracking-[0.02em] text-text-display", className)}>{title}</h1>;
}

/** "Partidas de 19/11 a 23/11, no 7.42." com os patches que a janela cobre. */
async function periodSentence(data: MetaPageData, locale: Locale): Promise<string> {
  const t = await getTranslations("meta");
  const { start: s, end: e } = data.view.period;
  const start = formatMetaDay(s, locale);
  const end = formatMetaDay(e, locale);
  const coverage = describePatches(patchesInWindow(data.patches, { start: s, end: e }));
  if (!coverage) return t("periodNoPatch", { start, end });
  if (coverage.kind === "one") return t("periodOne", { start, end, patch: coverage.patch });
  if (coverage.kind === "turn") return t("periodTurn", { start, end, previous: coverage.previous, current: coverage.current });
  return t("periodMany", { start, end, patches: new Intl.ListFormat(locale, { type: "conjunction" }).format(coverage.patches) });
}

/** Linha de estado: período, faixa, partidas, atualização e o atalho para "Como ler". */
export async function StateLine({ data, className }: { data: MetaPageData; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  const updated = formatUpdatedAt(data.summaryAt, locale);
  const chip = "inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-bg-deep/60 px-2 py-1";
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5 font-body text-[0.8rem] text-text-muted", className)}>
      <span className="text-text-body">{await periodSentence(data, locale)}</span>
      <span className={chip}>{t("days", { count: data.view.period.days })}</span>
      <span className={chip} title={t("bracketHelp")}>
        <Info size={12} className="text-gold" aria-hidden="true" />
        {t("bracket")}
      </span>
      <span className={cn(chip, "font-semibold tabular-nums text-gold")}>{t("matches", { count: Math.round(data.view.matches) })}</span>
      <span className={chip} title={t("updatedHelp")}>
        {t("updated", updated)}
      </span>
      {/* No computador o "Como ler" está na coluna da direita; no celular, no fim da página. */}
      <a href="#como-ler" className="font-semibold text-text-display underline decoration-gold/60 underline-offset-4 hover:decoration-gold max-lg:hidden">
        {t("howToRead")}
      </a>
      <a href="#como-ler-celular" className="font-semibold text-text-display underline decoration-gold/60 underline-offset-4 lg:hidden">
        {t("howToRead")}
      </a>
    </div>
  );
}

export async function RoleTabs({ data }: { data: MetaPageData }) {
  const t = await getTranslations("meta");
  return (
    <nav aria-label={t("filterRole")} className="flex flex-wrap gap-1.5">
      {META_ROLES.map((role) => (
        <Link
          key={role}
          href={metaHref(data.state, { role })}
          aria-current={data.state.role === role ? "page" : undefined}
          className={cn(plate({ kind: "tab", small: true }), "min-h-9 px-3 text-base")}
        >
          {role !== "all" && <Image src={POSITION_ICON[role]} alt="" width={18} height={18} className="size-[18px] object-contain" aria-hidden />}
          {t(roleKey(role))}
        </Link>
      ))}
    </nav>
  );
}

function periodLabel(t: Awaited<ReturnType<typeof getTranslations<"meta">>>, kind: PeriodKind, patch: string | null): string {
  if (kind === "patch") return t("periodPatch", { patch: patch ?? "" });
  if (kind === "previous") return t("periodPrevious", { patch: patch ?? "" });
  return t("periodRecent");
}

export async function PeriodTabs({ data }: { data: MetaPageData }) {
  const t = await getTranslations("meta");
  return (
    <nav aria-label={t("filterPeriod")} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-body text-xs font-semibold text-text-faded">{t("filterPeriod")}</span>
      {data.periods.map((p) => (
        <Link
          key={p.kind}
          href={metaHref(data.state, { period: p.kind })}
          aria-current={data.period === p.kind ? "page" : undefined}
          className={cn(plate({ kind: "tab", small: true }), "min-h-9 px-3 text-base")}
        >
          {periodLabel(t, p.kind, p.patch)}
        </Link>
      ))}
    </nav>
  );
}

export async function MinTabs({ data }: { data: MetaPageData }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  return (
    <nav aria-label={t("filterMin")} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-body text-xs font-semibold text-text-faded">{t("filterMin")}</span>
      {MIN_OPTIONS.map((min) => (
        <Link
          key={min}
          href={metaHref(data.state, { min })}
          aria-current={data.state.min === min ? "page" : undefined}
          className={cn(plate({ kind: "tab", small: true }), "min-h-9 px-2.5 text-base tabular-nums")}
        >
          {t("minOption", { count: fmtNum(min, locale) })}
        </Link>
      ))}
    </nav>
  );
}

/** Avisos curtos: patch novo, patch sem dia inteiro e a soma de funções em "Todas". */
export async function Notes({ data, className }: { data: MetaPageData; className?: string }) {
  const t = await getTranslations("meta");
  const notes: Array<{ key: string; text: string; warn: boolean }> = [];
  if (data.fallback && data.currentPatch) notes.push({ key: "fallback", text: t("noPatchDay", { patch: data.currentPatch }), warn: true });
  if (data.young !== null) {
    notes.push({ key: "young", text: t("youngPatch", { patch: data.view.period.patch ?? "", days: t("days", { count: data.young }) }), warn: true });
  }
  if (data.state.role === "all") notes.push({ key: "all", text: t("allRolesNote"), warn: false });
  if (notes.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {notes.map((n) => (
        <p key={n.key} className={cn("flex items-start gap-2 font-body text-[0.8rem]", n.warn ? "text-warning" : "text-text-muted")}>
          {n.warn ? <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Info size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />}
          {n.text}
        </p>
      ))}
    </div>
  );
}

function sourceLink(href: string) {
  return function SourceLink(chunks: React.ReactNode) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-text-body underline decoration-gold/50 underline-offset-4 hover:decoration-gold">
        {chunks}
      </a>
    );
  };
}

export async function SourceFooter({ className }: { className?: string }) {
  const t = await getTranslations("meta");
  return (
    <p className={cn("font-body text-xs text-text-faded", className)}>
      {t.rich("source", { stratz: sourceLink("https://stratz.com"), opendota: sourceLink("https://www.opendota.com") })}
    </p>
  );
}
