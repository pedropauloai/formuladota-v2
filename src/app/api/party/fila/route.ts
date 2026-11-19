// GET /api/party/fila: a fila da party em JSON, para os overlays da live (fonte de navegador do OBS)
// e para quem acompanha a página sem login. Nome público e números: sem id de usuário nem contato.
// CORS aberto porque o overlay roda na máquina do Pedro (http://localhost). Formato em model.ts.

import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { getPublicQueue } from "@/lib/loja/fila/server";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export async function GET(request: Request) {
  // Freio de abuso por IP, largo: na operadora de celular muita gente sai pelo mesmo IP (CGNAT),
  // e quem acompanha sem login consulta a cada 8 s; o overlay, a cada poucos segundos.
  if (!allowRequest("fila", clientIp(request.headers), 1200, 60_000)) {
    return NextResponse.json({ error: "muitas" }, { status: 429, headers: CORS });
  }
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) return NextResponse.json({ error: "fechada" }, { status: 404, headers: CORS });
  try {
    const queue = await getPublicQueue();
    return NextResponse.json(queue, { headers: { ...CORS, "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[fila] ler a fila pública falhou:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "indisponivel" }, { status: 503, headers: CORS });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
