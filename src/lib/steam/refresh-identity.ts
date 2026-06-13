// Refresh do snapshot de identidade Steam (persona + avatar) — server-only.
//
// PROBLEMA QUE RESOLVE (pacote de identidade, Pedro 2026-06-12): steam_links
// guarda persona/avatar_url como SNAPSHOT do dia do vínculo. Sem refresh, o
// perfil mostra nick/foto ANTIGOS da Steam pra sempre.
//
// Este util re-busca GetPlayerSummaries (Steam Web API, via fetchSteamPersona —
// a STEAM_WEB_API_KEY nunca chega ao client) e atualiza o snapshot no banco.
//
// USO: fire-and-forget no carregamento do /me — `void refreshSteamIdentity(id)`,
// sem await. Visita ao próprio perfil mantém a identidade fresca na PRÓXIMA
// renderização. Falha SILENCIOSA por design: Steam API fora do ar nunca quebra
// a página (o snapshot antigo continua valendo até o próximo refresh).
//
// RLS: usa o client cookie-based — policy "users manage own steam_link"
// (migration 005) permite o UPDATE porque auth.uid() = user_id.

import { createClient } from "@/lib/supabase/server";
import { fetchSteamPersona } from "@/lib/steam";

/**
 * Atualiza steam_links.persona e steam_links.avatar_url do user com os dados
 * frescos da Steam. No-op se o user não tem Steam vinculada. Nunca lança.
 * `force` fura o cache de 1h da API (botão "Sincronizar com a Steam").
 * Retorna true se algo foi atualizado (feedback do botão).
 */
export async function refreshSteamIdentity(
  userId: string,
  opts?: { force?: boolean }
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: link } = await supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    // Sem Steam vinculada — nada a atualizar
    if (!link) return false;

    const fresh = await fetchSteamPersona(link.steam_id_64, opts);

    // Nada mudou → evita um write no banco a cada visita ao /me
    if (fresh.persona === link.persona && fresh.avatarUrl === link.avatar_url) {
      return false;
    }

    await supabase
      .from("steam_links")
      .update({ persona: fresh.persona, avatar_url: fresh.avatarUrl })
      .eq("user_id", userId);
    return true;
  } catch {
    // Silêncio intencional — refresh é best-effort, a página nunca quebra.
    return false;
  }
}
