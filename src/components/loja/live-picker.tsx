"use client";

// Escolha da live na compra da vaga na party e do replay ao vivo: as próximas lives marcadas com
// vaga, com quantas sobram. O servidor confere a vaga de novo, com trava, antes de reservar.

import { useLocale, useTranslations } from "next-intl";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveOption } from "@/lib/loja/agenda-server";

interface Props {
  lives: LiveOption[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string;
}

export function LivePicker({ lives, value, onChange, error }: Props) {
  const t = useTranslations("loja");
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-medium text-text-body">
        {t("liveLegend")}
        <span className="text-xs font-normal text-text-faded">{t("agendaTimezone")}</span>
      </legend>
      {lives.map((live) => (
        <label
          key={live.id}
          className={cn(
            "flex cursor-pointer items-start justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm",
            live.id === value ? "border-success/70 bg-success/10 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
          )}
        >
          <span className="flex items-start gap-2">
            <input type="radio" name="live_id" value={live.id} checked={live.id === value} onChange={() => onChange(live.id)} className="mt-1 accent-[var(--color-success)]" />
            <span>
              <span className="flex items-center gap-1.5 first-letter:uppercase">
                <Radio size={14} aria-hidden="true" className="text-brand-primary" />
                {fmt.format(new Date(live.startsAt))}
              </span>
              {live.notes && <span className="mt-0.5 block text-xs text-text-faded">{live.notes}</span>}
            </span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-gold">{t("liveSeatsLeft", { count: live.seatsLeft })}</span>
        </label>
      ))}
      {error && <span className="block text-xs text-error">{error}</span>}
    </fieldset>
  );
}
