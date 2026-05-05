// /lobbies — agora redireciona pro /dashboard?play=lobbies-list pra abrir
// o PlayPanel já na lista de salas. A lista deixou de ser página independente
// e virou estado interno do PlayPanel (espelha cliente Dota 2).

import { redirect } from "next/navigation";

export default function LobbiesPage() {
  redirect("/dashboard?play=lobbies-list");
}
