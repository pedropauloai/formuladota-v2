// Aviso de operação no canal privado de vendas do Discord, o que toca no celular do Pedro.

import "server-only";

const ALERT_TIMEOUT_MS = 8_000;

/** Devolve true quando o Discord aceitou a mensagem. Sem webhook configurado, não avisa. */
export async function sendOpsAlert(text: string, mentionPedro: boolean): Promise<boolean> {
  const url = process.env.SALES_DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const pedro = process.env.PEDRO_DISCORD_USER_ID;
  const mention = mentionPedro && pedro ? `<@${pedro}> ` : "";
  try {
    const res = await fetch(`${url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${mention}${text}`.slice(0, 1900),
        allowed_mentions: { parse: [], users: mention && pedro ? [pedro] : [] },
      }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
