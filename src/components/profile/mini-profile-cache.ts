// O perfil público curto de cada pessoa, guardado no navegador por 2 minutos: o cartão que abre ao
// passar o mouse e o menu do botão direito leem daqui, sem refazer a consulta a cada vez.

import { getPublicMiniProfile, type PublicMiniProfile } from "@/actions/public-profile";

const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { data: PublicMiniProfile | null; at: number }>();

export async function fetchMini(userId: string): Promise<PublicMiniProfile | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await getPublicMiniProfile(userId);
  cache.set(userId, { data, at: Date.now() });
  return data;
}

/** Depois de uma ação que muda a amizade, a próxima leitura busca de novo. */
export function forgetMini(userId: string): void {
  cache.delete(userId);
}
