// /admin/loja/fila: o Pedro opera a fila da party durante a live (abrir e encerrar a live, chamar,
// marcar quem jogou; joga quem está presente). O layout /admin barra quem não é admin.

import { getAdminQueue } from "@/lib/loja/fila/admin";
import { getMatchHistory } from "@/lib/loja/fila/admin-history";
import { isTestMode } from "@/lib/mercadopago";
import { listPpaAccounts } from "@/lib/loja/ppa-accounts";
import { AdminQueuePanel } from "./panel";
import { requireAdminPage } from "@/lib/auth/admin-page";

export const metadata = { title: "Fila da party | Admin FORMULADOTA" };
export const dynamic = "force-dynamic";

export default async function AdminFilaPage() {
  await requireAdminPage();
  const [data, history, accounts] = await Promise.all([getAdminQueue(), getMatchHistory(isTestMode()), listPpaAccounts().catch(() => [])]);
  return <AdminQueuePanel data={data} history={history} accounts={accounts} />;
}
