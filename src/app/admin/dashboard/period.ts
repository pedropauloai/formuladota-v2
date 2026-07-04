// Períodos do dashboard admin — módulo COMPARTILHADO (sem "use client").
//
// PRECISA viver fora do period-filter.tsx: exportar valores de um módulo
// "use client" e importá-los num Server Component entrega client references
// (proxies), não o array real — `PERIODS.includes(...)` explodia em produção
// com "PERIODS.includes is not a function".

export const PERIODS = ["this_month", "last_month", "30d", "90d", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  this_month: "Este mês",
  last_month: "Mês passado",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  custom: "Personalizado",
};
