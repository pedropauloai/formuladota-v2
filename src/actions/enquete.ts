"use server";

// Voto na enquete da Liga do FORMULADOTA (coluna direita, flag enquete_liga). Um clique e sem login:
// quem está logado vota pela conta; o visitante, pelo id aleatório do aparelho (cookie httpOnly).

import { headers } from "next/headers";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { RESPOSTAS, type EnqueteEstado } from "@/lib/enquete/liga";
import { criarAparelho, gravarVoto, lerAparelho, lerEnqueteLiga } from "@/lib/enquete/server";

const votoSchema = z.object({ resposta: z.enum(RESPOSTAS) });

export type ErroDoVoto = "fechada" | "limite" | "falhou";
export type VotoResultado = { ok: true; estado: EnqueteEstado | null } | { ok: false; erro: ErroDoVoto };

/** Admin vê Talvez e Não; no "ver como usuário comum" ele vê o que o jogador vê, como no shell. */
async function quemVotaEhAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true && !(await getPreviewModeActive());
}

export async function votarNaEnqueteLiga(input: unknown): Promise<VotoResultado> {
  const parsed = votoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "falhou" };
  if (!(await getFeatureFlags()).enquete_liga) return { ok: false, erro: "fechada" };

  // Freio de abuso por IP: trocar de resposta não infla nada; aparelho novo infla e tem freio próprio.
  const ip = clientIp(await headers());
  if (!allowRequest("enquete", ip, 30, 60_000)) return { ok: false, erro: "limite" };

  const user = await getCurrentUser();
  let aparelhoId = await lerAparelho();
  if (!user && !aparelhoId) {
    if (!allowRequest("enquete-aparelho", ip, 10, 10 * 60_000)) return { ok: false, erro: "limite" };
    aparelhoId = await criarAparelho();
  }

  const userId = user?.id ?? null;
  if (!(await gravarVoto({ userId, aparelhoId }, parsed.data.resposta))) return { ok: false, erro: "falhou" };

  const isAdmin = user ? await quemVotaEhAdmin(user.id) : false;
  // Logado: o voto do aparelho acabou de ser absorvido pelo da conta, então a leitura usa só a conta.
  const estado = await lerEnqueteLiga({ userId, aparelhoId: user ? null : aparelhoId }, isAdmin);
  return { ok: true, estado };
}
