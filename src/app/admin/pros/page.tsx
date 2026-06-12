// /admin/pros — visão ADMIN de TODOS os PROs (suporte/emergência).
//
// ≠ do cockpit do PRO (/ranked-com-pro, card próprio): aqui Pedro age SOBRE
// qualquer coach — forçar fila, remover aluno de qualquer fila, confirmar ou
// cancelar PT em curso, re-enriquecer histórico. Master-detail sem rolagem
// de página (AdminProsMasterDetail).
//
// Gate: o layout /admin já valida is_admin server-side; revalidamos aqui
// (defesa em camadas — a page nunca depende só do layout pai).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminProsData } from "./admin-pros-data";
import { AdminProsMasterDetail } from "./admin-pros-master-detail";

export const metadata = { title: "PROs — Admin FORMULADOTA" };

export default async function AdminProsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const initial = await getAdminProsData();

  return <AdminProsMasterDetail initial={initial} />;
}
