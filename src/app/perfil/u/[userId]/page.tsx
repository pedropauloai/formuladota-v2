// /perfil/u/<uuid> — rota LEGADA (todos os links internos ainda apontam pra cá).
// Comportamento: resolve o handle do alvo e REDIRECIONA pra /perfil/<handle>
// (URL bonita na barra de endereço, sem tocar em cada link do app). Sem handle
// (caso raro), renderiza direto a mesma view (fallback). O próprio → /me.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

async function fetchIdentity(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_player_identities")
    .select("username, handle")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { userId } = await props.params;
  const row = await fetchIdentity(userId);
  return { title: row?.username ?? "Perfil — FORMULADOTA" };
}

export default async function PublicProfilePage(props: PageProps) {
  const { userId } = await props.params;
  const { tab } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/"); // perfis são públicos PRA MEMBROS (logados)
  if (user.id === userId) redirect("/me"); // o próprio → /me canônico

  const identity = await fetchIdentity(userId);
  if (!identity) notFound();

  // Upgrade pra URL bonita — o handle existe pra todo mundo (backfill migration 138).
  if (identity.handle) {
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    redirect(`/perfil/${identity.handle}${qs}`);
  }

  // Fallback (sem handle): renderiza aqui mesmo.
  return (
    <ProfileView
      viewerId={user.id}
      userId={userId}
      rawTab={tab}
      currentRoute={`/perfil/u/${userId}`}
    />
  );
}
