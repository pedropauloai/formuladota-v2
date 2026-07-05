import { describe, it, expect } from "vitest";
import {
  mpEnabledFromRaw,
  resolveProviderFromFlag,
  resolvePaymentProvider,
} from "@/lib/subscriptions/payment-provider";

describe("mpEnabledFromRaw — parsing da flag PAYMENTS_MP_ENABLED", () => {
  it("liga por padrão quando ausente/undefined", () => {
    expect(mpEnabledFromRaw(undefined)).toBe(true);
  });
  it('liga com "true"', () => {
    expect(mpEnabledFromRaw("true")).toBe(true);
  });
  it('DESLIGA apenas com "false"', () => {
    expect(mpEnabledFromRaw("false")).toBe(false);
  });
  it("qualquer outro valor mantém ligado (fail-safe: não desligar por engano)", () => {
    expect(mpEnabledFromRaw("")).toBe(true);
    expect(mpEnabledFromRaw("0")).toBe(true);
    expect(mpEnabledFromRaw("off")).toBe(true);
  });
});

describe("resolveProviderFromFlag — decisão pura região × flag", () => {
  it("BR + flag LIGADA → mp", () => {
    expect(resolveProviderFromFlag("BR", true)).toBe("mp");
  });
  it("BR + flag DESLIGADA → stripe (gating: roteia o BR pro Stripe)", () => {
    expect(resolveProviderFromFlag("BR", false)).toBe("stripe");
  });
  it("LATAM sempre stripe (independe da flag)", () => {
    expect(resolveProviderFromFlag("LATAM", true)).toBe("stripe");
    expect(resolveProviderFromFlag("LATAM", false)).toBe("stripe");
  });
  it("EU sempre stripe (independe da flag)", () => {
    expect(resolveProviderFromFlag("EU", true)).toBe("stripe");
    expect(resolveProviderFromFlag("EU", false)).toBe("stripe");
  });
});

describe("resolvePaymentProvider — integração (env default = flag ausente = ligada)", () => {
  it("BR → mp por padrão", () => {
    expect(resolvePaymentProvider("BR")).toBe("mp");
  });
  it("LATAM/EU → stripe", () => {
    expect(resolvePaymentProvider("LATAM")).toBe("stripe");
    expect(resolvePaymentProvider("EU")).toBe("stripe");
  });
});
