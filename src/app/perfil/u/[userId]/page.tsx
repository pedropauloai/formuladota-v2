// /perfil/u/[userId] — resolve userId → perfil público canônico (/perfil/[steamid64]).
//
// Os componentes da plataforma (fila, partida, amigos…) só conhecem o userId, mas
// o perfil público completo é roteado por steam_id_64. Esta rota faz a ponte: lê
// o steam_links (SELECT público) e redireciona. Sem Steam vinculada → 404 (o
// perfil público depende da identidade Steam; anti-anonimato).

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileByUserId({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("steam_links")
    .select("steam_id_64")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.steam_id_64) {
    redirect(`/perfil/${data.steam_id_64}`);
  }
  notFound();
}
