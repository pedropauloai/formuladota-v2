// Hora em que a live abriu, para recusar (ou avisar) partida de antes dela: ID trocado, ou a
// última partida da conta principal quando o PPA jogou numa smurf.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Folga para partida que começou um pouco antes de o PPA abrir a live no painel. */
export const BEFORE_LIVE_MS = 30 * 60 * 1000;

export async function liveOnAirAt(liveId: string): Promise<number | null> {
  const { data } = await createServiceClient().from("store_live_sessions").select("on_air_at").eq("id", liveId).maybeSingle();
  return data?.on_air_at ? Date.parse(data.on_air_at) : null;
}

/** A partida terminou antes de a live abrir (com a folga). */
export function endedBeforeLive(endedAt: string, onAirAt: number | null): boolean {
  return onAirAt !== null && Date.parse(endedAt) < onAirAt - BEFORE_LIVE_MS;
}
