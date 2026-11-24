"use server";

// Ações da mesa de operação da fila: a prévia da partida que terminou (achada na OpenDota antes de
// contar) e a troca de jogador da party. Cada ação confere se é admin (ação de servidor é endpoint
// público); quem conta a partida é partidaTerminou, em actions.ts.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminUserId, isAdminUser, queueOps } from "@/lib/loja/fila/admin";
import { syncFilaPartySafely } from "@/lib/loja/fila/social-party";
import { endedBeforeLive, liveOnAirAt } from "@/lib/loja/fila/live-time";
import { currentPartyMembers, partyLastMatch, resolveMatch, type ResolvedMatch } from "@/lib/battlepass/partida-server";
import { isTestMode } from "@/lib/mercadopago";
import type { FilaAdminResult } from "./actions";

const uuid = z.string().uuid();

export type PartidaPreview =
  | {
      ok: true;
      matchId: string;
      endedAt: string;
      /** O time do PPA venceu; null quando a OpenDota não diz. */
      won: boolean | null;
      /** Reservas da party que a OpenDota mostrou no time do PPA. */
      confirmed: string[];
      /** Do time do PPA com o perfil do Dota privado. */
      hidden: number;
      /** Terminou antes de a live abrir: provavelmente é outra partida. */
      beforeLive: boolean;
    }
  | { ok: false; error: string };

const REASONS: Record<Exclude<ResolvedMatch, { ok: true }>["reason"], string> = {
  id_invalido: "Esse ID não é de uma partida do Dota. Cole o número ou o link da OpenDota.",
  sem_ppa: "Nem você nem ninguém da party está nessa partida. Confira o ID.",
  ainda_nao: "A OpenDota ainda está processando essa partida. Tente de novo em 1 minuto, ou conte sem o ID.",
  opendota: "A OpenDota não respondeu agora. Tente de novo, ou conte sem o ID.",
};

/**
 * Acha a partida que a party acabou de jogar (ou a do ID colado) e mostra antes de contar: o ID,
 * quando terminou, o resultado e quem a OpenDota conferiu. Não grava nada.
 */
export async function previewPartida(liveId: string, input = ""): Promise<PartidaPreview> {
  if (!uuid.safeParse(liveId).success) return { ok: false, error: "Live inválida." };
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin opera a fila." };
  try {
    const [members, onAirAt] = await Promise.all([currentPartyMembers(isTestMode()), liveOnAirAt(liveId)]);
    const accounts = members.map((m) => m.account);
    const matchInput = input.trim() || (await partyLastMatch(accounts))?.matchId;
    if (!matchInput) return { ok: false, error: "Não achei a partida da party na OpenDota. Cole o ID, ou conte sem ele." };
    const resolved = await resolveMatch(matchInput, accounts);
    if (!resolved.ok) return { ok: false, error: REASONS[resolved.reason] };
    const confirmedUsers = new Set(resolved.confirmedUserIds);
    return {
      ok: true,
      matchId: resolved.matchId,
      endedAt: resolved.playedAt,
      won: resolved.won,
      confirmed: members.filter((m) => confirmedUsers.has(m.userId)).map((m) => m.bookingId),
      hidden: resolved.hidden,
      beforeLive: endedBeforeLive(resolved.playedAt, onAirAt),
    };
  } catch (err) {
    console.error("[admin/fila] prévia da partida falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: REASONS.opendota };
  }
}

/**
 * Troca de jogador: quem sai volta para a fila no mesmo lugar, sem falta, e quem entra vai para a
 * party. Se quem ia entrar não pode mais (saiu da fila, por exemplo), quem saiu volta para a party.
 */
export async function trocarJogador(liveId: string, saiId: string, entraId: string): Promise<FilaAdminResult> {
  const ids = z.object({ liveId: uuid, saiId: uuid, entraId: uuid }).safeParse({ liveId, saiId, entraId });
  if (!ids.success || saiId === entraId) return { ok: false, error: "Troca inválida." };
  const adminId = await adminUserId();
  if (!adminId) return { ok: false, error: "Só o admin opera a fila." };
  try {
    if (!(await queueOps.leaveParty(saiId))) return { ok: false, error: "Quem ia sair já não estava na party." };
    if (await queueOps.call(liveId, entraId)) {
      await syncFilaPartySafely(adminId, isTestMode());
      revalidatePath("/admin/loja/fila");
      return { ok: true };
    }
    await queueOps.call(liveId, saiId);
    revalidatePath("/admin/loja/fila");
    return { ok: false, error: "Não deu para trocar: quem ia entrar não está mais na fila. A party ficou como estava." };
  } catch (err) {
    console.error("[admin/fila] trocar jogador falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não deu para trocar. Tente de novo." };
  }
}
