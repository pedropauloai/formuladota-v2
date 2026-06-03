import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renomeou "middleware" → "proxy". Comportamento idêntico.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Pula assets estáticos, imagens E áudio (/sounds/*.webm do SoundManager) — só
    // roda em rotas reais. Sem isso, o sprite de som era gateado e redirecionado pro
    // Discord OAuth quando deslogado → CORS ("Falha ao carregar sprite").
    "/((?!_next/static|_next/image|favicon.ico|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp3|ogg|wav|ico)$).*)",
  ],
};
