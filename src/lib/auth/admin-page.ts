import "server-only";

// Conferência de admin feita pela própria página. O layout do /admin não serve de barreira: numa
// navegação parcial o Next pode desenhar só a página, sem rodar o layout, e várias páginas leem
// com a chave de serviço. Por isso toda página do admin chama esta função antes de ler qualquer dado.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";

/** Devolve o id do admin logado; quem não é admin (ou está no modo de prévia) é mandado embora. */
export async function requireAdminPage(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, previewActive] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
    getPreviewModeActive(),
  ]);
  if (profile?.is_admin !== true || previewActive) redirect("/dashboard");
  return user.id;
}
