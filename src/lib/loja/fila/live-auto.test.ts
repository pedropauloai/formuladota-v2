import { describe, expect, it } from "vitest";
import { IDLE_CLOSE_MS, liveIsIdle } from "./live-auto";

const now = Date.parse("2026-11-24T23:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const hours = (h: number) => h * 60 * 60 * 1000;

describe("liveIsIdle", () => {
  it("fecha 3 horas depois da última atividade, contando a mais recente", () => {
    expect(liveIsIdle([ago(hours(5)), ago(hours(3) + 60_000)], now)).toBe(true);
    expect(liveIsIdle([ago(hours(5)), ago(hours(1))], now)).toBe(false);
  });

  it("uma partida registrada há pouco segura a live aberta, mesmo com a abertura antiga", () => {
    const opened = ago(hours(6));
    const lastMatch = ago(hours(2));
    expect(liveIsIdle([opened, null, lastMatch], now)).toBe(false);
  });

  it("no limite exato ainda não fecha; sem nenhuma marca válida, não fecha", () => {
    expect(liveIsIdle([ago(IDLE_CLOSE_MS)], now)).toBe(false);
    expect(liveIsIdle([null, undefined, "não é data"], now)).toBe(false);
  });
});
