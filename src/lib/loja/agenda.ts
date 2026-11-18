// Agenda da loja: que horários a pessoa pode escolher, quantas vagas sobram numa live e o arquivo
// de calendário (.ics). Regra pura e sem servidor: o formulário e o servidor usam a mesma conta.
// Horário de Brasília fixo em UTC-3 (sem horário de verão desde 2019).

export const AGENDA = {
  /** De quanto em quanto tempo começa um horário. */
  stepMinutes: 30,
  /** Antecedência mínima para marcar. */
  minNoticeHours: 12,
  /** Até quantos dias à frente dá para marcar. */
  horizonDays: 21,
  /** Prazo para pagar com o horário segurado; o Pix vence junto (30 min é o mínimo do Mercado Pago). */
  paymentMinutes: 30,
  /** A reserva dura um pouco mais que o Pix, para o pagamento do último segundo não perder o horário. */
  holdMinutes: 35,
  /** Antecedência mínima para o comprador remarcar sozinho. */
  rescheduleMinHours: 24,
} as const;

const OFFSET_MS = 3 * 60 * 60 * 1000;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface WeeklyWindow {
  /** 0 = domingo. */
  weekday: number;
  /** "19:00" (horário de Brasília). */
  start: string;
  end: string;
}

export interface Interval {
  start: number;
  end: number;
}

export interface DaySlots {
  /** "2026-11-20", dia no horário de Brasília. */
  date: string;
  weekday: number;
  /** Inícios em ISO (UTC). */
  slots: string[];
}

function minutesOf(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Meia-noite (Brasília) do dia de `ms`, em UTC. */
function localMidnight(ms: number): number {
  const local = ms - OFFSET_MS;
  return local - (((local % DAY) + DAY) % DAY) + OFFSET_MS;
}

function localDateLabel(midnightUtc: number): string {
  return new Date(midnightUtc - OFFSET_MS).toISOString().slice(0, 10);
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export interface SlotQuery {
  windows: readonly WeeklyWindow[];
  busy: readonly Interval[];
  now: Date;
  durationMinutes: number;
}

/** Horários livres dia a dia, do primeiro dia com antecedência suficiente até o fim da janela. */
export function availableSlots({ windows, busy, now, durationMinutes }: SlotQuery): DaySlots[] {
  const earliest = now.getTime() + AGENDA.minNoticeHours * 60 * MINUTE;
  const duration = durationMinutes * MINUTE;
  const firstDay = localMidnight(now.getTime());
  const days: DaySlots[] = [];
  for (let d = 0; d <= AGENDA.horizonDays; d += 1) {
    const midnight = firstDay + d * DAY;
    const weekday = new Date(midnight - OFFSET_MS).getUTCDay();
    const slots: string[] = [];
    for (const w of windows.filter((x) => x.weekday === weekday)) {
      const windowEnd = midnight + minutesOf(w.end) * MINUTE;
      for (let t = midnight + minutesOf(w.start) * MINUTE; t + duration <= windowEnd; t += AGENDA.stepMinutes * MINUTE) {
        const slot = { start: t, end: t + duration };
        if (t >= earliest && !busy.some((b) => overlaps(slot, b))) slots.push(new Date(t).toISOString());
      }
    }
    if (slots.length > 0) days.push({ date: localDateLabel(midnight), weekday, slots: [...new Set(slots)].sort() });
  }
  return days;
}

/** O horário escolhido ainda está livre? O servidor confere com a agenda fresca antes de reservar. */
export function isSlotAvailable(query: SlotQuery, startIso: string): boolean {
  return availableSlots(query).some((day) => day.slots.includes(startIso));
}

export interface SeatBooking {
  seats: number;
  status: string;
  holdUntil: string | null;
}

/** Vagas que sobram numa live: confirmadas e reservas vivas ocupam. */
export function seatsLeft(capacity: number, bookings: readonly SeatBooking[], now: Date): number {
  const used = bookings.reduce((sum, b) => {
    const holds = b.status === "confirmado" || (b.status === "reservado" && (!b.holdUntil || new Date(b.holdUntil) >= now));
    return holds ? sum + b.seats : sum;
  }, 0);
  return Math.max(0, capacity - used);
}

/** Pode remarcar sozinho? Só horário confirmado e com a antecedência mínima. */
export function canReschedule(startIso: string, status: string, now: Date): boolean {
  return status === "confirmado" && new Date(startIso).getTime() - now.getTime() >= AGENDA.rescheduleMinHours * 60 * MINUTE;
}

const RANGE_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const TIME_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** "qui., 20/11, 19:00 às 20:30", no horário de Brasília, para os avisos ao Pedro. */
export function bookingLine(startsAt: string, endsAt: string): string {
  return `${RANGE_FMT.format(new Date(startsAt))} às ${TIME_FMT.format(new Date(endsAt))}`;
}

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (text: string) => text.replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n");

export interface IcsEvent {
  uid: string;
  start: string;
  end: string;
  title: string;
  description: string;
  url: string;
}

/** Arquivo .ics que o celular e o Google Agenda abrem. */
export function buildIcs(events: readonly IcsEvent[], now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FORMULADOTA//Loja//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@formuladota.com.br`,
      `DTSTAMP:${icsDate(now.toISOString())}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${icsText(e.title)}`,
      `DESCRIPTION:${icsText(e.description)}`,
      `URL:${e.url}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
