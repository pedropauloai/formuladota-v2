import { getTranslations } from "next-intl/server";
import { Sparkles, Lock, Check, Crown, ScrollText } from "lucide-react";
import { TIER_CONFIG } from "@/lib/levels";
import { COMPENDIUM_TRACK, WEEKLY_MISSIONS } from "@/lib/compendium";
import { cn } from "@/lib/utils";

interface Props {
  /** Nível de conta atual (0-30) — proxy do nível do passe até a Fase 2. */
  level: number;
  /** Progresso de XP dentro do nível (0-1). */
  xpPct: number;
  seasonName: string;
  /** Dias restantes da temporada (null se sem data de fim). */
  daysLeft: number | null;
}

export async function CompendiumView({ level, xpPct, seasonName, daysLeft }: Props) {
  const t = await getTranslations("compendium");
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary">
          <Sparkles size={16} aria-hidden="true" /> {t("eyebrow")}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-2xl uppercase tracking-tight text-text-display">
            {seasonName}
          </h1>
          {daysLeft !== null && (
            <span className="rounded-sm border border-border-subtle bg-bg-base px-2 py-1 font-display text-[12px] font-semibold uppercase tracking-wide text-text-muted">
              {t("daysLeft", { days: daysLeft })}
            </span>
          )}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{t("subtitle")}</p>
      </header>

      {/* Progresso do passe */}
      <section className="rounded-md border border-border-subtle bg-bg-base p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-[12px] font-semibold uppercase tracking-wide text-text-faded">
              {t("passLevel")}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-gold">{level}</p>
          </div>
          <p className="font-display text-[12px] text-text-muted">
            {t("toNext", { pct: Math.round(xpPct * 100) })}
          </p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-primary/70 to-brand-primary"
            style={{ width: `${Math.round(Math.max(0, Math.min(1, xpPct)) * 100)}%` }}
          />
        </div>
        <p className="mt-2 font-display text-[12px] text-text-faded">{t("passHint")}</p>
      </section>

      {/* Trilha de recompensas */}
      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-body">
          {t("trackTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COMPENDIUM_TRACK.map((m) => {
            const cfg = TIER_CONFIG[m.tier];
            const unlocked = level >= m.level;
            return (
              <div
                key={m.tier}
                className={cn(
                  "flex flex-col gap-3 rounded-md border bg-bg-base p-3",
                  unlocked ? cfg.borderColor : "border-border-subtle",
                  !unlocked && "opacity-70"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-sm border font-display text-sm font-bold tabular-nums",
                      cfg.borderColor,
                      cfg.color
                    )}
                  >
                    {m.level}
                  </span>
                  {unlocked ? (
                    <Check size={15} className={cfg.color} aria-hidden="true" />
                  ) : (
                    <Lock size={13} className="text-text-faded" aria-hidden="true" />
                  )}
                </div>
                <p className={cn("font-display text-[13px] font-semibold", cfg.color)}>
                  {cfg.label}
                </p>
                <div className="space-y-2 text-[12px]">
                  <div>
                    <p className="font-display uppercase tracking-wide text-text-faded">
                      {t("freeTrack")}
                    </p>
                    <p className="text-text-body">{t(`rewards.${m.freeRewardKey}`)}</p>
                  </div>
                  <div className="border-t border-border-subtle pt-2">
                    <p className="flex items-center gap-1 font-display uppercase tracking-wide text-gold-muted">
                      <Crown size={11} aria-hidden="true" /> {t("paidTrack")}
                    </p>
                    <p className="text-text-muted">{t(`rewards.${m.paidRewardKey}`)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Missões da semana */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-text-body">
          <ScrollText size={15} aria-hidden="true" /> {t("missionsTitle")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {WEEKLY_MISSIONS.map((mission) => (
            <li
              key={mission.key}
              className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-base px-4 py-3"
            >
              <span className="font-display text-[13px] text-text-body">
                {t(`missions.${mission.key}`)}
              </span>
              <span className="shrink-0 rounded-sm border border-border-gold/40 bg-gold/10 px-2 py-0.5 font-display text-[12px] font-bold tabular-nums text-gold">
                +{mission.xp} XP
              </span>
            </li>
          ))}
        </ul>
        <p className="font-display text-[12px] text-text-faded">{t("missionsHint")}</p>
      </section>
    </div>
  );
}
