// GET /api/party/fila/minha: a fila pública e a vez de quem está logado (posição, chamada, Pix
// pendente). A página da fila consulta a cada poucos segundos. Sem CORS: só o próprio site lê.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { getQueueState } from "@/lib/loja/fila/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  // Sem login, o freio é por IP; com login, por pessoa: na operadora de celular muita gente sai pelo
  // mesmo IP (CGNAT), e o limite por IP congelaria a posição de quem está na fila.
  if (!allowRequest("fila-minha-ip", clientIp(request.headers), 1200, 60_000)) {
    return NextResponse.json({ error: "muitas" }, { status: 429, headers: NO_STORE });
  }
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) return NextResponse.json({ error: "fechada" }, { status: 404, headers: NO_STORE });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401, headers: NO_STORE });
  // A página consulta a cada 3 s (20 por minuto); 60 por minuto deixa folga para abas abertas.
  if (!allowRequest("fila-minha", user.id, 60, 60_000)) return NextResponse.json({ error: "muitas" }, { status: 429, headers: NO_STORE });
  try {
    return NextResponse.json(await getQueueState(user.id), { headers: NO_STORE });
  } catch (err) {
    console.error("[fila] ler a vez falhou:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "indisponivel" }, { status: 503, headers: NO_STORE });
  }
}
