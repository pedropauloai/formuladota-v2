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
  if (!allowRequest("fila-minha", clientIp(request.headers), 120, 60_000)) {
    return NextResponse.json({ error: "muitas" }, { status: 429, headers: NO_STORE });
  }
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) return NextResponse.json({ error: "fechada" }, { status: 404, headers: NO_STORE });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await getQueueState(user.id), { headers: NO_STORE });
  } catch (err) {
    console.error("[fila] ler a vez falhou:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "indisponivel" }, { status: 503, headers: NO_STORE });
  }
}
