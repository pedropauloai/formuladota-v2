import { getTranslations } from "next-intl/server";
import { Check, Crown, Sparkles } from "lucide-react";
import { PLANS, formatPrice, type Plan, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

// Vitrine dos planos (Compendium). Server component — sem checkout real ainda.

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const PLAN_STYLE: Record<PlanId, { border: string; accent: string }> = {
  gratuito: { border: "border-border-strong", accent: "text-text-muted" },
  aegis: { border: "border-brand-primary/50", accent: "text-brand-primary" },
  godlike: { border: "border-gold/60", accent: "text-gold" },
};

export async function PlansView() {
  const t = await getTranslations("planos");
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2 text-center">
        <p className="flex items-center justify-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary">
          <Sparkles size={16} aria-hidden="true" /> {t("eyebrow")}
        </p>
        <h1 className="font-display text-2xl uppercase tracking-tight text-text-display">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-muted">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} t={t} />
        ))}
      </div>

      <p className="text-center font-display text-[12px] text-text-faded">{t("note")}</p>
    </div>
  );
}

function PlanCard({ plan, t }: { plan: Plan; t: Translator }) {
  const s = PLAN_STYLE[plan.id];
  const isFree = plan.priceMonthly === 0;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-md border-2 bg-bg-base p-5",
        s.border,
        plan.highlight && "ring-2 ring-gold/30 md:-mt-2 md:pb-7"
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm border border-gold/60 bg-bg-deep px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-gold">
          {t("badgeTop")}
        </span>
      )}

      <div className="flex items-center gap-2">
        {plan.id === "godlike" && (
          <Crown size={16} className="text-gold" aria-hidden="true" />
        )}
        <h2
          className={cn(
            "font-display text-lg font-bold uppercase tracking-wide",
            s.accent
          )}
        >
          {t(`names.${plan.id}`)}
        </h2>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        {isFree ? (
          <span className="font-display text-2xl font-bold text-text-display">
            {t("free")}
          </span>
        ) : (
          <>
            <span className="font-display text-2xl font-bold tabular-nums text-text-display">
              {formatPrice(plan.priceMonthly)}
            </span>
            <span className="font-display text-sm text-text-faded">
              {t("perMonth")}
            </span>
          </>
        )}
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-body">
            <Check
              size={15}
              className={cn("mt-0.5 shrink-0", s.accent)}
              aria-hidden="true"
            />
            <span>{t(`features.${f}`)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {isFree ? (
          <span className="block rounded-sm border border-border-subtle py-2 text-center font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
            {t("currentBase")}
          </span>
        ) : (
          <span
            className={cn(
              "block rounded-sm border-2 py-2 text-center font-display text-[13px] font-bold uppercase tracking-wide",
              plan.id === "godlike"
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-brand-primary bg-brand-primary/15 text-text-display"
            )}
          >
            {t("subscribe")}
          </span>
        )}
      </div>
    </div>
  );
}
