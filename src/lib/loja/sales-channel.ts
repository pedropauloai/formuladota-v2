// Para onde vai o aviso de venda no Discord. Venda de verdade: o canal de vendas, marcando o PPA.
// Teste (pedido is_test dos testes automáticos): o canal de teste, sem marcar ninguém, e em lugar
// nenhum se ele não estiver configurado. Assim o teste nunca chega ao canal das vendas reais (o PPA,
// em 25/11/2026: "por que tá tendo um monte de teste de venda").

export interface SalesChannel {
  url: string;
  /** Quem o aviso marca; null nos testes. */
  mentionId: string | null;
}

type Env = Record<string, string | undefined>;

export function salesChannel(isTest: boolean, env: Env = process.env): SalesChannel | null {
  const url = isTest ? env.SALES_DISCORD_TEST_WEBHOOK_URL : env.SALES_DISCORD_WEBHOOK_URL;
  if (!url) return null;
  const pedro = env.PEDRO_DISCORD_USER_ID;
  return { url, mentionId: !isTest && pedro && /^\d{5,25}$/.test(pedro) ? pedro : null };
}

/** O começo do aviso e quem ele pode marcar (a lista do Discord que libera a menção). */
export function mentionParts(channel: SalesChannel): { prefix: string; users: string[] } {
  return channel.mentionId ? { prefix: `<@${channel.mentionId}> `, users: [channel.mentionId] } : { prefix: "", users: [] };
}
