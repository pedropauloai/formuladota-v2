"use server";

// Ações do painel da fila da party. O layout /admin já barra quem não é admin, e cada ação confere
// de novo (ação de servidor é endpoint público). A trava contra duplo toque mora no banco.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminUserId, isAdminUser, queueOps, resizeLive } from "@/lib/loja/fila/admin";
import { syncFilaPartySafely } from "@/lib/loja/fila/social-party";
import { parseYoutubeVideoId } from "@/lib/loja/fila/youtube";
import { parseMatchId } from "@/lib/battlepass/partida";
import { currentPartyAccounts, partyLastMatch, resolveMatch } from "@/lib/battlepass/partida-server";
import { isTestMode } from "@/lib/mercadopago";
import { endedBeforeLive, liveOnAirAt } from "@/lib/loja/fila/live-time";
import { liveForCall } from "@/lib/loja/fila/live-auto-server";

export type FilaAdminResult = { ok: true; message?: string } | { ok: false; error: string };

const PATH = "/admin/loja/fila";
const uuid = z.string().uuid();
const queueSize = z.number().int().min(0).max(100);
const seatsPerMatch = z.number().int().min(1).max(4);

/** O que a ação respondeu: o problema (texto), um aviso de sucesso diferente do padrão, ou nada. */
type Outcome = string | { message: string } | null | undefined;

async function run(what: string, action: () => Promise<Outcome>): Promise<FilaAdminResult> {
  const adminId = await adminUserId();
  if (!adminId) return { ok: false, error: "Só o admin opera a fila." };
  try {
    const outcome = await action();
    // Quem está na party da fila aparece no grupo do PPA no site (mini perfil e chat do grupo).
    await syncFilaPartySafely(adminId, isTestMode());
    revalidatePath(PATH);
    if (typeof outcome === "string" && outcome) return { ok: false, error: outcome };
    return outcome && typeof outcome === "object" ? { ok: true, message: outcome.message } : { ok: true };
  } catch (err) {
    console.error(`[admin/fila] ${what} falhou:`, err instanceof Error ? err.message : err);
    return { ok: false, error: `Não deu para ${what}. Tente de novo.` };
  }
}

/**
 * Encerra a live. Com `countMatch`, conta antes a partida de quem está na party (ela terminou);
 * sem, quem estava na party volta para a frente da fila sem perder a partida.
 */
export async function encerrarLive(liveId: string, countMatch = false, matchesDone = 0): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success) return { ok: false, error: "Live inválida." };
  return run("encerrar a live", async () => {
    if (countMatch) await queueOps.matchOver(liveId, matchesDone);
    return (await queueOps.close(liveId)) ? null : "Essa live já não estava no ar.";
  });
}

export async function ajustarVagas(liveId: string, size: number, perMatch: number, youtube: string): Promise<FilaAdminResult> {
  const parsed = z.object({ liveId: uuid, size: queueSize, perMatch: seatsPerMatch }).safeParse({ liveId, size, perMatch });
  if (!parsed.success) return { ok: false, error: "A fila vai de 0 a 100 partidas, e a party tem de 1 a 4 lugares." };
  // Campo vazio mantém o vídeo que já estava.
  const videoId = youtube.trim() ? parseYoutubeVideoId(youtube) : undefined;
  if (videoId === null) return { ok: false, error: "Esse link não é de um vídeo do YouTube. Cole o link da live ou deixe em branco." };
  return run("mudar a live", async () => {
    await resizeLive(liveId, size, perMatch, videoId);
    return null;
  });
}

const NOBODY = "A party está cheia ou não tem ninguém esperando.";
const NOT_OPENED = "A live não abriu. Tente de novo.";

/**
 * Chama para a party. Fora do ar, o chamado abre a live sozinho (o PPA não abre no painel); se
 * ninguém entrar, a live que ele abriu fecha de volta.
 */
