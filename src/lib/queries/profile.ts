// Query rica do perfil do user logado pra /me.
// Consolida profile + steam_link + season MMR numa única função.

import { createClient } from "@/lib/supabase/server";
import { displayName, displayAvatar } from "@/lib/identity";
import { getHeroBySlug, type HeroData } from "@/lib/queries/heroes";
import {
  parseDashboardLayout,
  type DashboardLayout,
} from "@/lib/queries/dashboard-layout";
import { SOCIAL_KEYS, type SocialLinks } from "@/components/profile/social-icons-row";

/** Coerção segura de jsonb → SocialLinks: só chaves conhecidas + valores string. */
function parseSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const v = src[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  return out;
}

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
  // Já registrou o nick oficial? (uso único do editor de nick)
  officialNickSet: boolean;
  // Redes sociais registradas (rede → URL do perfil). Discord vem do login.
  socialLinks: SocialLinks;
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
          "username, avatar_url, status_message, hero_portrait_slug, favorite_heroes, avatar_custom_url, last_seen_at, behavior_status, doctrine_accepted_at, dashboard_layout, official_nick_set, social_links"
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
    officialNickSet: profile?.official_nick_set ?? false,
    socialLinks: parseSocialLinks(profile?.social_links),
  };
}

/**
 * Mesma forma do getProfileForMe, mas pra QUALQUER user (perfil público).
 * Lê só campos públicos via RPC get_public_profile (migration 065, SECURITY
 * DEFINER) — profiles tem RLS self. dashboardLayout cai no DEFAULT (sem edição
 * pública). Retorna null se o user não existir.
 */
export async function getPublicProfile(
  userId: string
): Promise<ProfileForMe | null> {
  const supabase = await createClient();
  const [{ data }, { data: idRow }] = await Promise.all([
    supabase.rpc("get_public_profile", { p_user_id: userId }),
    // social_links não vem no RPC legado → lê da view pública de identidade.
    supabase
      .from("public_player_identities")
      .select("social_links")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  const r = (data ?? [])[0];
  if (!r) return null;

  const identitySrc = {
    steamPersona: r.steam_persona,
    steamAvatar: r.steam_avatar,
    discordUsername: r.username,
    discordAvatar: r.avatar_custom_url ?? r.avatar_url,
  };

  const heroPortraitSlug = r.hero_portrait_slug ?? null;
  const heroPortraitData = heroPortraitSlug ? getHeroBySlug(heroPortraitSlug) : null;
  const favSlugs = Array.isArray(r.favorite_heroes)
    ? (r.favorite_heroes as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const favoriteHeroes = favSlugs
    .map((slug) => getHeroBySlug(slug))
    .filter((h): h is HeroData => h !== null);

  return {
    userId,
    username: displayName(identitySrc),
    avatarUrl: displayAvatar(identitySrc),
    statusMessage: r.status_message ?? null,
    heroPortraitSlug,
    heroPortraitData,
    favoriteHeroes,
    behaviorStatus: r.behavior_status ?? null,
    doctrineAcceptedAt: r.doctrine_accepted_at ?? null,
    lastSeenAt: r.last_seen_at ?? null,
    steamPersona: r.steam_persona ?? null,
    steamId64: r.steam_id_64 ?? null,
    mmr: r.mmr ?? null,
    partidas: r.partidas_total ?? null,
    vitorias: r.vitorias ?? null,
    derrotas: r.derrotas ?? null,
    dashboardLayout: parseDashboardLayout(null),
    officialNickSet: true, // perfil público não edita nick → trata como já definido
    socialLinks: parseSocialLinks(idRow?.social_links),
  };
}
