// /perfil — ALIAS LEGADO. O perfil canônico é o /me (perfil rico estilo Dota 2,
// ProfilePage com abas). A antiga página de conta em /perfil foi aposentada
// (sair da conta vive no top-bar/mobile-nav; identidade/stats vivem no /me).
// Mantido só pra não quebrar links/redirects antigos: bounce pro /me.

import { redirect } from "next/navigation";

export default function PerfilRedirect() {
  redirect("/me");
}
