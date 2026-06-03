// /lobbies — a lista de salas NÃO é mais uma página central: vive dentro do menu lateral
// "Jogar Dota" (PlayMenu → Salas Personalizadas → Navegar), igual ao cliente do Dota 2.
// A rota redireciona pra home; o usuário abre o menu pra navegar as salas.

import { redirect } from "next/navigation";

export default function LobbiesPage() {
  redirect("/");
}
