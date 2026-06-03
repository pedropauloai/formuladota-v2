// /criar-lobby — criar sala NÃO é mais uma página central: é um POPUP grande centralizado
// (Configurações da Sala) aberto pelo menu "Jogar Dota" → Salas Personalizadas → Criar,
// igual ao cliente do Dota 2. A rota redireciona pra home.

import { redirect } from "next/navigation";

export default function CriarLobbyPage() {
  redirect("/");
}
