// A live automática no servidor: o primeiro chamado da party abre a live, e o cron do site fecha a
// que passou 3 horas sem chamada nem partida (a regra está em live-auto.ts). Service role; quem chama
// (as ações do painel e o cron) confere antes se pode.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { queueOps } from "./admin";
import { liveIsIdle } from "./live-auto";
import { filaPartyLeader, syncFilaPartySafely } from "./social-party";

/**
 * A live em que o chamado entra: a que está no ar ou, fora do ar, uma que abre agora com o tamanho e
 * os lugares da fila aberta. `opened` diz se foi este chamado que abriu.
 */
export async function liveForCall(): Promise<{ id: string; opened: boolean } | null> {
  const { data, error } = await createServiceClient()
    .from("store_live_sessions")
    .select("id")
    .eq("is_test", isTestMode())
    .eq("status", "ao_vivo")
    .maybeSingle();
  if (error) throw new Error(`ler a live no ar falhou: ${error.message}`);
  if (data) return { id: data.id, opened: false };
  const id = await queueOps.openAuto();
  return id ? { id, opened: true } : null;
}

/** As marcas de atividade da live: quando abriu, a chamada de quem está na party e a última partida dela. */
async function activityMarks(live: { id: string; on_air_at: string | null; is_test: boolean }): Promise<(string | null)[]> {
  const supabase = createServiceClient();
  const [call, match] = await Promise.all([
    supabase.from("store_bookings").select("called_at").eq("is_test", live.is_test).eq("queue_state", "na_party").order("called_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from("party_participacoes").select("played_at").eq("live_session_id", live.id).order("played_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const failed = call.error ?? match.error;
  if (failed) throw new Error(`ler a atividade da live falhou: ${failed.message}`);
  return [live.on_air_at, call.data?.called_at ?? null, match.data?.played_at ?? null];
}

/** O cron fecha sozinho a live sem chamada nem partida há 3 horas: o PPA não precisa encerrar no site. */
export async function closeStaleLives(now = new Date()): Promise<{ closed: number }> {
  const { data, error } = await createServiceClient().from("store_live_sessions").select("id, on_air_at, is_test").eq("status", "ao_vivo");
  if (error) throw new Error(`ler lives abertas falhou: ${error.message}`);
  let closed = 0;
  for (const live of data ?? []) {
    if (!liveIsIdle(await activityMarks(live), now.getTime())) continue;
    // O líder do grupo do site sai antes de fechar: depois a party está vazia e não diz de quem era.
    const leader = await filaPartyLeader(live.is_test).catch(() => null);
    if (!(await queueOps.close(live.id))) continue;
    closed += 1;
    await syncFilaPartySafely(leader, live.is_test);
  }
  return { closed };
}
