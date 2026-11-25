// Aviso do Battlepass ao Pedro no canal de vendas do Discord (o mesmo da loja). Falha de aviso
// nunca derruba pagamento: loga e segue.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import { getIdentityMap } from "@/lib/queries/identities";
import { BATTLEPASS, formatBrl } from "./config";
import { mentionParts, salesChannel } from "@/lib/loja/sales-channel";

const TIMEOUT_MS = 8000;

export type BattlepassEvent =
  | { kind: "assinou_cartao"; userId: string; isTest: boolean }
  | { kind: "renovou_cartao"; userId: string; isTest: boolean; amountCents: number }
  | { kind: "pagou_pix"; userId: string; isTest: boolean; amountCents: number; until: string }
  | { kind: "reembolso"; userId: string; isTest: boolean; totalCents: number; mpPaymentIds: string[] }
  | { kind: "revisar"; userId: string; isTest: boolean; reason: string };

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

// Nome do jogador vai como texto: nada de formatação nem menção injetada.
const safe = (text: string) => text.replace(/([`*_~|>@\\])/g, "\\$1");

export function eventText(event: BattlepassEvent, name: string): string {
  const who = safe(name);
  switch (event.kind) {
    case "assinou_cartao":
      return `${who} assinou o Battlepass no cartão (${formatBrl(BATTLEPASS.priceCents)} por mês).`;
    case "renovou_cartao":
      return `${who} renovou o Battlepass no cartão (${formatBrl(event.amountCents)}).`;
    case "pagou_pix":
      return `${who} pagou 30 dias de Battlepass no Pix (${formatBrl(event.amountCents)}), até ${DATE.format(new Date(event.until))}.`;
    case "reembolso":
      return (
        `${who} pediu o dinheiro de volta na garantia de 7 dias. Devolver ${formatBrl(event.totalCents)} no Mercado Pago` +
        (event.mpPaymentIds.length ? ` (pagamento ${event.mpPaymentIds.join(", ")}).` : ".") +
        " O acesso já foi encerrado."
      );
    case "revisar":
      return `Battlepass de ${who} precisa de revisão: ${safe(event.reason)}.`;
  }
}

async function nameOf(userId: string): Promise<string> {
  try {
    const identities = await getIdentityMap(createServiceClient(), [userId]);
    return identities.get(userId)?.name || "Jogador";
  } catch {
    return "Jogador";
  }
}

export async function notifyBattlepass(event: BattlepassEvent): Promise<void> {
  const channel = salesChannel(event.isTest);
  if (!channel) return;
  const { prefix: mention, users } = mentionParts(channel);
  const adminUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin/battlepass`;
  const text = eventText(event, await nameOf(event.userId));
  try {
    const response = await fetch(`${channel.url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${mention}${event.isTest ? "[TESTE] " : ""}Battlepass: ${text}\n${adminUrl}`.slice(0, 2000),
        allowed_mentions: { parse: [], users },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("[battlepass/aviso] Discord recusou: HTTP", response.status);
  } catch (err) {
    console.error("[battlepass/aviso] Discord falhou:", err);
  }
}
