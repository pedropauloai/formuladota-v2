import { describe, expect, it } from "vitest";
import { canaisDeTeste, SALA_FLAG, salaFlagKey } from "./flag-chave";

describe("salaFlagKey", () => {
  it("produção lê sempre a sala_voz, mesmo com a variável do teste", () => {
    expect(salaFlagKey({ NODE_ENV: "production", SALA_FLAG_KEY: "sala_voz_e2e" })).toBe(SALA_FLAG);
  });

  it("sem NODE_ENV (como no Worker) também lê a sala_voz", () => {
    expect(salaFlagKey({ SALA_FLAG_KEY: "sala_voz_e2e" })).toBe(SALA_FLAG);
  });

  it("o servidor local sem a variável lê a sala_voz", () => {
    expect(salaFlagKey({ NODE_ENV: "development" })).toBe(SALA_FLAG);
  });

  it("o servidor local do e2e lê a linha do teste", () => {
    expect(salaFlagKey({ NODE_ENV: "development", SALA_FLAG_KEY: "sala_voz_e2e" })).toBe("sala_voz_e2e");
  });

  it("a variável não aponta outra flag do site nem nome fora do padrão", () => {
    expect(salaFlagKey({ NODE_ENV: "development", SALA_FLAG_KEY: "loja" })).toBe(SALA_FLAG);
    expect(salaFlagKey({ NODE_ENV: "development", SALA_FLAG_KEY: "sala_voz_E2E; drop" })).toBe(SALA_FLAG);
  });
});

describe("canaisDeTeste", () => {
  it("só o servidor local do e2e lista os canais de teste; produção nunca", () => {
    expect(canaisDeTeste({ NODE_ENV: "development", SALA_FLAG_KEY: "sala_voz_e2e" })).toBe(true);
    expect(canaisDeTeste({ NODE_ENV: "production", SALA_FLAG_KEY: "sala_voz_e2e" })).toBe(false);
    expect(canaisDeTeste({ NODE_ENV: "development" })).toBe(false);
    expect(canaisDeTeste({})).toBe(false);
  });
});
