"use client";

// Escolha ÚNICA da região de jogo no onboarding (/vincular/steam).
// 3 regiões, filas nunca se misturam. Depois de confirmada, só admin muda.
// Independente do idioma da UI (textos vêm do i18n normalmente).

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { GAME_REGIONS, REGION_LABELS, type GameRegion } from "@/lib/regions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chooseRegion } from "./actions";

export function RegionPicker() {
  const t = useTranslations("account");
  const [selected, setSelected] = useState<GameRegion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!selected || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await chooseRegion(selected);
      if (!res.success) setError(res.error ?? t("regionSaveError"));
      // Sucesso: revalidatePath re-renderiza a página sem o picker.
    });
  }

  return (
    <Card variant="elevated" aria-labelledby="region-heading" className="mb-6 md:p-8">
      <div className="mb-2 flex items-center gap-3">
        <Globe className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        <h2
          id="region-heading"
          className="font-display text-xl font-semibold tracking-wide text-text-display"
        >
          {t("regionHeading")}
        </h2>
      </div>
      <p className="mb-5 font-body text-sm leading-relaxed text-text-muted">
        {t("regionBody")}
      </p>

      <div role="radiogroup" aria-label={t("regionHeading")} className="mb-5 grid gap-2 sm:grid-cols-3">
        {GAME_REGIONS.map((r) => {
          const active = r === selected;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(r)}
              disabled={pending}
              className={[
                "rounded-sm border p-3 text-left transition-colors disabled:opacity-50",
                active
                  ? "border-brand-primary bg-brand-primary/10"
                  : "border-border-subtle bg-bg-base/60 hover:border-border-strong",
              ].join(" ")}
            >
              <span className="flex items-center justify-between font-display text-base font-bold uppercase tracking-wide text-text-display">
                {REGION_LABELS[r]}
                {active && <Check className="h-4 w-4 text-brand-primary" aria-hidden="true" />}
              </span>
              <span className="mt-1 block font-body text-xs text-text-muted">
                {t(`regionDesc${r}`)}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mb-3 font-body text-sm text-error">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!selected || pending}
        onClick={confirm}
      >
        {t("regionConfirm")}
      </Button>
      <p className="mt-2 text-center font-body text-xs text-text-faded">
        {t("regionLockNote")}
      </p>
    </Card>
  );
}
