// /pro — APOSENTADA como página (Pedro 2026-06-12): o PRO gerencia a própria
// fila DIRETO no /ranked-com-pro (o card dele vira cockpit — modo gestão no
// ProMasterDetail). Redirect mantido pra links/bookmarks antigos.
// Os componentes do cockpit seguem vivos em src/app/pro/cockpit-* (importados
// pelo master-detail); /pro/students continua acessível; visão admin de todos
// os PROs continua em /admin/pros.

import { redirect } from "next/navigation";

export default function ProPageRedirect() {
  redirect("/ranked-com-pro");
}
