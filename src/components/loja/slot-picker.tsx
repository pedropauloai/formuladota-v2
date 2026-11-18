"use client";

// Escolha do dia e do horário na compra: os dias com horário livre numa faixa que rola de lado e
// os horários do dia escolhido embaixo. A conta é a mesma do servidor (src/lib/loja/agenda.ts),
// que confere de novo antes de reservar.

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { availableSlots, type Interval, type WeeklyWindow } from "@/lib/loja/agenda";

const TZ = "America/Sao_Paulo";

interface Props {
  windows: WeeklyWindow[];
  busy: Interval[];
  durationMinutes: number;
  value: string | null;
  onChange: (iso: string | null) => void;
  error?: string;
  name?: string;
}

export function SlotPicker({ windows, busy, durationMinutes, value, onChange, error, name = "slot_start" }: Props) {
  const t = useTranslations("loja");
  const locale = useLocale();
  const days = useMemo(() => availableSlots({ windows, busy, now: new Date(), durationMinutes }), [windows, busy, durationMinutes]);
  const [dayIndex, setDayIndex] = useState(0);
  const day = days[Math.min(dayIndex, Math.max(0, days.length - 1))];
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: TZ });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  // Meio-dia do dia escolhido evita virar a data ao formatar no fuso de Brasília.
  const dayLabel = (date: string) => dayFmt.format(new Date(`${date}T15:00:00Z`));

  if (days.length === 0) {
    return <p className="rounded-sm border border-border-subtle px-3 py-2.5 text-sm text-text-muted">{t("agendaEmpty")}</p>;
  }
  return (
    // fieldset nasce com largura mínima do conteúdo: sem min-w-0 a faixa de dias estoura o painel.
    <fieldset className="min-w-0 space-y-2.5">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-medium text-text-body">
        {t("agendaLegend")}
        <span className="text-xs font-normal text-text-faded">{t("agendaTimezone")}</span>
      </legend>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("agendaDays")}>
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={d.date === day?.date}
            onClick={() => {
              setDayIndex(i);
              onChange(null);
            }}
            className={cn(
              "shrink-0 rounded-sm border px-2.5 py-1.5 font-display text-sm uppercase tracking-wide",
              d.date === day?.date ? "border-gold/70 bg-gold/10 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
            )}
          >
            {dayLabel(d.date)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label={t("agendaTimes")}>
        {day?.slots.map((slot) => (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={slot === value}
            onClick={() => onChange(slot)}
            className={cn(
              "rounded-sm border py-2 text-sm tabular-nums",
              slot === value ? "border-success/70 bg-success/10 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
            )}
          >
            {timeFmt.format(new Date(slot))}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
      {error && <span className="block text-xs text-error">{error}</span>}
    </fieldset>
  );
}