export async function chamarProximo(bookingId: string | null = null): Promise<FilaAdminResult> {
  if (bookingId !== null && !uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("chamar", async () => {
    const live = await liveForCall();
    if (!live) return NOT_OPENED;
    if (await queueOps.call(live.id, bookingId)) return live.opened ? { message: "A live abriu sozinha. Quem você chamou já está na party." } : null;
    if (live.opened) await queueOps.close(live.id);
    return NOBODY;
  });
}

/** Chama até completar os lugares da party (cada chamada respeita a trava do banco); fora do ar, abre a live. */
export async function completarParty(): Promise<FilaAdminResult> {
  return run("completar a party", async () => {
    const live = await liveForCall();
    if (!live) return NOT_OPENED;
    let called = 0;
    while (called < 4 && (await queueOps.call(live.id, null))) called += 1;
    if (called > 0) return live.opened ? { message: "A live abriu sozinha e a party está completa. Convide cada um pelo ID do Dota." } : null;
    if (live.opened) await queueOps.close(live.id);
    return NOBODY;
  });
}

type MatchData = { matchId: string; playedAt: string; confirmedUserIds: string[] };

const BR_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
/**
 * A partida pelo ID que o PPA colou: conferida na OpenDota, ou só com o ID quando a OpenDota ainda
 * não tem. O time sai da conta do PPA ou, numa smurf, de quem está na party. Partida que acabou
 * antes de a live abrir é recusada: é ID trocado (de outra partida da conta principal, por exemplo).
 */
async function matchFromInput(input: string, liveId: string): Promise<{ match: MatchData; note: string } | { error: string }> {
  const [partyAccounts, onAirAt] = await Promise.all([currentPartyAccounts(isTestMode()), liveOnAirAt(liveId)]);
  const resolved = await resolveMatch(input, partyAccounts);
  if (resolved.ok && endedBeforeLive(resolved.playedAt, onAirAt)) {
    return { error: `Essa partida terminou em ${BR_TIME.format(new Date(resolved.playedAt))}, antes de a live abrir. Confira o ID (use "Achar a partida da party").` };
  }
  if (resolved.ok) {
    const hidden = resolved.hidden ? `, ${resolved.hidden} com o perfil do Dota privado` : "";
    return { match: resolved, note: `Partida registrada: ${resolved.confirmedUserIds.length} do site conferido(s) no time do PPA${hidden}.` };
  }
  if (resolved.reason === "id_invalido") return { error: "Esse ID não é de uma partida do Dota. Cole o número ou o link da OpenDota." };
  if (resolved.reason === "sem_ppa") return { error: "Nem o PPA nem ninguém da party está nessa partida. Confira o ID." };
  const matchId = parseMatchId(input);
  if (!matchId) return { error: "Esse ID não é de uma partida do Dota." };
  // OpenDota processando ou fora do ar: a vez conta com a hora de agora, sem a conferência.
  return { match: { matchId, playedAt: new Date().toISOString(), confirmedUserIds: [] }, note: "Partida registrada com o ID; a OpenDota ainda não tem ela, então ficou sem a conferência." };
}

/**
 * Conta a partida para todos da party e grava a vez de cada um no revezamento. `matchesDone` é o
 * número que o painel mostrava: o segundo toque não conta de novo. Com o ID, confere na OpenDota.
 */
export async function partidaTerminou(liveId: string, matchesDone: number, matchInput = ""): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success || !Number.isInteger(matchesDone)) return { ok: false, error: "Live inválida." };
  const adminId = await adminUserId();
  if (!adminId) return { ok: false, error: "Só o admin opera a fila." };
  try {
    let match: MatchData | undefined;
    let note: string | undefined;
    if (matchInput.trim()) {
      const found = await matchFromInput(matchInput, liveId);
      if ("error" in found) return { ok: false, error: found.error };
      ({ match, note } = found);
    }
    const counted = await queueOps.matchOver(liveId, matchesDone, match);
    // O revezamento do fim da partida troca quem está na party: o grupo do site acompanha.
    await syncFilaPartySafely(adminId, isTestMode());
    revalidatePath(PATH);
    if (counted === -1) return { ok: false, error: "Essa partida já tinha sido marcada." };
    return counted > 0 ? { ok: true, message: note } : { ok: false, error: "Não tem ninguém na party." };
  } catch (err) {
    console.error("[admin/fila] marcar a partida falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não deu para marcar a partida. Tente de novo." };
  }
}

export type UltimaPartidaResult = { ok: true; matchId: string; endedAt: string } | { ok: false; error: string };

/** A última partida do PPA na OpenDota, para o painel preencher o ID com um toque. */
export async function ultimaPartidaDoPPA(): Promise<UltimaPartidaResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin opera a fila." };
  const last = await partyLastMatch(await currentPartyAccounts(isTestMode()));
  return last ? { ok: true, ...last } : { ok: false, error: "A OpenDota não achou a partida da party. Cole o ID da partida." };
}

/** Troca de jogador: sai da party e volta para a fila no mesmo lugar, sem falta. */
export async function tirarDaParty(bookingId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("tirar da party", async () => ((await queueOps.leaveParty(bookingId)) ? null : "Essa pessoa já não estava na party."));
}

export async function tirarDaFila(bookingId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("tirar da fila", async () => ((await queueOps.remove(bookingId)) ? null : "Essa pessoa já não estava na fila."));
}
