// Lista de canais do servidor FORMULADOTA para a coluna da esquerda: canais de texto e de voz, quem
// está em cada canal de voz e as salas privadas da pessoa. Pede login e a flag ligada.
import { authInfo, salaFlagOn } from "@/lib/sala/contexto";
import { listaDeCanais } from "@/lib/sala/lista-canais";
import { deniedResponse, noStore } from "@/lib/sala/rota";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const [auth, flagOn] = await Promise.all([authInfo(), salaFlagOn(now)]);
  if (!flagOn) return deniedResponse("flag_desligada");
  if (!auth) return deniedResponse("sem_login");
  try {
    return Response.json(await listaDeCanais(createServiceClient(), auth.userId, now), noStore);
  } catch (err) {
    console.error("[sala] lista de canais:", err instanceof Error ? err.message : err);
    return Response.json({ errorCode: "erro_interno" }, { status: 500 });
  }
}
