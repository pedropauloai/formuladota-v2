"use server";

// Cadastro das contas do Dota em que o PPA joga (as dele e as emprestadas): o site acha o PPA numa
// partida registrada por elas. Só o admin mexe; a tabela só abre para o servidor.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminUser } from "@/lib/loja/fila/admin";
import { openDotaJson } from "@/lib/dota/opendota-fetch";
import { parseAccountInput } from "@/lib/loja/ppa-accounts-model";
import type { FilaAdminResult } from "./actions";

const PATH = "/admin/loja/fila";
const kind = z.enum(["propria", "emprestada"]);

/** O nome da conta no OpenDota, para a lista mostrar qual é qual; vazio se o perfil for privado. */
async function personaOf(accountId: number): Promise<string> {
  try {
    const player = await openDotaJson<{ profile?: { personaname?: string } }>(`/players/${accountId}`, { timeoutMs: 8000 });
    return (player.profile?.personaname ?? "").slice(0, 60);
  } catch {
    return "";
  }
}

export async function cadastrarConta(input: string, accountKind: string): Promise<FilaAdminResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin mexe nas contas." };
  const accountId = parseAccountInput(input);
  const parsedKind = kind.safeParse(accountKind);
  if (!accountId) return { ok: false, error: "Cole o número da conta ou o link do perfil no OpenDota, Dotabuff, STRATZ ou Steam." };
  if (!parsedKind.success) return { ok: false, error: "Escolha se a conta é sua ou emprestada." };
  const label = await personaOf(accountId);
  const { error } = await createServiceClient()
    .from("ppa_dota_accounts")
    .upsert({ account_id: accountId, label, kind: parsedKind.data }, { onConflict: "account_id" });
  if (error) {
    console.error("[admin/fila] cadastrar conta falhou:", error.message);
    return { ok: false, error: "Não deu para cadastrar a conta. Tente de novo." };
  }
  revalidatePath(PATH);
  return { ok: true, message: label ? `Conta "${label}" cadastrada.` : `Conta ${accountId} cadastrada.` };
}

export async function removerConta(accountId: number): Promise<FilaAdminResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Só o admin mexe nas contas." };
  if (!Number.isInteger(accountId) || accountId <= 0) return { ok: false, error: "Conta inválida." };
  const { error } = await createServiceClient().from("ppa_dota_accounts").delete().eq("account_id", accountId);
  if (error) {
    console.error("[admin/fila] remover conta falhou:", error.message);
    return { ok: false, error: "Não deu para tirar a conta. Tente de novo." };
  }
  revalidatePath(PATH);
  return { ok: true, message: "Conta tirada da lista." };
}
