import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAndFetchSteam } from "@/lib/steam";
import { seedSeasonMmrForUser } from "@/lib/queries/seed-season-mmr";

// Callback do Steam OpenID 2.0 — Steam redireciona aqui após user autorizar.
// Esta rota está em AUTH_FLOW_PATHS no middleware → não é bloqueada
// por enforcement de doutrina/Steam (sem isso entraríamos em loop).
//
// Helper validateAndFetchSteam (src/lib/steam.ts) faz CSRF check +
// anti-spoofing + persona fetch num único call — mantém este handler enxuto.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=login_required_for_steam`);
  }

  // Lê + apaga cookie CSRF (one-shot — não fica órfão em sucesso ou erro)
  const jar = await cookies();
  const expectedState = jar.get("steam_csrf_state")?.value ?? "";
  jar.delete("steam_csrf_state");

  try {
    const profile = await validateAndFetchSteam(searchParams, expectedState);

    const { error: dbErr } = await supabase.from("steam_links").upsert(
      {
        user_id: user.id,
        steam_id_64: profile.steamId64,
        persona: profile.persona,
        avatar_url: profile.avatarUrl,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (dbErr) {
      console.error("[steam/callback] upsert steam_links:", dbErr.message);
      return NextResponse.redirect(`${origin}/vincular/steam?error=db_failed`);
    }

    // Semeia o MMR de temporada pela medalha Valve (busca o career na OpenDota).
    // Best-effort: nunca quebra o vínculo — sem isto a medalha FORMULADOTA sai
    // como Arauto/placeholder até a 1ª partida. Ver src/lib/queries/seed-season-mmr.
    await seedSeasonMmrForUser(user.id, { fetchCareer: true });

    return NextResponse.redirect(`${origin}/vincular/steam?ok=1`);
  } catch (err) {
    const code = err instanceof Error ? err.message : "validate_failed";
    const errorParam =
      code === "csrf_mismatch" ? "csrf"
      : code.includes("Web API") ? "persona_unavailable"
      : "invalid_signature";
    console.error("[steam/callback] falha:", code);
    return NextResponse.redirect(`${origin}/vincular/steam?error=${errorParam}`);
  }
}
