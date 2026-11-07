import { describe, it, expect } from "vitest";
import { buildCheckoutSchema, normalizeWhatsapp, detailsFrom, fieldErrors } from "./checkout-schema";

const base = {
  variantId: "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e",
  method: "pix",
  name: "  Ana Souza ",
  email: "ANA@Exemplo.com ",
  whatsapp: "(31) 99876-5432",
  aceite: true,
};

describe("normalizeWhatsapp", () => {
  it("põe o DDI 55 em celular e fixo com DDD", () => {
    expect(normalizeWhatsapp("(31) 99876-5432")).toBe("5531998765432");
    expect(normalizeWhatsapp("31 3333-4444")).toBe("553133334444");
    expect(normalizeWhatsapp("+55 31 99876-5432")).toBe("5531998765432");
  });

  it("recusa número sem DDD ou curto", () => {
    expect(normalizeWhatsapp("99876-5432")).toBeNull();
    expect(normalizeWhatsapp("123")).toBeNull();
    expect(normalizeWhatsapp("01 99876-5432")).toBeNull();
  });
});

describe("buildCheckoutSchema", () => {
  it("normaliza nome, e-mail e WhatsApp", () => {
    const parsed = buildCheckoutSchema([]).parse(base);
    expect(parsed).toMatchObject({ name: "Ana Souza", email: "ana@exemplo.com", whatsapp: "5531998765432" });
  });

  it("exige o aceite da entrega", () => {
    const result = buildCheckoutSchema([]).safeParse({ ...base, aceite: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).aceite).toBeDefined();
  });

  it("pede os campos do produto e recusa MMR alvo menor que o atual", () => {
    const schema = buildCheckoutSchema(["dota_id", "mmr_atual", "mmr_alvo"]);
    const missing = schema.safeParse(base);
    expect(missing.success).toBe(false);
    const inverted = schema.safeParse({ ...base, dota_id: "123456789", mmr_atual: "4000", mmr_alvo: "3500" });
    expect(inverted.success).toBe(false);
    if (!inverted.success) expect(fieldErrors(inverted.error).mmr_alvo).toMatch(/maior/);
    const ok = schema.parse({ ...base, dota_id: "123456789", mmr_atual: "3500", mmr_alvo: "4000" });
    expect(ok).toMatchObject({ mmr_atual: 3500, mmr_alvo: 4000 });
  });

  it("recusa meio de pagamento desconhecido", () => {
    expect(buildCheckoutSchema([]).safeParse({ ...base, method: "boleto" }).success).toBe(false);
  });

  it("aceita o ID da partida da Valve e recusa texto ou link", () => {
    const schema = buildCheckoutSchema(["match_id"]);
    expect(schema.parse({ ...base, match_id: " 9072459858 " })).toMatchObject({ match_id: "9072459858" });
    expect(schema.safeParse({ ...base, match_id: "https://www.opendota.com/matches/9072459858" }).success).toBe(false);
    expect(schema.safeParse({ ...base, match_id: "123" }).success).toBe(false);
  });

  it("quantidade é opcional, inteira e positiva", () => {
    const schema = buildCheckoutSchema([]);
    expect(schema.parse(base).quantity).toBeUndefined();
    expect(schema.parse({ ...base, quantity: "3" }).quantity).toBe(3);
    expect(schema.safeParse({ ...base, quantity: "0" }).success).toBe(false);
    expect(schema.safeParse({ ...base, quantity: "1.5" }).success).toBe(false);
  });

  it("ignora campo que o produto não pede", () => {
    const parsed = buildCheckoutSchema([]).parse({ ...base, senha: "nunca" }) as Record<string, unknown>;
    expect(parsed.senha).toBeUndefined();
  });
});

describe("detailsFrom", () => {
  it("guarda só os campos do produto e descarta vazios", () => {
    expect(detailsFrom({ discord: "ana#1", observacoes: "", mmr_atual: 3000, name: "Ana" }, ["discord", "observacoes", "mmr_atual"])).toEqual({
      discord: "ana#1",
      mmr_atual: 3000,
    });
  });
});
