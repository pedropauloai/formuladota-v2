// "Como funciona" da fila: os três passos e as duas regras que respondem o medo de quem paga
// (não aparecer na hora e a live acabar antes da vez). Desenhado no servidor.

import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("fila");
  const steps = [t("how1"), t("how2"), t("how3")];
  return (
    <section className="space-y-4 rounded-md border border-border-subtle bg-bg-base/70 p-4 md:p-5">
      <h2 className="font-display text-xl uppercase leading-none tracking-wide text-text-display">{t("howTitle")}</h2>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-gold/50 font-display text-base leading-none text-gold">
              {i + 1}
            </span>
            <span className="pt-1 text-sm leading-relaxed text-text-body">{step}</span>
          </li>
        ))}
      </ol>
      <ul className="space-y-2 border-t border-border-subtle pt-3 text-sm leading-relaxed text-text-muted">
        <li>{t("rulesNoShow")}</li>
        <li>{t("rulesCarry")}</li>
      </ul>
    </section>
  );
}
