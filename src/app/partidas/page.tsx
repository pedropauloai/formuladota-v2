// /partidas — saldo mínimo do user logado na Phase 2.
// Phase 2 entrega saldo + lista de compras pagas; calendário de agendamento vem na Phase 3.
//
// Type safety (C1): usa 2 queries separadas (purchases + packages) em vez de join tipado.
// O join packages(nome) no Supabase JS requer Relationships[] definido na tabela,
// que não é gerado sem a Supabase CLI. A abordagem 2-query é mais segura e igualmente eficiente.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { SaldoCard } from "@/components/partidas/saldo-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientShell } from "@/components/client-shell/shell";

export const metadata: Metadata = {
  title: "Minhas Partidas — FORMULADOTA",
};

// Tipo derivado do schema gerado — sem cast, sem any.
type PurchaseRow = Tables<"purchases">;
type PackageRow = Tables<"packages">;

export default async function PartidasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive — middleware já enforça login + aceite. Mas se algo passar, redirect.
  if (!user) redirect("/");

  // Query 1: purchases pagas do user (RLS garante user_id = auth.uid())
  const { data: purchasesData, error: purchasesError } = await supabase
    .from("purchases")
    .select("id, status, preco_pago, partidas_compradas, partidas_usadas, sessoes_compradas, sessoes_usadas, data_compra, package_id")
    .eq("status", "pago")
    .order("data_compra", { ascending: false });

  if (purchasesError) {
    console.error("[/partidas] erro ao buscar compras:", purchasesError.message);
  }

  const compras: Pick<
    PurchaseRow,
    "id" | "status" | "preco_pago" | "partidas_compradas" | "partidas_usadas" | "sessoes_compradas" | "sessoes_usadas" | "data_compra" | "package_id"
  >[] = purchasesData ?? [];

  // Query 2: pacotes referenciados pelas compras (apenas os IDs únicos encontrados)
  const packageIds = [...new Set(compras.map((c) => c.package_id))];

  const packagesMap = new Map<string, Pick<PackageRow, "id" | "nome">>();

  if (packageIds.length > 0) {
    const { data: packagesData } = await supabase
      .from("packages")
      .select("id, nome")
      .in("id", packageIds);

    if (packagesData) {
      for (const pkg of packagesData) {
        packagesMap.set(pkg.id, pkg);
      }
    }
  }

  // Agregação de saldo: SUM(compradas - usadas) sobre todas as compras pagas
  const partidasDisponiveis = compras.reduce(
    (sum, p) => sum + (p.partidas_compradas - p.partidas_usadas),
    0
  );
  const sessoesDisponiveis = compras.reduce(
    (sum, p) => sum + (p.sessoes_compradas - p.sessoes_usadas),
    0
  );

  const semSaldo = partidasDisponiveis === 0 && sessoesDisponiveis === 0;

  return (
    <ClientShell currentRoute="/partidas">
      <div className="px-4 py-10 mx-auto max-w-4xl">
        <header className="mb-8 space-y-3">
          <p className="font-display text-sm uppercase tracking-[0.4em] text-brand-primary">
            Minhas partidas
          </p>
          <h1 className="font-display text-4xl uppercase tracking-wide text-text-display">
            Seu saldo
          </h1>
          <p className="text-text-muted">
            Saldo disponível para agendar partidas e sessões com o coach.
          </p>
        </header>

        <SaldoCard
          partidasDisponiveis={partidasDisponiveis}
          sessoesDisponiveis={sessoesDisponiveis}
        />

        {semSaldo && (
          <div className="mt-8">
            <EmptyState
              title="Sem saldo ainda"
              description="Você ainda não tem partidas ou sessões disponíveis. Conheça os pacotes e comece sua mentoria."
              icon={ShoppingBag}
              principle={5}
              action={
                <Link
                  href="/pacotes"
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] bg-brand-primary px-8 font-display text-sm font-bold uppercase tracking-widest text-text-display shadow-[var(--glow-brand)] transition-colors hover:bg-brand-primary-hover"
                >
                  Ver pacotes
                </Link>
              }
            />
          </div>
        )}

        {!semSaldo && compras.length > 0 && (
          <section className="mt-10" aria-label="Histórico de compras">
            <h2 className="font-display text-base uppercase tracking-widest text-text-display mb-4">
              Compras pagas
            </h2>
            <ul className="space-y-3">
              {compras.map((p) => {
                const partidasRest = p.partidas_compradas - p.partidas_usadas;
                const sessoesRest = p.sessoes_compradas - p.sessoes_usadas;
                const dataCompra = new Date(p.data_compra).toLocaleDateString(
                  "pt-BR"
                );
                const packageNome =
                  packagesMap.get(p.package_id)?.nome ?? "Pacote";

                return (
                  <li key={p.id}>
                    <Card variant="flat">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-text-display font-medium">
                            {packageNome}
                          </p>
                          <p className="text-sm text-text-muted">
                            #{p.id.slice(0, 8)} &bull; {dataCompra}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {partidasRest > 0 && (
                            <Badge variant="outline">
                              {partidasRest} partida{partidasRest === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {sessoesRest > 0 && (
                            <Badge variant="outline">
                              {sessoesRest} sess{sessoesRest === 1 ? "ão" : "ões"}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </ClientShell>
  );
}
