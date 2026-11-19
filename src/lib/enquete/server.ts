// Enquete da Liga: leitura e gravação em poll_votes (migration 180), só pela service role: a tabela
// não tem política e anon e authenticated não têm permissão nela. Quem decide quem vota é a server
// action (src/actions/enquete.ts).
// Tempo real, sem cache: são contagens pelo índice numa tabela pequena, e quem vota precisa ver o
// próprio voto na hora.

import "server-only";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import {
  ENQUETE_LIGA,
  chaveDoVoto,
  estadoParaQuemVe,
  lerIdDoAparelho,
  votoDeQuemVe,
  type EnqueteEstado,
  type Resposta,
} from "./liga";

/** Cookie httpOnly com o id aleatório do aparelho do visitante (o voto sem login). */
export const COOKIE_APARELHO = "fd_aparelho";
const UM_ANO_S = 60 * 60 * 24 * 365;

type Db = ReturnType<typeof createServiceClient>;

interface Votante {
  userId: string | null;
  aparelhoId: string | null;
}

async function contar(db: Db, resposta: Resposta): Promise<number> {
  const { count, error } = await db
    .from("poll_votes")
    .select("voter_key", { count: "exact", head: true })
    .eq("poll_key", ENQUETE_LIGA)
    .eq("answer", resposta);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function votosDe(db: Db, chaves: string[]): Promise<{ voter_key: string; answer: string }[]> {
  if (chaves.length === 0) return [];
  const { data, error } = await db
    .from("poll_votes")
    .select("voter_key, answer")
    .eq("poll_key", ENQUETE_LIGA)
    .in("voter_key", chaves);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Aparelho do visitante lido do cookie (o Server Component só lê; quem cria é a server action). */
export async function lerAparelho(): Promise<string | null> {
  return lerIdDoAparelho((await cookies()).get(COOKIE_APARELHO)?.value);
}

/** Cria o id do aparelho do visitante: aleatório, httpOnly e válido por um ano. */
export async function criarAparelho(): Promise<string> {
  const id = crypto.randomUUID();
  (await cookies()).set(COOKIE_APARELHO, id, {
    path: "/",
    maxAge: UM_ANO_S,
    sameSite: "lax",
    httpOnly: true,
    secure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
  });
  return id;
}

/** Estado para quem vê. Null se o banco falhar: a coluna some com o card em vez de mostrar número errado. */
export async function lerEnqueteLiga({ userId, aparelhoId }: Votante, isAdmin: boolean): Promise<EnqueteEstado | null> {
  const db = createServiceClient();
  const chaveConta = userId ? chaveDoVoto({ userId }) : null;
  const chaveAparelho = aparelhoId ? chaveDoVoto({ aparelhoId }) : null;
  try {
    const [sim, talvez, nao, meus] = await Promise.all([
      contar(db, "sim"),
      isAdmin ? contar(db, "talvez") : Promise.resolve(0),
      isAdmin ? contar(db, "nao") : Promise.resolve(0),
      votosDe(db, [chaveConta, chaveAparelho].filter((c): c is string => c !== null)),
    ]);
    return estadoParaQuemVe({ sim, talvez, nao }, votoDeQuemVe(meus, chaveConta, chaveAparelho), isAdmin);
  } catch (err) {
    console.error("[enquete] ler falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** A enquete para quem abre a página: a conta logada (se houver) e o aparelho do cookie. */
export async function lerEnqueteDeQuemVe(isAdmin: boolean): Promise<EnqueteEstado | null> {
  const [user, aparelhoId] = await Promise.all([getCurrentUser(), lerAparelho()]);
  return lerEnqueteLiga({ userId: user?.id ?? null, aparelhoId }, isAdmin);
}

/**
 * Grava ou troca o voto. Logado vota pela conta, e o voto que o mesmo aparelho deu antes de entrar
 * sai, para a pessoa não contar duas vezes. Devolve false se o banco recusar.
 */
export async function gravarVoto({ userId, aparelhoId }: Votante, resposta: Resposta): Promise<boolean> {
  const voterKey = userId ? chaveDoVoto({ userId }) : aparelhoId ? chaveDoVoto({ aparelhoId }) : null;
  if (!voterKey) return false;
  const db = createServiceClient();
  const { error } = await db
    .from("poll_votes")
    .upsert({ poll_key: ENQUETE_LIGA, voter_key: voterKey, user_id: userId, answer: resposta }, { onConflict: "poll_key,voter_key" });
  if (error) {
    console.error("[enquete] gravar voto falhou:", error.message);
    return false;
  }
  if (userId && aparelhoId) {
    const { error: absorver } = await db
      .from("poll_votes")
      .delete()
      .eq("poll_key", ENQUETE_LIGA)
      .eq("voter_key", chaveDoVoto({ aparelhoId }));
    if (absorver) console.error("[enquete] tirar o voto do aparelho falhou:", absorver.message);
  }
  return true;
}
