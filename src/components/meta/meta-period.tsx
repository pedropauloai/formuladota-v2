// Linha de estado do /meta: de que dias são as partidas somadas, de que patch, o recorte da
// medalha Imortal e quando o cache foi renovado. Server Component, só texto.

import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import {
  describePatches,
  formatMetaDay,
  formatUpdatedAt,
  type DotaPatch,
  type MetaWindow,
} from "@/lib/dota/meta-period";

export function MetaPeriod({
  window,
  patches,
  refreshedAt,
}: {
  window: MetaWindow;
  patches: DotaPatch[];
  refreshedAt: string;
}) {
  const t = useTranslations("meta");
  const current = useLocale();
  const locale = isLocale(current) ? current : DEFAULT_LOCALE;
  const start = formatMetaDay(window.start, locale);
  const end = formatMetaDay(window.end, locale);
  const coverage = describePatches(patches);

  let period: string;
  if (!coverage) {
    period = t("periodNoPatch", { start, end });
  } else if (coverage.kind === "one") {
    period = t("periodOne", { start, end, patch: coverage.patch });
  } else if (coverage.kind === "turn") {
    const released = formatMetaDay(coverage.currentStartedAt.slice(0, 10), locale);
    period = t("periodTurn", { start, end, previous: coverage.previous, current: coverage.current, released });
  } else {
    const list = new Intl.ListFormat(locale, { type: "conjunction" }).format(coverage.patches);
    period = t("periodMany", { start, end, patches: list });
  }

  return (
    <p className="mt-2 max-w-3xl font-display text-sm text-text-muted 2xl:text-base">
      {period} {t("hiddenTop")} {t("updatedAt", formatUpdatedAt(refreshedAt, locale))}
    </p>
  );
}
