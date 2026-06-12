// /pro — COCKPIT do PRO (reescrito 2026-06-12, aprovado Pedro).
//
// Era um empilhado de 6 seções (coordenação, stats, alunos, pricing, revenue,
// status) espalhadas com rolagem. Virou UMA tela de gestão de fila guiada por
// estado: centro = A FILA AO VIVO (status + lista densa LRU + caixa do dia),
// direita = painel de AÇÃO (abrir fila / montar+iniciar PT / finalizar PT com
// validação anti-Turbo + enriquecimento OpenDota automático).
//
// Alunos detalhados continuam em /pro/students; visão admin em /admin/pros.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProStatusActions } from "./pro-status-actions";
import { getMyProRevenue } from "@/app/actions/pro-management";
import { getProCockpitData } from "./cockpit-data";
import { ProCockpit } from "./pro-cockpit";

export const metadata: Metadata = {
  title: "Cockpit PRO — FORMULADOTA",
  description: "Gerencie sua fila, inicie PTs e acompanhe seus ganhos.",
};

// Estado da fila muda em tempo real no client; snapshot fresco por request.
export const revalidate = 0;

export default async function ProPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Promo é OPCIONAL (2026-06-12): coach sem pro_promotion (Pedro/founder)
  // usa o cockpit normalmente — só as ações de pausar/retomar dependem dela.
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .maybeSingle();
  const isActive = promo?.status === "active";

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, fila_aberta, fila_aberta_em, fila_max_vagas")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <p className="max-w-sm text-center font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
          Seu cadastro de coach ainda não foi criado. Fale com o admin.
        </p>
      </main>
    );
  }

  // Snapshot inicial do cockpit + revenue do mês (rodapé), em paralelo
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  const [initial, revenueResult] = await Promise.all([
    getProCockpitData(coach),
    getMyProRevenue(firstDayOfMonth),
  ]);
  // proEarnings = parte do PRO (split 85%) no mês corrente
  const monthBrl =
    revenueResult.success && revenueResult.data
      ? revenueResult.data.proEarnings
      : null;

  return (
    <main className="h-full min-h-0">
      <ProCockpit
        initial={initial}
        footerExtras={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {monthBrl !== null && (
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
                Mês:{" "}
                <span className="tabular-nums text-gold">
                  R$ {monthBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </p>
            )}
            <Link
              href="/pro/students"
              className="font-display text-sm font-semibold uppercase tracking-widest text-text-faded underline-offset-2 hover:text-text-body hover:underline"
            >
              Meus alunos →
            </Link>
            {promo && <ProStatusActions isActive={isActive} />}
          </div>
        }
      />
    </main>
  );
}
