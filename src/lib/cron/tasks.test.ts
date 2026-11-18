import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Row = { task: string; failing_since: string | null; last_error: string | null; alerted: boolean };
  const store = new Map<string, Row>();
  const alerts: Array<{ text: string; mention: boolean }> = [];
  const client = {
    from: () => ({
      select: () => ({
        in: async (_col: string, tasks: string[]) => ({
          data: tasks.flatMap((t) => (store.has(t) ? [store.get(t)] : [])),
          error: null,
        }),
      }),
      upsert: async (row: Row) => {
        store.set(row.task, { ...row });
        return { error: null };
      },
    }),
  };
  return { store, alerts, client, sendOk: { value: true } };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => h.client }));
vi.mock("./alert", () => ({
  sendOpsAlert: async (text: string, mention: boolean) => {
    h.alerts.push({ text, mention });
    return h.sendOk.value;
  },
}));

import { cronResponse, recordOutcomes, runTask } from "./tasks";

const t0 = new Date("2026-11-18T22:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
const falha = { task: "loja-conciliacao", state: "falha" as const, error: "Mercado Pago respondeu 500" };
const ok = { task: "loja-conciliacao", state: "ok" as const };

describe("runTask", () => {
  it("exceção vira falha sem derrubar quem chamou", async () => {
    const out = await runTask("meta", async () => {
      throw new Error("Stratz HTTP 503");
    });
    expect(out).toMatchObject({ task: "meta", state: "falha", error: "Stratz HTTP 503" });
  });

  it("resultado marcado como falha e resultado neutro", async () => {
    const failed = await runTask("partidas", async () => ({ failures: ["123: 429"] }), {
      failureOf: (r) => (r.failures.length ? r.failures.join("; ") : null),
    });
    expect(failed).toMatchObject({ state: "falha", error: "123: 429" });
    const neutral = await runTask("meta", async () => "aguardando", { isNeutral: (v) => v === "aguardando" });
    expect(neutral.state).toBe("neutro");
  });
});

describe("recordOutcomes", () => {
  beforeEach(() => {
    h.store.clear();
    h.alerts.length = 0;
    h.sendOk.value = true;
  });

  it("avisa uma vez depois de 15 minutos de falha e avisa de novo quando volta", async () => {
    await recordOutcomes([falha], at(0));
    expect(h.alerts).toHaveLength(0);
    expect(h.store.get("loja-conciliacao")?.failing_since).toBe(t0.toISOString());

    await recordOutcomes([falha], at(16));
    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0]?.mention).toBe(true);
    expect(h.alerts[0]?.text).toContain("conciliação da loja com o Mercado Pago");
    expect(h.store.get("loja-conciliacao")?.alerted).toBe(true);

    await recordOutcomes([falha], at(17));
    expect(h.alerts).toHaveLength(1);

    await recordOutcomes([ok], at(20));
    expect(h.alerts).toHaveLength(2);
    expect(h.alerts[1]).toMatchObject({ mention: false });
    expect(h.alerts[1]?.text).toContain("voltou a funcionar");
    expect(h.store.get("loja-conciliacao")).toMatchObject({ failing_since: null, alerted: false });
  });

  it("aviso que o Discord recusou sai de novo na rodada seguinte", async () => {
    await recordOutcomes([falha], at(0));
    h.sendOk.value = false;
    await recordOutcomes([falha], at(16));
    expect(h.store.get("loja-conciliacao")?.alerted).toBe(false);
    h.sendOk.value = true;
    await recordOutcomes([falha], at(17));
    expect(h.alerts).toHaveLength(2);
    expect(h.store.get("loja-conciliacao")?.alerted).toBe(true);
  });

  it("tarefa saudável não grava nada", async () => {
    await recordOutcomes([ok, { task: "meta", state: "neutro" }], at(0));
    expect(h.store.size).toBe(0);
    expect(h.alerts).toHaveLength(0);
  });
});

describe("cronResponse", () => {
  it("responde 500 e lista a tarefa quando alguma falhou", async () => {
    const res = cronResponse([falha, { task: "meta", state: "ok", result: "fresco" }]);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ ok: false, failed: ["loja-conciliacao"], tasks: { meta: "fresco" } });
  });

  it("responde 200 quando tudo passou", () => {
    expect(cronResponse([ok]).status).toBe(200);
  });
});
