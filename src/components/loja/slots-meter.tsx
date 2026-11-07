// Vagas do mês à vista: um quadrado por vaga, aceso enquanto está livre. Escassez real, porque o
// tempo do Pedro fora da live é contado; o número vem dos pedidos, não de texto fixo.

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SlotInfo } from "@/lib/loja/slots";

const MAX_PIPS = 12;

export function monthNames(locale: string, reopensAt: string) {
  const reopen = new Date(reopensAt);
  // O mês corrente é o anterior à reabertura, no relógio de São Paulo.
  const current = new Date(reopen.getTime() - 24 * 60 * 60 * 1000);
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "America/Sao_Paulo" });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  return { month: month.format(current), reopen: day.format(reopen) };
}

export function SlotsMeter({ slots, className }: { slots: SlotInfo; className?: string }) {
  const t = useTranslations("loja");
  const locale = useLocale();
  const { month, reopen } = monthNames(locale, slots.reopensAt);
  const soldOut = slots.left === 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)} data-loja-vagas={slots.left}>
      {slots.capacity <= MAX_PIPS && (
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: slots.capacity }, (_, i) => (
            <span
              key={i}
              className={cn("size-2.5 rounded-[1px]", i < slots.left ? "bg-gold shadow-[0_0_6px_var(--color-gold)]" : "bg-border-strong")}
            />
          ))}
        </span>
      )}
      <span className={cn("text-xs", soldOut ? "text-text-muted" : "text-text-body")}>
        {soldOut
          ? t("slotsSoldOut", { month, reopen })
          : t("slotsLeft", { left: slots.left, total: slots.capacity, month })}
      </span>
    </div>
  );
}
