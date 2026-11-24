// Intermediário do SFU para o partytracks: autoriza e repassa com o segredo do app (ADR-002).
import { handleRtc, sfuError } from "@/lib/sala/proxy";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; caminho: string[] }> };

async function handle(req: Request, ctx: Params) {
  const { id, caminho } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return sfuError(404, "sala_inexistente", "sala inexistente");
  try {
    return await handleRtc(id, caminho, req);
  } catch (err) {
    // Nunca um 500 vazio: o partytracks lê o corpo como JSON e o navegador pede a faixa de novo.
    console.error("[sala] intermediário do SFU falhou:", err instanceof Error ? err.message : err);
    return sfuError(500, "erro_interno", "falha no servidor da sala");
  }
}

export const POST = handle;
export const PUT = handle;
