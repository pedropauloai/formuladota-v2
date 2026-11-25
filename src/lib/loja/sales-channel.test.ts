import { describe, expect, it } from "vitest";
import { mentionParts, salesChannel } from "./sales-channel";

const env = {
  SALES_DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/vendas",
  SALES_DISCORD_TEST_WEBHOOK_URL: "https://discord.com/api/webhooks/2/teste",
  PEDRO_DISCORD_USER_ID: "123456789012345678",
};

describe("salesChannel", () => {
  it("venda de verdade vai ao canal de vendas e marca o PPA", () => {
    expect(salesChannel(false, env)).toEqual({ url: env.SALES_DISCORD_WEBHOOK_URL, mentionId: env.PEDRO_DISCORD_USER_ID });
  });

  it("teste vai ao canal de teste e não marca ninguém", () => {
    const channel = salesChannel(true, env);
    expect(channel).toEqual({ url: env.SALES_DISCORD_TEST_WEBHOOK_URL, mentionId: null });
    expect(mentionParts(channel!)).toEqual({ prefix: "", users: [] });
  });

  it("sem canal de teste configurado, o teste não avisa em lugar nenhum (nunca no canal de vendas)", () => {
    expect(salesChannel(true, { ...env, SALES_DISCORD_TEST_WEBHOOK_URL: undefined })).toBeNull();
  });

  it("menção só com ID válido do Discord", () => {
    expect(salesChannel(false, { ...env, PEDRO_DISCORD_USER_ID: "<@everyone>" })?.mentionId).toBeNull();
  });
});
