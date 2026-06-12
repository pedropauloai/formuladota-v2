// Query rica do perfil do user logado pra /me.
// Consolida profile + steam_link + season MMR numa única função.

import { createClient } from "@/lib/supabase/server";
import { displayName, displayAvatar } from "@/lib/identity";
import { getHeroBySlug, type HeroData } from "@/lib/queries/heroes";
import {
  parseDashboardLayout,
  type DashboardLayout,
} from "@/lib/queries/dashboard-layout";

export interface ProfileForMe {
  userId: string;
  username: string | null; // nick canônico via lib/identity (Steam > Discord)
  avatarUrl: string | null; // avatar canônico via lib/identity (Steam > custom > Discord)
  statusMessage: string | null;
  heroPortraitSlug: string | null;
  heroPortraitData: HeroData | null; // hero data resolvido ou null se slug inválido/vazio
  favoriteHeroes: HeroData[]; // até 3 heróis resolvidos
  behaviorStatus: string | null;
  doctrineAcceptedAt: string | null;
  lastSeenAt: string | null;
  steamPersona: string | null;
  steamId64: string | null;
  // Stats season
  mmr: number | null;
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  // Layout dos widgets do /me (sempre válido — fallback pra DEFAULT_LAYOUT)
  dashboardLayout: DashboardLayout;
}

/**
 * Retorna profile expandido do user logado pra renderização do /me.
 * Retorna null se não autenticado.
 */
export async function getProfileForMe(): Promise<ProfileForMe | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: steamLink }, { data: season }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "username, avatar_url, status_message, hero_portrait_slug, favorite_heroes, avatar_custom_url, last_seen_at, behavior_status, doctrine_accepted_at, dashboard_layout"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("steam_links")
        .select("steam_id_64, persona, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("seasons").select("id").eq("active", true).maybeSingle(),
    ]);

  let mmrRow: {
    mmr: number;
    vitorias: number;
    derrotas: number;
    partidas_total: number;
  } | null = null;

  if (season?.id) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .maybeSingle();
    mmrRow = data ?? null;
  }

  // Identidade canônica (lei do pacote de identidade, Pedro 2026-06-12): com
  // Steam vinculada, foto e nick vêm SEMPRE da Steam — resolvido via lib/identity.
  // O avatar custom do app continua valendo como fallback ACIMA do Discord,
  // mas nunca acima da Steam (por isso entra no slot "discordAvatar").
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile?.username,
    discordAvatar: profile?.avatar_custom_url ?? profile?.avatar_url,
  };
  const username = displayName(identitySrc);
  const avatarUrl = displayAvatar(identitySrc);

  // Resolve hero_portrait_slug → HeroData
  const heroPortraitSlug = profile?.hero_portrait_slug ?? null;
  const heroPortraitData = heroPortraitSlug ? getHeroBySlug(heroPortraitSlug) : null;

  // Resolve favorite_heroes (JSONB array) → HeroData[]
  const favSlugs = Array.isArray(profile?.favorite_heroes)
    ? (profile.favorite_heroes as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];
  const favoriteHeroes = favSlugs
    .map((slug) => getHeroBySlug(slug))
    .filter((h): h is HeroData => h !== null);

  return {
    userId: user.id,
    username,
    avatarUrl,
    statusMessage: profile?.status_message ?? null,
    heroPortraitSlug,
    heroPortraitData,
    favoriteHeroes,
    behaviorStatus: profile?.behavior_status ?? null,
    doctrineAcceptedAt: profile?.doctrine_accepted_at ?? null,
    lastSeenAt: profile?.last_seen_at ?? null,
    steamPersona: steamLink?.persona ?? null,
    steamId64: steamLink?.steam_id_64 ?? null,
    mmr: mmrRow?.mmr ?? null,
    partidas: mmrRow?.partidas_total ?? null,
    vitorias: mmrRow?.vitorias ?? null,
    derrotas: mmrRow?.derrotas ?? null,
    dashboardLayout: parseDashboardLayout(profile?.dashboard_layout),
  };
}
