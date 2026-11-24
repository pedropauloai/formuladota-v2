// Cron do site (pg_cron a cada minuto, job "site-jobs"): tudo que não é partida.
// - Loja: concilia pedidos pendentes com o Mercado Pago (rede de segurança do webhook) e renova
//   a credencial da vitrine (no máximo a cada 6 h).
// - Meta de heróis: renova o /meta (público a cada 6 h, profissional a cada hora).
// - Novidades: espelha /novidades no canal do Discord.
// - Fila da party: encerra a live esquecida aberta há mais de 12 horas.
// - Battlepass: confere Pix pendente e cartão com o Mercado Pago (ativa e renova sem o webhook).
// Separado do cron de partidas para que pausar aquele job (bots parados) não pause a loja.
// Alguma tarefa falhou → 500, e o aviso no Discord sai pelo estado em cron_task_status.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isCronAuthorized } from "@/lib/cron/auth";
import { finishCronRun, runTask } from "@/lib/cron/tasks";
import { reconcilePendingStoreOrders } from "@/lib/loja/order-payments";
import { refreshOwnerProof } from "@/lib/loja/owner-proof";
import { refreshMeta } from "@/lib/dota/meta/store";
import { syncChangelogToDiscord } from "@/lib/changelog/discord-sync";
import { closeStaleLives } from "@/lib/loja/fila/live-auto-server";
import { reconcileBattlepass } from "@/lib/battlepass/reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const waitingForRetry = (value: string) => value === "aguardando";
  // Alguma parte do meta esperando a hora de tentar de novo: a rodada não diz nada sobre a saúde da tarefa.
  const metaWaiting = (parts: Record<string, string>) => Object.values(parts).some(waitingForRetry);
  const outcomes = await Promise.all([
    runTask("loja-conciliacao", () => reconcilePendingStoreOrders()),
    runTask("loja-credencial", () => refreshOwnerProof(), { isNeutral: waitingForRetry }),
    runTask("meta", () => refreshMeta(), { isNeutral: metaWaiting }),
    runTask("novidades-discord", () => syncChangelogToDiscord(createServiceClient())),
    runTask("fila-da-party", () => closeStaleLives()),
    runTask("battlepass", () => reconcileBattlepass()),
  ]);
  return finishCronRun(outcomes);
}
