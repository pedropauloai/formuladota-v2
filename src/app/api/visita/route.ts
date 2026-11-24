// POST /api/visita: grava a visita uma vez por sessão (site_visits), cada página nova por onde a
// sessão passa (site_pageviews, o funil da home) e devolve o cookie de origem (fd_origem), que o
// pedido da loja copia. Sem IP, sem e-mail: só caminho, UTM, domínio de onde veio e país
// (cabeçalho da Cloudflare).

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import {
  ORIGIN_COOKIE,
  ORIGIN_MAX_AGE_S,
  mergeOrigin,
  originFromCookieHeader,
  originFromUrl,
  serializeOrigin,
} from "@/lib/loja/attribution";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { pageviewPath } from "@/lib/funil/paginas";

const bodySchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  url: z.string().url().max(2000),
  referrer: z.string().max(2000).nullish(),
});

// Robô e pré-visualização de link (Discord, WhatsApp, Instagram) não contam como visita.
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|discordbot|headless|lighthouse/i;

function siteHosts(): string[] {
  const own = new URL(publicEnv.NEXT_PUBLIC_SITE_URL).hostname;
  return [own, "formuladota.com.br", "www.formuladota.com.br", "localhost", "127.0.0.1"];
}

export async function POST(request: Request): Promise<Response> {
  // Uma chamada por página nova da aba: 60 por minuto cobre quem navega rápido.
  if (!allowRequest("visita", clientIp(request.headers), 60, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 204, headers: { "x-visita": "ignorada" } });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const url = new URL(parsed.data.url);
  const current = originFromUrl(url, parsed.data.referrer, siteHosts());
  const origin = mergeOrigin(originFromCookieHeader(request.headers.get("cookie")), current);
  // Fora do domínio de produção (localhost, teste de ponta a ponta) a visita não conta no painel.
  const isTest = !publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://");
  const db = createServiceClient();

  const { error } = await db
    .from("site_visits")
    .upsert(
      {
        session_id: parsed.data.sessionId,
        path: current.landing_path ?? "/",
        utm_source: current.utm_source ?? null,
        utm_medium: current.utm_medium ?? null,
        utm_campaign: current.utm_campaign ?? null,
        utm_content: current.utm_content ?? null,
        utm_term: current.utm_term ?? null,
        referrer_host: current.referrer_host ?? null,
        country: request.headers.get("cf-ipcountry")?.slice(0, 2) ?? null,
        is_test: isTest,
      },
      // A mesma sessão volta com UTM nova ou em outra página: a visita não duplica, só o cookie muda.
      { onConflict: "session_id", ignoreDuplicates: true }
    );
  if (error) console.error("[visita] gravar falhou:", error.message);

  // A primeira passagem da sessão por este caminho: o funil conta quem chega à fila.
  const { error: pageError } = await db
    .from("site_pageviews")
    .upsert(
      { session_id: parsed.data.sessionId, path: pageviewPath(url), is_test: isTest },
      { onConflict: "session_id,path", ignoreDuplicates: true }
    );
  if (pageError) console.error("[visita] gravar página falhou:", pageError.message);

  const response = new NextResponse(null, { status: 204, headers: { "x-visita": error ? "falhou" : "gravada" } });
  response.cookies.set(ORIGIN_COOKIE, serializeOrigin(origin), {
    path: "/",
    maxAge: ORIGIN_MAX_AGE_S,
    sameSite: "lax",
    httpOnly: true,
    secure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
  });
  return response;
}
