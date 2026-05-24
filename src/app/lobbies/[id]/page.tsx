// /lobbies/[id] — agora redireciona pro /ranked-com-pro?play=lobby&id={id} pra
// abrir o PlayPanel já na sala específica. A sala deixou de ser página
// independente e virou estado interno do PlayPanel (espelha cliente Dota 2).
// O PlayPanel agora mora dentro da rota dedicada /ranked-com-pro.

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LobbyDetailPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/ranked-com-pro?play=lobby&id=${id}`);
}
