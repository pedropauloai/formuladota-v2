// /assinatura → /planos (redirect PERMANENTE de compatibilidade).
//
// Fusão 2026-07-04: /assinatura duplicava a vitrine /planos FORA do
// ClientShell (violação da filosofia "tudo é client", 2026-05-24). A rota
// canônica é /planos. Este redirect fica porque assinaturas MP PENDENTES
// antigas têm back_url apontando pra /assinatura?success=1 — preservamos os
// query params (?success/?cancelled/?error/?info) no repasse.

import { permanentRedirect } from "next/navigation";

export default async function AssinaturaRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  permanentRedirect(`/planos${suffix}`);
}
