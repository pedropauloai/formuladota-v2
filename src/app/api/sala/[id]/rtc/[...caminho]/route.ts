// Intermediário do SFU para o partytracks: autoriza e repassa com o segredo do app (ADR-002).
import { handleRtc, sfuError } from "@/lib/sala/proxy";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; caminho: string[] }> };

async function handle(req: Request, ctx: Params) {
  const { id, caminho } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return sfuError(404, "sala_inexistente", "sala inexistente");
  return handleRtc(id, caminho, req);
}

export const POST = handle;
export const PUT = handle;
