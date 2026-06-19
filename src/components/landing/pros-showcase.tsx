// Seção 4 da landing — destaque do Pedro + 3 slots EM BREVE pra escala futura.
// Server Component (sem dados dinâmicos por enquanto — Pedro hardcoded até virar
// coach no DB, aí migramos pra dinâmico).

import { Shield, Award, Clock, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

export function PROsShowcase() {
  const t = useTranslations("misc");
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <header className="mb-12 space-y-4">
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            {t("prosEyebrow")}
          </p>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-5xl">
            {t("prosHeading")}
          </h2>
          <div className="brand-divider" />
          <p className="max-w-2xl font-sans text-sm text-[var(--color-muted-foreground)]">
            {t("prosIntro")}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Card grande Pedro — span 2 colunas */}
          <article className="flex flex-col rounded-md border border-[var(--color-brand-red)]/40 bg-gradient-to-br from-[var(--color-brand-red)]/8 to-transparent p-8 md:col-span-2">
            <div className="mb-6 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-red)]">
              <Shield size={14} />
              {t("prosFounder")}
            </div>
            <h3 className="mb-1 font-display text-3xl font-bold uppercase text-white">
              Pedro Paulo
            </h3>
            <p className="mb-6 font-mono-ui text-sm text-[var(--color-muted-foreground)]">
              {t("prosPedroMeta")}
            </p>
            <p className="mb-8 font-serif text-base leading-relaxed text-white/80">
              {t("prosPedroBio")}
            </p>
            <ul className="mt-auto space-y-2 font-sans text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Trophy size={14} className="text-[var(--color-brand-red)]" />
                {t("prosPedroMmr")}
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--color-brand-red)]" />
                {t("prosPedroHours")}
              </li>
              <li className="flex items-center gap-2">
                <Award size={14} className="text-[var(--color-brand-red)]" />
                {t("prosPedroCreator")}
              </li>
            </ul>
          </article>

          {/* 3 slots EM BREVE */}
          {[1, 2, 3].map((i) => (
            <article
              key={i}
              className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-6 text-center"
            >
              <div className="mb-4 size-16 rounded-sm bg-[var(--color-border)]/40" />
              <p className="font-sans text-sm font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                {t("prosComingSoon")}
              </p>
              <p className="mt-2 font-sans text-sm text-[var(--color-muted-foreground)]/60">
                {t("prosNextCertified")}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 font-sans text-sm text-[var(--color-muted-foreground)]">
          {t("prosBecomePro")}
        </p>
      </div>
    </section>
  );
}
