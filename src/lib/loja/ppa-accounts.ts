// Leitura do cadastro das contas do Dota em que o PPA joga (ppa_dota_accounts, migration 197). Só o
// servidor lê a tabela; o painel da fila confere o admin antes de gravar.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { PPA_ACCOUNT_IDS } from "@/lib/battlepass/partida";
import { accountSearchOrder, type PpaAccount } from "./ppa-accounts-model";

/** As contas cadastradas, na ordem em que o site procura o PPA numa partida. */
export async function listPpaAccounts(): Promise<PpaAccount[]> {
  const { data, error } = await createServiceClient().from("ppa_dota_accounts").select("account_id, label, kind, created_at");
  if (error) throw new Error(`ler as contas do PPA falhou: ${error.message}`);
  const accounts: PpaAccount[] = (data ?? []).map((r) => ({
    accountId: Number(r.account_id),
    label: r.label,
    kind: r.kind === "emprestada" ? "emprestada" : "propria",
    createdAt: r.created_at,
  }));
  const order = accountSearchOrder(accounts);
  return [...accounts].sort((a, b) => order.indexOf(a.accountId) - order.indexOf(b.accountId));
}

/**
 * A ordem de busca do PPA numa partida (as contas dele antes das emprestadas). Sem o cadastro, ou se a
 * tabela não responder, valem as contas que o código já conhecia.
 */
export const ppaAccountSearchOrder = cache(async (): Promise<number[]> => {
  try {
    const order = accountSearchOrder(await listPpaAccounts());
    return order.length > 0 ? order : [...PPA_ACCOUNT_IDS];
  } catch (err) {
    console.error("[loja] contas do PPA:", err instanceof Error ? err.message : err);
    return [...PPA_ACCOUNT_IDS];
  }
});

/** Só as contas do próprio PPA: a busca da última partida não olha conta emprestada, que tem jogo do dono. */
export const ppaOwnAccounts = cache(async (): Promise<number[]> => {
  try {
    const own = (await listPpaAccounts()).filter((a) => a.kind === "propria").map((a) => a.accountId);
    return own.length > 0 ? own : [...PPA_ACCOUNT_IDS];
  } catch {
    return [...PPA_ACCOUNT_IDS];
  }
});
