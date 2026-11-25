// Aviso de operação no canal privado de vendas do Discord, o que toca no celular do Pedro.

import "server-only";
import { mentionParts, salesChannel } from "@/lib/loja/sales-channel";

const ALERT_TIMEOUT_MS = 8_000;

/** Devolve true quando o Discord aceitou a mensagem. Sem webhook configurado, não avisa. Alerta de teste vai ao canal de teste. */
export async function sendOpsAlert(text: string, mentionPedro: boolean, isTest = false): Promise<boolean> {
  const channel = salesChannel(isTest);
  if (!channel) return false;
  const { prefix: mention, users } = mentionPedro ? mentionParts(channel) : { prefix: "", users: [] as string[] };
  try {
    const res = await fetch(`${channel.url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${mention}${text}`.slice(0, 1900),
        allowed_mentions: { parse: [], users },
      }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
