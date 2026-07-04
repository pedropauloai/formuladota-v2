// /perfil/<handle> — perfil PÚBLICO canônico, com URL legível (ex.: /perfil/pedropaulo)
// em vez do UUID. Resolve handle → user_id via public_player_identities (fonte pública,
// contorna a RLS de profiles) e renderiza a MESMA view do /perfil/u/<uuid> (ProfileView).
// O próprio user cai no /me canônico.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// Resolve o handle (case-insensitive) → id + nome. null se não existir.
async function resolveHandle(handle: string) {
  const supabase = await createClient();
  const slug = decodeURIComponent(handle).toLowerCase();
  const { data } = await supabase
    .from("public_player_identities")
    .select("id, username")
    .eq("handle", slug)
    .maybeSingle();
  return data ?? null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { handle } = await props.params;
  const row = await resolveHandle(handle);
  return { title: row?.username ?? "Perfil — FORMULADOTA" };
}

export default async function ProfileByHandlePage(props: PageProps) {
  const { handle } = await props.params;
  const { tab } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/"); // perfis são públicos PRA MEMBROS (logados)

  const row = await resolveHandle(handle);
  if (!row) notFound();
  if (user.id === row.id) redirect("/me"); // o próprio → /me canônico

  return (
    <ProfileView
      viewerId={user.id}
      userId={row.id}
      rawTab={tab}
      currentRoute={`/perfil/${handle}`}
    />
  );
}
