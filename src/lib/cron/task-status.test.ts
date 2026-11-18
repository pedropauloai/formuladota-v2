import { describe, expect, it } from "vitest";
import { ALERT_AFTER_MS, decideTaskStatus } from "./task-status";

const now = new Date("2026-11-18T22:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

describe("decideTaskStatus", () => {
  it("tarefa saudável que segue saudável não grava nada", () => {
    expect(decideTaskStatus("meta", undefined, "ok", undefined, now)).toEqual({ write: null, alert: null });
    expect(decideTaskStatus("meta", { task: "meta", failing_since: null, alerted: false }, "ok", undefined, now)).toEqual({
      write: null,
      alert: null,
    });
  });

  it("rodada neutra não mexe no estado, nem no meio de uma falha", () => {
    const row = { task: "meta", failing_since: minutesAgo(30), alerted: false };
    expect(decideTaskStatus("meta", row, "neutro", undefined, now)).toEqual({ write: null, alert: null });
  });

  it("primeira falha marca o início e ainda não avisa", () => {
    const d = decideTaskStatus("loja-conciliacao", undefined, "falha", "Mercado Pago respondeu 500", now);
    expect(d.alert).toBeNull();
    expect(d.write).toEqual({
      task: "loja-conciliacao",
      failing_since: now.toISOString(),
      last_error: "Mercado Pago respondeu 500",
      alerted: false,
    });
  });

  it("avisa quando a falha passa de 15 minutos, uma vez só", () => {
    const since = new Date(now.getTime() - ALERT_AFTER_MS).toISOString();
    const due = decideTaskStatus("partidas", { task: "partidas", failing_since: since, alerted: false }, "falha", "429", now);
    expect(due.alert).toBe("falha");
    expect(due.write?.failing_since).toBe(since);

    const again = decideTaskStatus("partidas", { task: "partidas", failing_since: since, alerted: true }, "falha", "429", now);
    expect(again.alert).toBeNull();
    expect(again.write?.alerted).toBe(true);
  });

  it("falha curta que se resolve sozinha volta sem aviso", () => {
    const d = decideTaskStatus("meta", { task: "meta", failing_since: minutesAgo(5), alerted: false }, "ok", undefined, now);
    expect(d.alert).toBeNull();
    expect(d.write).toEqual({ task: "meta", failing_since: null, last_error: null, alerted: false });
  });

  it("tarefa que tinha avisado a falha avisa que voltou", () => {
    const d = decideTaskStatus("meta", { task: "meta", failing_since: minutesAgo(40), alerted: true }, "ok", undefined, now);
    expect(d.alert).toBe("voltou");
    expect(d.write?.failing_since).toBeNull();
  });

  it("corta erro longo para caber na linha", () => {
    const d = decideTaskStatus("meta", undefined, "falha", "x".repeat(900), now);
    expect(d.write?.last_error).toHaveLength(500);
  });
});
