"use server";

// Ações da cortesia no painel da fila: o Pedro põe alguém na fila sem pagamento e soma ou tira
// partidas de quem já está na fila. Cada ação confere se é admin (ação de servidor é endpoint público).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminUser, queueOps } from "@/lib/loja/fila/admin";
import { searchPlayers, type PlayerHit } from "@/lib/loja/fila/admin-search";
import type { FilaAdminResult } from "./actions";

const uuid = z.string().uuid();

async function guarded(what: string, action: () => Promise<string | null>): Promise<FilaAdminResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin opera a fila." };
  try {
    const problem = await action();
    revalidatePath("/admin/loja/fila");
    return problem ? { ok: false, error: problem } : { ok: true };
  } catch (err) {
    console.error(`[admin/fila] ${what} falhou:`, err instanceof Error ? err.message : err);
    return { ok: false, error: `Não deu para ${what}. Tente de novo.` };
  }
}

export async function buscarJogadores(query: string): Promise<PlayerHit[]> {
  if (!(await isAdminUser()) || typeof query !== "string") return [];
  try {
    return await searchPlayers(query);
  } catch (err) {
    console.error("[admin/fila] buscar jogador falhou:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function darCortesia(userId: string, matches: number): Promise<FilaAdminResult> {
  const parsed = z.object({ userId: uuid, matches: z.number().int().min(1).max(20) }).safeParse({ userId, matches });
  if (!parsed.success) return { ok: false, error: "Escolha um jogador e de 1 a 20 partidas." };
  return guarded("pôr na fila", async () =>
    (await queueOps.addCourtesy(userId, matches)) ? null : "Não entrou: a pessoa precisa da Steam vinculada, e a cortesia vai até 20 partidas."
  );
}

export async function ajustarPartidas(bookingId: string, delta: number): Promise<FilaAdminResult> {
  const parsed = z.object({ bookingId: uuid, delta: z.number().int().min(-19).max(19).refine((n) => n !== 0) }).safeParse({ bookingId, delta });
  if (!parsed.success) return { ok: false, error: "Ajuste inválido." };
  return guarded("ajustar as partidas", async () =>
    (await queueOps.adjustMatches(bookingId, delta)) !== null ? null : "Não mudou: fica pelo menos 1 partida por jogar e no máximo 20. Para tirar, use Tirar."
  );
}
