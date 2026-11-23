// O fim da página do Battlepass: o que continua grátis (o plano Gratuito saiu como cartão de compra,
// mas a pessoa precisa saber o que segue aberto), as perguntas curtas e a chamada de volta ao painel.
// Desenhado no servidor.

import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUp, Check, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { BATTLEPASS } from "@/lib/battlepass/config";
import { CtaWarp, Panel, Price, plate } from "@/components/v2";
import { SECTION_TITLE, WRAP } from "./layout";

export function BattlepassFree({ seatCents, doctrineOn }: { seatCents: number; doctrineOn: boolean }) {
  const t = useTranslations("battlepass");
  // A doutrina só entra na lista com o quiz ligado: desligado, a /doutrina leva para a home.
  const items = [...(doctrineOn ? [t("freeDoctrine")] : []), t("freeRanking"), t("freeProfile"), t("freeRooms")];
  return (
    <section aria-labelledby="bp-gratis" className={cn(WRAP, "mt-16 md:mt-24")}>
      <Panel className="grid gap-6 p-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:p-7">
        <div className="space-y-2">
          <h2 id="bp-gratis" className={SECTION_TITLE}>
            {t("freeTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">{t("freeIntro")}</p>
        </div>
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-text-body">
              <Check size={16} className="mt-0.5 shrink-0 text-play-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
          <li className="flex flex-wrap items-start gap-x-2.5 gap-y-1 text-sm text-text-body sm:col-span-2">
            <Check size={16} className="mt-0.5 shrink-0 text-play-primary" aria-hidden="true" />
            <span>{t("freeSeat", { price: formatPrice(seatCents) })}</span>
            <Link href="/party" className="inline-flex items-center gap-1 text-gold underline-offset-4 hover:underline">
              {t("partyLink")}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </Panel>
    </section>
  );
}

const QUESTIONS = [
  ["faqCancelQ", "faqCancelA"],
  ["faqPixQ", "faqPixA"],
  ["faqGuaranteeQ", "faqGuaranteeA"],
  ["faqMatchesQ", "faqMatchesA"],
] as const;

export function BattlepassFaq() {
  const t = useTranslations("battlepass");
  const price = formatPrice(BATTLEPASS.priceCents);
  return (
    <section aria-labelledby="bp-perguntas" className={cn(WRAP, "mt-16 md:mt-24")}>
      <h2 id="bp-perguntas" className={SECTION_TITLE}>
        {t("faqTitle")}
      </h2>
      <div className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-base font-bold text-text-display hover:text-gold md:text-lg [&::-webkit-details-marker]:hidden">
              {t(question)}
              <Plus size={18} className="shrink-0 text-gold transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <p className="max-w-3xl pb-5 text-sm leading-relaxed text-text-body md:text-base">{t(answer, { price })}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Para quem leu até o fim e ainda não assina: o preço e o caminho de volta ao painel. */
export function BattlepassClosing() {
  const t = useTranslations("battlepass");
  return (
    <section className={cn(WRAP, "mt-14 md:mt-20")}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-y border-border-subtle py-6">
        <div className="space-y-2">
          <p className="font-display-condensed text-[2rem] uppercase leading-none text-text-display md:text-[2.4rem]">
            {t.rich("title", { gold: (chunks) => <span className="text-gold">{chunks}</span> })}
          </p>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-muted">
            <Price cents={BATTLEPASS.priceCents} unit={t("perMonth")} className="text-[2.2rem]" />
            {t("closingText")}
          </p>
        </div>
        <a href="#assinar" className={plate({ kind: "cta", large: true })}>
          <CtaWarp />
          {t("closingCta")}
          <ArrowUp size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
