// /lobbies — agora redireciona pro /ranked-com-pro?play=lobbies-list pra abrir
// o PlayPanel já na lista de salas. A lista deixou de ser página independente
// e virou estado interno do PlayPanel (espelha cliente Dota 2). O PlayPanel
// agora mora dentro da rota dedicada /ranked-com-pro (sistema de matchmaking).

import { redirect } from "next/navigation";

export default function LobbiesPage() {
  redirect("/ranked-com-pro?play=lobbies-list");
}
