// A coluna direita do /meta (no lugar da coluna genérica do site nesta página): o profissional no
// patch, quem subiu e caiu contra o fim do patch anterior e o "Como ler".

import type { ReactNode } from "react";
import { BookOpen, Trophy, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { panel, v2Page } from "@/components/v2";
import { CardHeader } from "@/components/client-shell/sidebar-card-header";
import { LETTERS, letterFloor } from "@/lib/dota/meta/scoring";
import { formatMetaDay } from "@/lib/dota/meta-period";
import type { MetaPageData } from "@/lib/dota/meta/page-data";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import { pageLocale } from "./meta-header";
import { HeroFace, LetterBadge, fmtDelta, fmtPct } from "./meta-parts";

/** Invólucro da coluna: o mesmo respiro da coluna do site e o mesmo zoom da página em telas de 1440. */
export function RightColumn({ children }: { children: ReactNode }) {
  return <div className={cn(v2Page, "flex w-full flex-col gap-3 pb-[96px] pl-4 pr-10 pt-4 2xl:pb-[112px]")}>{children}</div>;
}

// Abaixo de 5 escolhas a vitória profissional é sorte pura: a célula fica vazia.
const PRO_MIN_PICKS = 5;
const PRO_ROWS = 10;

export async function ProCard({ data }: { data: MetaPageData }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  const pro = data.pro;
  if (!pro) return null;
  const day = formatMetaDay(pro.startedAt.slice(0, 10), locale);
  return (
    <article className={cn(panel("neutral"), "overflow-hidden")}>
      <CardHeader icon={Trophy} title={t("proTitle", { patch: pro.patch })} subtitle={t("proSubtitle", { matches: pro.matches, leagues: pro.leagues, day })} />
      {pro.rows.length === 0 ? (
        <p className="px-3 py-3 font-body text-sm text-text-muted">{t("proEmpty")}</p>
      ) : (
        <table className="w-full font-body text-[0.8rem]">
          <thead>
            <tr className="text-[0.7rem] text-text-faded">
              <th className="px-3 py-1.5 text-left font-semibold" scope="col">
                <span className="sr-only">{t("colHero")}</span>
              </th>
              <th className="px-1 py-1.5 text-right font-semibold" scope="col">{t("proPicks")}</th>
              <th className="px-1 py-1.5 text-right font-semibold" scope="col">{t("proBans")}</th>
              <th className="px-3 py-1.5 text-right font-semibold" scope="col">{t("proWin")}</th>
            </tr>
          </thead>
          <tbody>
            {pro.rows.slice(0, PRO_ROWS).map((r) => (
              <tr key={r.id} className="border-t border-border-subtle/60">
                <td className="px-3 py-1">
                  <span className="flex items-center gap-2">
                    <HeroFace src={r.face} name="" size={22} />
                    <span className="truncate text-text-display">{r.name}</span>
                  </span>
                </td>
                <td className="px-1 py-1 text-right tabular-nums text-gold">{r.picks}</td>
                <td className="px-1 py-1 text-right tabular-nums text-text-muted">{r.bans}</td>
                <td className="px-3 py-1 text-right tabular-nums text-text-muted" title={r.picks < PRO_MIN_PICKS ? t("proFew") : undefined}>
                  {r.picks >= PRO_MIN_PICKS ? fmtPct((r.wins / r.picks) * 100, locale, 0) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="border-t border-border-subtle px-3 py-2 font-body text-[0.7rem] text-text-faded">{t("proNote")}</p>
    </article>
  );
}

function MoverList({ rows, locale, up }: { rows: MetaHeroRow[]; locale: string; up: boolean }) {
  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-2 py-1">
          <HeroFace src={r.face} name="" size={22} />
          <span className="min-w-0 flex-1 truncate font-body text-[0.8rem] text-text-display">{r.name}</span>
          <span className={cn("font-body text-[0.8rem] font-semibold tabular-nums", up ? "text-success" : "text-brand-text")}>{fmtDelta(r.delta ?? 0, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

export async function MoversCard({ data }: { data: MetaPageData }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  const { up, down } = data.movers;
  const patch = data.view.baseline?.patch ?? data.previousPatch;
  return (
    <article className={cn(panel("neutral"), "@container overflow-hidden")}>
      <CardHeader icon={TrendingUp} title={t("moversTitle")} subtitle={patch ? t("moversSubtitle", { patch }) : null} />
      {!data.view.baseline || (up.length === 0 && down.length === 0) ? (
        <p className="px-3 py-3 font-body text-sm text-text-muted">{t("moversEmpty")}</p>
      ) : (
        // Duas colunas quando cabe (1920); uma só na coluna mais estreita da tela de 1440 com zoom.
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-3 py-2 @md:grid-cols-2">
          <div>
            <p className="pb-1 font-body text-[0.7rem] font-semibold text-success">{t("moversUp")}</p>
            <MoverList rows={up} locale={locale} up />
          </div>
          <div>
            <p className="pb-1 font-body text-[0.7rem] font-semibold text-brand-text">{t("moversDown")}</p>
            <MoverList rows={down} locale={locale} up={false} />
          </div>
        </div>
      )}
    </article>
  );
}

/** No computador fica na coluna da direita; no celular (sem a coluna) uma cópia vai para o fim da página. */
export async function HowToRead({ data, id = "como-ler" }: { data: MetaPageData; id?: string }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  const b = (chunks: ReactNode) => <strong className="font-semibold text-text-display">{chunks}</strong>;
  const before: ReactNode[] = [t.rich("readWinRate", { b }), t.rich("readAdjusted", { b }), t.rich("readPick", { b }), t.rich("readGrade", { b })];
  const after: ReactNode[] = [
    ...(data.previousPatch ? [t.rich("readDelta", { b, patch: data.previousPatch })] : []),
    t.rich("readMin", { b }),
    t.rich("readBracket", { b }),
    t("readPatchDay"),
  ];
  const cutFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <article id={id} className={cn(panel("neutral"), "scroll-mt-4 overflow-hidden")}>
      <CardHeader icon={BookOpen} title={t("howToRead")} />
      <div className="flex flex-col gap-2 px-3 py-3 font-body text-[0.8rem] leading-relaxed text-text-muted">
        {before.map((item, i) => (
          <p key={i}>{item}</p>
        ))}
        <p>{t.rich("readLetters", { b })}</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {LETTERS.map((letter) => {
            const floor = letterFloor(letter);
            const cut = cutFormat.format(floor ?? letterFloor("D") ?? 0);
            return (
              <li key={letter} className="flex items-center gap-2">
                <LetterBadge letter={letter} size="sm" />
                <span className="tabular-nums">{floor !== null ? t("letterFloor", { value: cut }) : t("letterUnder", { value: cut })}</span>
              </li>
            );
          })}
        </ul>
        {after.map((item, i) => (
          <p key={`after-${i}`}>{item}</p>
        ))}
      </div>
    </article>
  );
}
