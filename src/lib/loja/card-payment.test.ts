import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco, Mercado Pago e aplicação do pagamento simulados: o teste confere o que sai para a API e
// o que volta para a tela, sem rede.
const h = vi.hoisted(() => {
  const order = {
    id: "11111111-2222-4333-8444-555555555555",
    status: "pendente",
    payment_method: "cartao",
    amount_cents: 2500,
    buyer_name: "Comprador de Teste",
    buyer_email: "comprador@exemplo.com",
    product_title: "Vaga na party da live",
    variant_label: "Vaga do dia",
    user_id: "dono" as string | null,
  };
  const state = { order: { ...order }, applied: [] as unknown[], requests: [] as Array<{ headers: Record<string, string>; body: Record<string, unknown> }> };
  const client = {
    from: () => {
      const builder = {
        select: () => builder,
        update: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: state.order, error: null }),
        then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
      };
      return builder;
    },
  };
  return { order, state, client };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => h.client }));
vi.mock("@/lib/env", () => ({ requireServerEnv: () => "TEST-token", publicEnv: { NEXT_PUBLIC_SITE_URL: "https://www.formuladota.com.br" } }));
vi.mock("./order-payments", () => ({ applyStorePayment: async (_id: string, snapshot: unknown) => void h.state.applied.push(snapshot) }));
vi.mock("./mercadopago", () => ({ toSnapshot: (p: { id: number; status: string }) => ({ id: String(p.id), status: p.status }) }));

import { buildCardPaymentBody, cardIdempotencyKey, cardReason, payStoreOrderWithCard, type CardForm } from "./card-payment";

const form: CardForm = {
  token: "token-do-brick-123456",
  paymentMethodId: "master",
  issuerId: "24",
  installments: 1,
  identificationType: "CPF",
  identificationNumber: "12345678909",
  deviceId: "aparelho-1",
};

function mockApi(response: Record<string, unknown>, status = 201) {
  vi.stubGlobal("fetch", async (_url: string, init: { headers: Record<string, string>; body: string }) => {
    h.state.requests.push({ headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(response), { status });
  });
}

beforeEach(() => {
  h.state.order = { ...h.order };
  h.state.applied = [];
  h.state.requests = [];
});

describe("corpo do pagamento com cartão", () => {
  it("valor, comprador e referência vêm do pedido; do navegador, só o token e as escolhas", () => {
    const body = buildCardPaymentBody(h.order, form, "https://www.formuladota.com.br/api/webhooks/mercadopago");
    expect(body).toMatchObject({
      transaction_amount: 25,
      token: form.token,
      installments: 1,
      payment_method_id: "master",
      issuer_id: "24",
      payer: { email: "comprador@exemplo.com", first_name: "Comprador", last_name: "de Teste", identification: { type: "CPF", number: "12345678909" } },
      external_reference: `loja-${h.order.id}`,
      statement_descriptor: "FORMULADOTA",
      three_d_secure_mode: "optional",
    });
  });

  it("a mesma tentativa repete a mesma chave, e a chave não carrega o token", () => {
    const key = cardIdempotencyKey(h.order.id, form.token);
    expect(cardIdempotencyKey(h.order.id, form.token)).toBe(key);
    expect(cardIdempotencyKey(h.order.id, "outro-token-99999")).not.toBe(key);
    expect(key).not.toContain(form.token);
  });

  it("motivo da recusa vira o que a pessoa pode fazer", () => {
    expect(cardReason("cc_rejected_insufficient_amount")).toBe("saldo");
    expect(cardReason("cc_rejected_bad_filled_security_code")).toBe("dados");
    expect(cardReason("cc_rejected_call_for_authorize")).toBe("autorizar");
    expect(cardReason("cc_rejected_high_risk")).toBe("recusado");
    expect(cardReason(null)).toBe("recusado");
  });
});

describe("cobrança do pedido", () => {
  it("aprovado: manda o token com a chave de repetição e o aparelho, e aplica o pagamento ao pedido", async () => {
    mockApi({ id: 987, status: "approved", status_detail: "accredited", transaction_amount: 25 });
    const out = await payStoreOrderWithCard(h.order.id, form, "dono");
    expect(out).toEqual({ ok: true, paymentId: "987", status: "approved", statusDetail: "accredited", challenge: null });
    expect(h.state.requests).toHaveLength(1);
    expect(h.state.requests[0]!.headers["X-Idempotency-Key"]).toBe(cardIdempotencyKey(h.order.id, form.token));
    expect(h.state.requests[0]!.headers["X-meli-session-id"]).toBe("aparelho-1");
    expect(h.state.requests[0]!.body.transaction_amount).toBe(25);
    expect(h.state.applied).toEqual([{ id: "987", status: "approved" }]);
  });

  it("banco pede confirmação: devolve o desafio para a tela", async () => {
    mockApi({ id: 988, status: "pending", status_detail: "pending_challenge", three_ds_info: { external_resource_url: "https://acs.exemplo.com/desafio", creq: "abc" } });
    const out = await payStoreOrderWithCard(h.order.id, form, "dono");
    expect(out).toMatchObject({ ok: true, status: "pending", challenge: { externalResourceUrl: "https://acs.exemplo.com/desafio", creq: "abc" } });
  });

  it("pedido de outra conta não é cobrado", async () => {
    mockApi({ id: 1, status: "approved" });
    expect(await payStoreOrderWithCard(h.order.id, form, "outra-pessoa")).toEqual({ ok: false, error: "dono" });
    expect(h.state.requests).toHaveLength(0);
  });

  it("pedido já pago ou de Pix não é cobrado de novo", async () => {
    mockApi({ id: 1, status: "approved" });
    h.state.order = { ...h.order, status: "pago" };
    expect(await payStoreOrderWithCard(h.order.id, form, "dono")).toEqual({ ok: false, error: "pedido" });
    h.state.order = { ...h.order, payment_method: "pix" };
    expect(await payStoreOrderWithCard(h.order.id, form, "dono")).toEqual({ ok: false, error: "pedido" });
    expect(h.state.requests).toHaveLength(0);
  });

  it("recusa da API (dado inválido) volta como recusado, sem aplicar nada ao pedido", async () => {
    mockApi({ message: "invalid parameter" }, 400);
    expect(await payStoreOrderWithCard(h.order.id, form, "dono")).toEqual({ ok: false, error: "recusado" });
    expect(h.state.applied).toHaveLength(0);
  });
});
