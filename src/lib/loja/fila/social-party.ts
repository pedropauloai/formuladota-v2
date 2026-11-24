// A party da fila espelhada no grupo do site: quem o PPA chama para a party aparece no grupo dele,
// no mini perfil e no chat do grupo (pedido do PPA em 24/11/2026: "no mini perfil dos usuários tem
// que aparecer lá que a party foi feita"). O PPA lidera; quem sai da party da fila sai do grupo, e
// o grupo some quando a party esvazia. Service role. A fila é a fonte da verdade: uma falha aqui
// só vai para o log e nunca desfaz a operação da fila.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

type Db = ReturnType<typeof createServiceClient>;

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Quem está na party da fila agora (o PPA não conta: ele é o dono). */
async function filaPartyUsers(db: Db, isTest: boolean): Promise<string[]> {
  const rows = await must(db.from("store_bookings").select("user_id").eq("is_test", isTest).eq("queue_state", "na_party"), "ler a party da fila");
  return [...new Set((rows ?? []).map((r) => r.user_id).filter((id): id is string => !!id))];
}

/** Tira a pessoa do grupo em que está; se ela liderava, a liderança passa ao membro mais antigo. */
async function leaveCurrentParty(db: Db, userId: string): Promise<void> {
  const membership = await must(db.from("party_members").select("party_id").eq("user_id", userId).maybeSingle(), "ler o grupo");
  if (!membership) return;
  await must(db.from("party_members").delete().eq("user_id", userId), "sair do grupo");
  const rest = await must(db.from("party_members").select("user_id").eq("party_id", membership.party_id).order("joined_at", { ascending: true }), "ler o grupo");
  const next = rest?.[0];
  if (!next) {
    await must(db.from("parties").delete().eq("id", membership.party_id), "apagar o grupo vazio");
    return;
  }
  await must(
    db.from("parties").update({ leader_id: next.user_id, updated_at: new Date().toISOString() }).eq("id", membership.party_id).eq("leader_id", userId),
    "passar a liderança",
  );
}

/** O grupo que o PPA lidera, criado se faltar, com ele dentro. */
async function leaderParty(db: Db, leaderId: string): Promise<string> {
  const own = await must(db.from("parties").select("id").eq("leader_id", leaderId).maybeSingle(), "ler o grupo do PPA");
  const membership = await must(db.from("party_members").select("party_id").eq("user_id", leaderId).maybeSingle(), "ler o grupo do PPA");
  if (own && membership?.party_id === own.id) return own.id;
  if (membership) await leaveCurrentParty(db, leaderId);
  // Sair do grupo antigo pode ter apagado o próprio grupo dele (ficou vazio): confere de novo.
  const kept = own ? await must(db.from("parties").select("id").eq("id", own.id).maybeSingle(), "ler o grupo do PPA") : null;
  const created = kept ? null : await must(db.from("parties").insert({ leader_id: leaderId }).select("id").single(), "criar o grupo do PPA");
  const partyId = kept?.id ?? created?.id;
  if (!partyId) throw new Error("criar o grupo do PPA: sem id");
  await must(db.from("party_members").insert({ party_id: partyId, user_id: leaderId }), "pôr o PPA no grupo");
  return partyId;
}

/**
 * Deixa o grupo do PPA igual à party da fila: entra quem está na party (saindo do grupo em que
 * estava), sai quem não está mais, e o grupo some quando ninguém sobra além dele.
 */
export async function syncFilaParty(leaderId: string, isTest: boolean): Promise<void> {
  const db = createServiceClient();
  const want = new Set((await filaPartyUsers(db, isTest)).filter((id) => id !== leaderId));
  const own = await must(db.from("parties").select("id").eq("leader_id", leaderId).maybeSingle(), "ler o grupo do PPA");
  if (!own && want.size === 0) return;
  if (own && want.size === 0) {
    await must(db.from("parties").delete().eq("id", own.id), "desfazer o grupo do PPA");
    return;
  }
  const partyId = await leaderParty(db, leaderId);
  const members = await must(db.from("party_members").select("user_id").eq("party_id", partyId), "ler o grupo do PPA");
  const have = new Set((members ?? []).map((m) => m.user_id));
  for (const id of have) {
    if (id !== leaderId && !want.has(id)) await must(db.from("party_members").delete().eq("party_id", partyId).eq("user_id", id), "tirar do grupo");
  }
  for (const id of want) {
    if (have.has(id)) continue;
    await leaveCurrentParty(db, id);
    await must(db.from("party_members").insert({ party_id: partyId, user_id: id }), "pôr no grupo");
  }
}

/** Quem lidera o grupo de quem está na party da fila agora (para o cron desfazer o grupo ao fechar a live). */
export async function filaPartyLeader(isTest: boolean): Promise<string | null> {
  const db = createServiceClient();
  const users = await filaPartyUsers(db, isTest);
  if (!users.length) return null;
  const membership = await must(db.from("party_members").select("party_id").in("user_id", users).limit(1).maybeSingle(), "ler o grupo da party");
  if (!membership) return null;
  const party = await must(db.from("parties").select("leader_id").eq("id", membership.party_id).maybeSingle(), "ler o líder do grupo");
  return party && !users.includes(party.leader_id) ? party.leader_id : null;
}

/** Espelha sem nunca derrubar a operação da fila que acabou de dar certo. */
export async function syncFilaPartySafely(leaderId: string | null, isTest: boolean): Promise<void> {
  if (!leaderId) return;
  try {
    await syncFilaParty(leaderId, isTest);
  } catch (err) {
    console.error("[fila] espelhar a party no grupo do site falhou:", err instanceof Error ? err.message : err);
  }
}
