// /lobbies/[id] — a sala NÃO é mais uma página central: vive dentro do menu lateral
// "Jogar Dota" (PlayMenu → Salas → Navegar → sala), igual ao cliente do Dota 2.
// A rota redireciona pra home; entrar numa sala acontece pelo menu.

import { redirect } from "next/navigation";

export default function LobbyDetailPage() {
  redirect("/");
}
