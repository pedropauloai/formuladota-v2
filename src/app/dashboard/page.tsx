// /dashboard — redirect pra / (HUB central canônico).
//
// Pedro 2026-05-24: filosofia "tudo é client" — / é a URL canônica do HUB.
// /dashboard fica como backward compat redirect.
// Bookmarks antigos, links externos e Server Actions que apontavam pra
// /dashboard continuam funcionando.

import { redirect } from "next/navigation";

export default function DashboardRedirect(): never {
  redirect("/");
}
