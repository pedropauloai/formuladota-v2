// /lobbies/[id] — agora redireciona pro /dashboard?play=lobby&id={id} pra abrir
// o PlayPanel já na sala específica. A sala deixou de ser página independente
// e virou estado interno do PlayPanel (espelha cliente Dota 2).

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LobbyDetailPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/dashboard?play=lobby&id=${id}`);
}
