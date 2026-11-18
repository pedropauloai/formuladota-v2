import { describe, it, expect } from "vitest";
import { availableSlots, buildIcs, canReschedule, isSlotAvailable, seatsLeft, type WeeklyWindow } from "./agenda";

// Quarta, 18/11/2026, 12:00 em Brasília (15:00 UTC).
const NOW = new Date("2026-11-18T15:00:00Z");
const EVERY_DAY_19_22: WeeklyWindow[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, start: "19:00", end: "22:00" }));

describe("availableSlots", () => {
  it("respeita a antecedência de 12 horas: hoje às 19h (7 h depois) fica de fora", () => {
    const days = availableSlots({ windows: EVERY_DAY_19_22, busy: [], now: NOW, durationMinutes: 90 });
    expect(days[0]?.date).toBe("2026-11-19");
  });

  it("monta os horários de 30 em 30 minutos que cabem na janela", () => {
    const [first] = availableSlots({ windows: EVERY_DAY_19_22, busy: [], now: NOW, durationMinutes: 90 });
    // 19:00, 19:30, 20:00 e 20:30 em Brasília terminam até 22:00.
    expect(first?.slots).toEqual([
      "2026-11-19T22:00:00.000Z",
      "2026-11-19T22:30:00.000Z",
      "2026-11-19T23:00:00.000Z",
      "2026-11-19T23:30:00.000Z",
    ]);
  });

  it("tira o horário que bate com agendamento, live ou bloqueio", () => {
    const busy = [{ start: Date.parse("2026-11-19T22:30:00Z"), end: Date.parse("2026-11-19T23:30:00Z") }];
    const [first] = availableSlots({ windows: EVERY_DAY_19_22, busy, now: NOW, durationMinutes: 60 });
    expect(first?.slots).toEqual(["2026-11-19T23:30:00.000Z", "2026-11-20T00:00:00.000Z"]);
  });

  it("só oferece o dia da semana que tem janela", () => {
    const onlySaturday: WeeklyWindow[] = [{ weekday: 6, start: "14:00", end: "16:00" }];
    const days = availableSlots({ windows: onlySaturday, busy: [], now: NOW, durationMinutes: 60 });
    expect(days.every((d) => d.weekday === 6)).toBe(true);
    expect(days[0]?.date).toBe("2026-11-21");
    expect(days[0]?.slots[0]).toBe("2026-11-21T17:00:00.000Z");
  });

  it("vai até 21 dias à frente e não além", () => {
    const days = availableSlots({ windows: EVERY_DAY_19_22, busy: [], now: NOW, durationMinutes: 90 });
    expect(days.at(-1)?.date).toBe("2026-12-09");
  });

  it("sessão maior que a janela não tem horário", () => {
    expect(availableSlots({ windows: EVERY_DAY_19_22, busy: [], now: NOW, durationMinutes: 240 })).toEqual([]);
  });

  it("isSlotAvailable recusa horário inventado ou já ocupado", () => {
    const query = { windows: EVERY_DAY_19_22, busy: [], now: NOW, durationMinutes: 90 };
    expect(isSlotAvailable(query, "2026-11-19T22:00:00.000Z")).toBe(true);
    expect(isSlotAvailable(query, "2026-11-19T22:15:00.000Z")).toBe(false);
    expect(isSlotAvailable({ ...query, busy: [{ start: Date.parse("2026-11-19T22:00:00Z"), end: Date.parse("2026-11-19T22:30:00Z") }] }, "2026-11-19T22:00:00.000Z")).toBe(false);
  });
});

describe("seatsLeft", () => {
  it("confirmada e reserva viva ocupam; reserva vencida e cancelada devolvem a vaga", () => {
    const bookings = [
      { seats: 2, status: "confirmado", holdUntil: null },
      { seats: 1, status: "reservado", holdUntil: "2026-11-18T15:10:00Z" },
      { seats: 1, status: "reservado", holdUntil: "2026-11-18T14:50:00Z" },
      { seats: 3, status: "cancelado", holdUntil: null },
    ];
    expect(seatsLeft(4, bookings, NOW)).toBe(1);
    expect(seatsLeft(2, bookings, NOW)).toBe(0);
  });
});

describe("canReschedule", () => {
  it("só com 24 horas de antecedência e horário confirmado", () => {
    expect(canReschedule("2026-11-19T16:00:00Z", "confirmado", NOW)).toBe(true);
    expect(canReschedule("2026-11-19T14:00:00Z", "confirmado", NOW)).toBe(false);
    expect(canReschedule("2026-11-25T16:00:00Z", "reservado", NOW)).toBe(false);
  });
});

describe("buildIcs", () => {
  it("monta o evento com início, fim e texto escapado", () => {
    const ics = buildIcs(
      [{ uid: "abc", start: "2026-11-19T22:00:00.000Z", end: "2026-11-19T23:30:00.000Z", title: "Mentoria 1:1, FORMULADOTA", description: "Linha 1\nLinha 2", url: "https://www.formuladota.com.br/loja/pedido/abc" }],
      NOW
    );
    expect(ics).toContain("DTSTART:20261119T220000Z");
    expect(ics).toContain("DTEND:20261119T233000Z");
    expect(ics).toContain("SUMMARY:Mentoria 1:1\\, FORMULADOTA");
    expect(ics).toContain("DESCRIPTION:Linha 1\\nLinha 2");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
