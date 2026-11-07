import { describe, it, expect } from "vitest";
import { buildDiscordSalePayload, buildSaleEmail, whatsappLink, type SaleInfo } from "./notify-message";
import { formatBRL } from "./money";
import { toStoreReference, parseStoreReference } from "./refs";

const sale: SaleInfo = {
  orderId: "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e",
  productTitle: "Mentoria 1:1",
  variantLabel: "1 sessão",
  amountCents: 14990,
  method: "pix",
  status: "pago",
  buyerName: "Ana Souza",
  buyerEmail: "ana@exemplo.com",
  buyerWhatsapp: "5531998765432",
  details: { discord: "ana_dota", mmr_atual: 3200, observacoes: "jogo de *mid* @everyone" },
  origin: { utm_source: "instagram", utm_medium: "bio" },
  isTest: false,
  adminUrl: "https://www.formuladota.com.br/admin/loja",
};

describe("buildDiscordSalePayload", () => {
  it("menciona só o Pedro e não deixa o comprador mencionar ninguém", () => {
    const payload = buildDiscordSalePayload(sale, "123456789012345678");
    expect(payload.content.startsWith("<@123456789012345678> nova venda: Mentoria 1:1 (1 sessão), R$ 149,90")).toBe(true);
    expect(payload.allowed_mentions).toEqual({ parse: [], users: ["123456789012345678"] });
  });

  it("sem ID do Pedro, não menciona ninguém", () => {
    const payload = buildDiscordSalePayload(sale);
    expect(payload.content.startsWith("nova venda")).toBe(true);
    expect(payload.allowed_mentions.users).toEqual([]);
  });

  it("marca a venda de teste e o pagamento para conferir", () => {
    expect(buildDiscordSalePayload({ ...sale, isTest: true }).content.startsWith("[TESTE] nova venda")).toBe(true);
    expect(buildDiscordSalePayload({ ...sale, status: "em_revisao" }).content).toContain("pagamento para conferir");
  });

  it("mostra origem, detalhes e escapa a formatação do texto do comprador", () => {
    const fields = buildDiscordSalePayload(sale).embeds[0]?.fields ?? [];
    const byName = Object.fromEntries(fields.map((f) => [f.name, f.value]));
    expect(byName.Origem).toBe("instagram (bio)");
    expect(byName["MMR atual"]).toBe("3200");
    expect(byName["Observações"]).toBe("jogo de \\*mid\\* @everyone");
    expect(byName.WhatsApp).toContain("https://wa.me/5531998765432?text=");
  });
});

describe("whatsappLink", () => {
  it("abre a conversa com o primeiro nome e o produto", () => {
    const link = decodeURIComponent(whatsappLink(sale));
    expect(link).toContain("Oi, Ana!");
    expect(link).toContain("Mentoria 1:1");
  });
});

describe("buildSaleEmail", () => {
  it("assunto igual à manchete e texto com o contato", () => {
    const email = buildSaleEmail(sale);
    expect(email.subject).toBe("nova venda: Mentoria 1:1 (1 sessão), R$ 149,90");
    expect(email.text).toContain("WhatsApp: https://wa.me/5531998765432");
    expect(email.text).toContain("Origem: instagram (bio)");
  });
});

describe("formatBRL e referência externa", () => {
  it("formata centavos em reais com espaço comum", () => {
    expect(formatBRL(1000)).toBe("R$ 10,00");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
  });

  it("ida e volta da referência e recusa a das fichas", () => {
    const ref = toStoreReference(sale.orderId);
    expect(ref).toBe(`loja-${sale.orderId}`);
    expect(parseStoreReference(ref)).toBe(sale.orderId);
    expect(parseStoreReference(sale.orderId)).toBeNull();
    expect(parseStoreReference("loja-nao-e-uuid")).toBeNull();
    expect(parseStoreReference(null)).toBeNull();
  });
});
