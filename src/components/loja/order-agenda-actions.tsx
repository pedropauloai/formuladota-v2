"use client";

// Na página do pedido pago: marcar a próxima sessão (acompanhamento, ou horário perdido) e remarcar
// um horário confirmado com 24 horas de antecedência. O servidor confere tudo de novo.

import { panel } from "@/components/v2";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { agendarSessao, remarcarSessao } from "@/app/loja/actions";
import type { Interval, WeeklyWindow } from "@/lib/loja/agenda";
import { SlotPicker } from "./slot-picker";

export interface ReschedulableBooking {
  id: string;
  startsAt: string;
  endsAt: string;
}

interface Props {
  orderId: string;
  windows: WeeklyWindow[];
  busy: Interval[];
  durationMinutes: number;
  /** Próxima sessão a marcar (1-based) e o total do pedido; null quando não falta nenhuma. */
  next: { number: number; total: number } | null;
  reschedulable: ReschedulableBooking[];
}

function useAgendaSubmit() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error ?? null);
    });
  return { error, pending, run };
}

function ScheduleNext({ orderId, windows, busy, durationMinutes, next }: Omit<Props, "reschedulable"> & { next: { number: number; total: number } }) {
  const t = useTranslations("loja");
  const [slot, setSlot] = useState<string | null>(null);
  const { error, pending, run } = useAgendaSubmit();
  return (
    <section className={cn(panel("gold"), "space-y-3 p-5")}>
      <h2 className="font-display-condensed text-[1.8rem] uppercase leading-none text-text-display">{t("scheduleNextTitle", { n: next.number, total: next.total })}</h2>
      <SlotPicker windows={windows} busy={busy} durationMinutes={durationMinutes} value={slot} onChange={setSlot} error={error ?? undefined} name="proxima_sessao" />
      <Button type="button" variant="primary" disabled={!slot} loading={pending} onClick={() => slot && run(() => agendarSessao(orderId, slot))} className="w-full">
        {t("scheduleConfirm")}
      </Button>
    </section>
  );
}

function Reschedule({ orderId, windows, busy, booking }: { orderId: string; windows: WeeklyWindow[]; busy: Interval[]; booking: ReschedulableBooking }) {
  const t = useTranslations("loja");
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const { error, pending, run } = useAgendaSubmit();
  const start = Date.parse(booking.startsAt);
  const end = Date.parse(booking.endsAt);
  // O horário atual some da ocupação: dá para trocar por um vizinho que encosta nele.
  const freeBusy = busy.filter((b) => !(b.start === start && b.end === end));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-text-body underline decoration-border-strong underline-offset-2 hover:text-text-display">
        {t("reschedule")}
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-sm border border-border-strong p-4">
      <p className="text-xs text-text-faded">{t("rescheduleRule")}</p>
      <SlotPicker windows={windows} busy={freeBusy} durationMinutes={Math.round((end - start) / 60_000)} value={slot} onChange={setSlot} error={error ?? undefined} name={`remarcar_${booking.id}`} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={!slot} loading={pending} onClick={() => slot && run(() => remarcarSessao(orderId, booking.id, slot))}>
          {t("rescheduleConfirm")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("close")}
        </Button>
      </div>
    </div>
  );
}

export function OrderAgendaActions(props: Props) {
  return (
    <div className="space-y-4">
      {props.reschedulable.map((booking) => (
        <Reschedule key={booking.id} orderId={props.orderId} windows={props.windows} busy={props.busy} booking={booking} />
      ))}
      {props.next && <ScheduleNext {...props} next={props.next} />}
    </div>
  );
}
