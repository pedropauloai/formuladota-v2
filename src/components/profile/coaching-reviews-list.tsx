// Lista de análises de coaching (presentacional, server-safe). Usada no perfil
// do aluno (aba Conduta) e na página do aluno vista pelo PRO.

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CoachingReview } from "@/lib/queries/coaching-reviews";

export function CoachingReviewsList({
  reviews,
  emptyLabel,
}: {
  reviews: CoachingReview[];
  emptyLabel?: string;
}) {
  const t = useTranslations("perfil");
  if (reviews.length === 0) {
    return (
      <p className="font-body text-sm 2xl:text-base text-text-muted">
        {emptyLabel ?? t("coachingReviewsDefaultEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <article
          key={r.id}
          className="rounded-md border border-border-subtle bg-bg-elevated/40 p-4 space-y-2"
        >
          <header className="flex items-center justify-between gap-2">
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-brand-primary">
              {t("reviewBy", { coach: r.coachName })}
            </span>
            <span className="font-mono text-xs 2xl:text-sm text-text-faded">
              {new Date(r.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </header>

          {r.rating != null && (
            <div className="flex items-center gap-0.5" aria-label={t("ratingAria", { rating: r.rating! })}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={i < r.rating! ? "text-gold fill-current" : "text-text-faded"}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          <p className="font-body text-sm 2xl:text-base text-text-body whitespace-pre-wrap">{r.summary}</p>

          {r.strengths && (
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-success">
                {t("strengths")}
              </p>
              <p className="font-body text-sm 2xl:text-base text-text-muted whitespace-pre-wrap">
                {r.strengths}
              </p>
            </div>
          )}
          {r.improvements && (
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-warning">
                {t("improvements")}
              </p>
              <p className="font-body text-sm 2xl:text-base text-text-muted whitespace-pre-wrap">
                {r.improvements}
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
