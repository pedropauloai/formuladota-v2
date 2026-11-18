// Página do pedido: os horários marcados (ou a vaga na live), o arquivo para a agenda do celular,
// o atalho para o Discord onde a sessão acontece e, com o pedido pago, marcar a próxima sessão ou
// remarcar. Também mostra a entrega dos produtos sem horário (análise gravada).

import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, CalendarPlus, ExternalLink, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { canReschedule } from "@/lib/loja/agenda";
import { getBusyIntervals, getWeeklyWindows } from "@/lib/loja/agenda-server";
import type { PublicOrder } from "@/lib/loja/public-order";
import { BrandGlyph } from "./brand-glyph";
import { OrderAgendaActions } from "./order-agenda-actions";

const TZ = "America/Sao_Paulo";
const STATUS_STYLE: Record<string, string> = {
  reservado: "border-warning/60 text-warning",
  confirmado: "border-success/60 text-success",
  concluido: "border-border-strong text-text-muted",
};
const linkCls =
  "inline-flex items-center gap-2 rounded-sm border border-border-strong px-3 py-2 font-display text-sm uppercase tracking-wide text-text-display transition-colors hover:border-text-muted";

export async function OrderSchedule({ order }: { order: PublicOrder }) {
  const [t, locale] = await Promise.all([getTranslations("loja"), getLocale()]);
  const now = new Date();
  const paid = order.status === "pago";
  const agendaBookings = order.bookings.filter((b) => b.kind === "agenda");
  const missing = paid && order.bookingMode === "agenda" ? Math.max(0, order.sessionsPerOrder - agendaBookings.length) : 0;
  const reschedulable = paid ? agendaBookings.filter((b) => canReschedule(b.startsAt, b.status, now)) : [];
  const needsAgenda = missing > 0 || reschedulable.length > 0;
  if (order.bookings.length === 0 && !needsAgenda) return null;
  const [windows, busy] = needsAgenda ? await Promise.all([getWeeklyWindows(), getBusyIntervals(now)]) : [[], []];
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const hasConfirmed = order.bookings.some((b) => b.status === "confirmado" || b.status === "concluido");
  const statusText: Record<string, string> = { reservado: t("bookingReserved"), confirmado: t("bookingConfirmed"), concluido: t("bookingDone") };

  return (
    <section className="space-y-4 rounded-md border border-border-strong bg-bg-base p-5" aria-labelledby="pedido-horario">
      <h2 id="pedido-horario" className="font-display text-xl uppercase tracking-wide text-text-display">
        {t("orderScheduleTitle")}
        <span className="ml-2 align-middle font-body text-xs normal-case tracking-normal text-text-faded">{t("agendaTimezone")}</span>
      </h2>
      {order.bookings.length > 0 && (
        <ul className="space-y-2">
          {order.bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-text-display">
                {b.kind === "live" ? <Radio size={15} aria-hidden="true" className="text-brand-primary" /> : <CalendarClock size={15} aria-hidden="true" className="text-gold" />}
                <span className="first-letter:uppercase">
                  {b.kind === "live"
                    ? `${t("bookingLive", { when: day.format(new Date(b.startsAt)) })} · ${t("liveSeatsLeft", { count: b.seats })}`
                    : `${day.format(new Date(b.startsAt))} ${t("until")} ${time.format(new Date(b.endsAt))}`}
                </span>
              </span>
              <span className={cn("rounded-sm border px-2 py-0.5 text-xs", STATUS_STYLE[b.status] ?? STATUS_STYLE.concluido)}>{statusText[b.status] ?? b.status}</span>
            </li>
          ))}
        </ul>
      )}
      {(hasConfirmed || (paid && order.bookingMode === "agenda")) && (
        <div className="flex flex-wrap gap-2">
          {hasConfirmed && (
            <a href={`/loja/pedido/${order.id}/agenda`} className={linkCls}>
              <CalendarPlus size={15} aria-hidden="true" /> {t("addToCalendar")}
            </a>
          )}
          {paid && order.bookingMode === "agenda" && (
            <a href="/dc" target="_blank" rel="noopener noreferrer" className={linkCls}>
              <BrandGlyph brand="discord" size={16} /> {t("joinDiscord")}
            </a>
          )}
        </div>
      )}
      {needsAgenda && (
        <OrderAgendaActions
          orderId={order.id}
          windows={windows}
          busy={busy}
          durationMinutes={order.sessionMinutes}
          next={missing > 0 ? { number: agendaBookings.length + 1, total: order.sessionsPerOrder } : null}
          reschedulable={reschedulable.map((b) => ({ id: b.id, startsAt: b.startsAt, endsAt: b.endsAt }))}
        />
      )}
    </section>
  );
}

export async function OrderDelivery({ order }: { order: PublicOrder }) {
  if (order.status !== "pago" || order.bookingMode !== "nenhum") return null;
  const t = await getTranslations("loja");
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-5" aria-labelledby="pedido-entrega">
      <h2 id="pedido-entrega" className="font-display text-xl uppercase tracking-wide text-text-display">{t("deliveryTitle")}</h2>
      {order.delivery ? (
        <>
          {order.delivery.note && <p className="whitespace-pre-line text-sm text-text-body">{order.delivery.note}</p>}
          {order.delivery.url && (
            <a href={order.delivery.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <ExternalLink size={15} aria-hidden="true" /> {t("deliveryOpen")}
            </a>
          )}
        </>
      ) : (
        <p className="text-sm text-text-muted">{t("deliveryPending")}</p>
      )}
    </section>
  );
}
