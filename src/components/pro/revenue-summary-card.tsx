// RevenueSummaryCard — card de transparência financeira do PRO.
//
// Server Component: recebe data via props (parent Server Component chama a action).
// Exibe: total revenue, pro earnings, sponsor share, plataforma fee, total sales.
//
// Zero hex hardcoded — apenas tokens semânticos.

import { TrendingUp, DollarSign, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RevenueResult } from "@/app/actions/pro-management";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formata valor em reais BR */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Sub-componente: métrica individual
// ---------------------------------------------------------------------------

function MetricItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-4 rounded-lg border",
        highlight
          ? "bg-brand-primary/5 border-brand-primary/20"
          : "bg-bg-elevated border-border-subtle"
      )}
    >
      <div className="flex items-center gap-2 text-text-muted">
        <Icon size={14} aria-hidden="true" />
        <span className="text-sm uppercase tracking-wider">{label}</span>
      </div>
      <span
        className={cn(
          "text-xl font-mono font-bold",
          highlight ? "text-brand-primary" : "text-text-display"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface RevenueSummaryCardProps {
  /** Dados do revenue (resultado da action getMyProRevenue) */
  revenue: RevenueResult;
  /** Mês/ano exibido no cabeçalho (ex: "Maio 2026") */
  period?: string;
}

/**
 * Card de transparência financeira do PRO.
 * Exibe 4 métricas: revenue total, earnings PRO, sponsor share, total sales.
 *
 * Prop `revenue` vem da Server Action getMyProRevenue — já tipada com RevenueResult.
 */
export function RevenueSummaryCard({
  revenue,
  period,
}: RevenueSummaryCardProps) {
  if (!revenue.success || !revenue.data) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-elevated p-6 text-center text-text-muted text-sm">
        {revenue.error ?? "Dados de revenue indisponíveis."}
      </div>
    );
  }

  const { totalRevenue, proEarnings, sponsorGiven, totalSales, isFirstSaleDone } =
    revenue.data;

  // Fee da plataforma = total - earnings PRO - sponsor pago
  const platformFee = totalRevenue - proEarnings - sponsorGiven;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho do card */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-text-display">
            Revenue
          </h3>
          {period && (
            <p className="text-sm text-text-muted mt-0.5">{period}</p>
          )}
        </div>

        {/* Indicador de status da primeira venda */}
        <span
          className={cn(
            "text-sm px-2 py-0.5 rounded-full border uppercase tracking-wider",
            isFirstSaleDone
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          )}
        >
          {isFirstSaleDone ? "Sponsor pago" : "Aguardando 1a venda"}
        </span>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem
          icon={TrendingUp}
          label="Revenue Total"
          value={formatBRL(totalRevenue)}
          highlight
        />
        <MetricItem
          icon={DollarSign}
          label="Seus Ganhos"
          value={formatBRL(proEarnings)}
        />
        <MetricItem
          icon={Star}
          label="Sponsor Pago"
          value={formatBRL(sponsorGiven)}
        />
        <MetricItem
          icon={Users}
          label="Total Vendas"
          value={String(totalSales)}
        />
      </div>

      {/* Breakdown: fee plataforma */}
      <div className="flex items-center justify-between rounded-md bg-bg-base px-4 py-2 text-sm text-text-muted">
        <span>Fee plataforma</span>
        <span className="font-mono text-text-body">{formatBRL(platformFee)}</span>
      </div>

      {/* Aviso sobre split da primeira venda */}
      {!isFirstSaleDone && (
        <p className="text-sm text-warning/80 bg-warning/5 border border-warning/15 rounded-md px-3 py-2">
          Sua primeira venda reserva parte do revenue ao sponsor que te
          indicou. As vendas seguintes entram no split padrão.
        </p>
      )}
    </div>
  );
}
