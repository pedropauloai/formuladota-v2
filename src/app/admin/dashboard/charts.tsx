"use client";

// Gráficos do dashboard admin (Recharts) — FASE 5, 2026-07-04.
// Cores via tokens semânticos (CSS vars) — nada hardcoded (C14-C20).

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface DailyPoint {
  day: string; // "2026-07-01"
  [serie: string]: string | number;
}

const GRID = "var(--color-border-subtle, #26282e)";
const TEXT = "var(--color-text-faded, #8a8f98)";
const GOLD = "var(--color-gold, #c9a227)";
const BRAND = "var(--color-brand-primary, #C42121)";
const PLAY = "var(--color-success, #00C466)";

const AXIS = { stroke: TEXT, fontSize: 11, fontFamily: "var(--font-mono, monospace)" };

function shortDay(iso: string): string {
  // "2026-07-01" → "01/07"
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function shortMonth(iso: string): string {
  // "2026-07-01T..." → "07/26"
  const [y, m] = iso.slice(0, 10).split("-");
  return `${m}/${y?.slice(2)}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-bg-elevated, #16181d)",
  border: `1px solid ${GRID}`,
  borderRadius: 2,
  fontSize: 12,
} as const;

/** Série diária de área (signups, ativos, partidas). */
export function DailyAreaChart({
  data,
  dataKey,
  label,
  color = GOLD,
}: {
  data: DailyPoint[];
  dataKey: string;
  label: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={AXIS} tickFormatter={shortDay} tickLine={false} />
        <YAxis tick={AXIS} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v) => shortDay(String(v))}
          formatter={(value) => [String(value), label]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface RevenuePoint {
  month: string;
  fichas: number;
  assinaturas: number;
}

/** Receita mensal empilhada (fichas + assinaturas) — UMA moeda por gráfico. */
export function RevenueBarChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={AXIS} tickFormatter={shortMonth} tickLine={false} />
        <YAxis tick={AXIS} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v) => shortMonth(String(v))}
          formatter={(value, name) => [`${currency} ${Number(value).toFixed(2)}`, String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: TEXT }} />
        <Bar dataKey="fichas" name="Fichas" stackId="r" fill={PLAY} radius={[0, 0, 0, 0]} />
        <Bar
          dataKey="assinaturas"
          name="Assinaturas"
          stackId="r"
          fill={BRAND}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
