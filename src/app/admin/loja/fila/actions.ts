"use server";

// Ações do painel da fila da party. O layout /admin já barra quem não é admin, e cada ação confere
// de novo (ação de servidor é endpoint público). A trava contra duplo toque mora no banco.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminUser, queueOps, resizeLive } from "@/lib/loja/fila/admin";
import { parseYoutubeVideoId } from "@/lib/loja/fila/youtube";

export type FilaAdminResult = { ok: true; message?: string } | { ok: false; error: string };

const PATH = "/admin/loja/fila";
const uuid = z.string().uuid();
const queueSize = z.number().int().min(0).max(100);
const seatsPerMatch = z.number().int().min(1).max(4);

async function run(what: string, action: () => Promise<string | null | undefined>): Promise<FilaAdminResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin opera a fila." };
  try {
    const problem = await action();
    revalidatePath(PATH);
    return problem ? { ok: false, error: problem } : { ok: true };
  } catch (err) {
    console.error(`[admin/fila] ${what} falhou:`, err instanceof Error ? err.message : err);
    return { ok: false, error: `Não deu para ${what}. Tente de novo.` };
  }
}

export async function abrirLive(size: number, perMatch: number, youtube: string): Promise<FilaAdminResult> {
  const parsed = z.object({ size: queueSize, perMatch: seatsPerMatch }).safeParse({ size, perMatch });
  if (!parsed.success) return { ok: false, error: "A fila vai de 0 a 100 partidas, e a party tem de 1 a 4 lugares." };
  const videoId = youtube.trim() ? parseYoutubeVideoId(youtube) : null;
  if (youtube.trim() && !videoId) return { ok: false, error: "Esse link não é de um vídeo do YouTube. Cole o link da live ou deixe em branco." };
  return run("abrir a live", async () => ((await queueOps.open(size, perMatch, videoId)) ? null : "A live não abriu."));
}

export async function encerrarLive(liveId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success) return { ok: false, error: "Live inválida." };
  return run("encerrar a live", async () => ((await queueOps.close(liveId)) ? null : "Essa live já não estava no ar."));
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

export async function chamarProximo(liveId: string, bookingId: string | null = null): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success || (bookingId !== null && !uuid.safeParse(bookingId).success)) return { ok: false, error: "Pedido inválido." };
  return run("chamar", async () => ((await queueOps.call(liveId, bookingId)) ? null : "A party está cheia ou não tem ninguém esperando."));
}

/** Chama até completar os lugares da party (cada chamada respeita a trava do banco). */
export async function completarParty(liveId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success) return { ok: false, error: "Live inválida." };
  return run("completar a party", async () => {
    let called = 0;
    while (called < 4 && (await queueOps.call(liveId, null))) called += 1;
    return called > 0 ? null : "A party está cheia ou não tem ninguém esperando.";
  });
}

export async function marcarJogou(bookingId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("marcar a partida", async () => ((await queueOps.played(bookingId)) ? null : "Essa pessoa não está na party."));
}

export async function partidaTerminou(liveId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(liveId).success) return { ok: false, error: "Live inválida." };
  return run("marcar a partida", async () => ((await queueOps.matchOver(liveId)) > 0 ? null : "Não tem ninguém na party."));
}

export async function naoApareceu(bookingId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("pular", async () => ((await queueOps.noShow(bookingId)) ? null : "Essa pessoa não está na party."));
}

export async function tirarDaFila(bookingId: string): Promise<FilaAdminResult> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Pedido inválido." };
  return run("tirar da fila", async () => ((await queueOps.remove(bookingId)) ? null : "Essa pessoa já não estava na fila."));
}
