// /admin/loja/fila: o Pedro opera a fila da party durante a live (abrir e encerrar a live, chamar,
// marcar quem jogou, pular quem não apareceu). O layout /admin barra quem não é admin.

import { getAdminQueue } from "@/lib/loja/fila/admin";
import { AdminQueuePanel } from "./panel";

export const metadata = { title: "Fila da party | Admin FORMULADOTA" };
export const dynamic = "force-dynamic";

export default async function AdminFilaPage() {
  const data = await getAdminQueue();
  return <AdminQueuePanel data={data} />;
}
